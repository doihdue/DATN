import {
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { ChatMessage, ChatReply } from '../../models/chat.model';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

const MAX_MESSAGE_LENGTH = 1000;

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (isVisible()) {
      @if (isOpen()) {
        <section
          class="chat-panel"
          role="dialog"
          aria-label="Trợ lý tư vấn sức khỏe"
          (keydown.escape)="close()"
        >
          <header class="chat-header">
            <div class="chat-heading">
              <h2>Trợ lý tư vấn</h2>
              <p>Gợi ý chuyên khoa theo triệu chứng</p>
            </div>
            <button
              type="button"
              class="icon-button"
              title="Cuộc trò chuyện mới"
              aria-label="Bắt đầu cuộc trò chuyện mới"
              [disabled]="messages().length === 0"
              (click)="resetConversation()"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
            </button>
            <button type="button" class="icon-button" title="Đóng" aria-label="Đóng khung chat" (click)="close()">
              <i class="bi bi-x-lg"></i>
            </button>
          </header>

          <div class="chat-notice">
            <span>Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.</span>
            @if (isFallbackMode()) {
              <span class="mock-badge" title="Trợ lý AI tạm thời không khả dụng, đang gợi ý theo từ khóa">Chế độ dự phòng</span>
            }
          </div>

          <div #messageList class="chat-messages" role="log" aria-live="polite" aria-label="Nội dung trò chuyện">
            @if (messages().length === 0) {
              <div class="chat-welcome">
                <h3>Mô tả triệu chứng của bạn</h3>
                <p>Trợ lý sẽ gợi ý chuyên khoa phù hợp để đăng ký khám.</p>
                <div class="suggestions">
                  @for (question of suggestedQuestions; track question) {
                    <button type="button" class="suggestion" (click)="send(question)">{{ question }}</button>
                  }
                </div>
              </div>
            }

            @for (message of messages(); track message.id) {
              @if (message.sender === 'USER') {
                <div class="message-row is-user">
                  <div class="message-group">
                    <div class="bubble bubble-user">{{ message.content }}</div>
                    <time class="message-time">{{ message.createdAt | date: 'HH:mm' }}</time>
                  </div>
                </div>
              } @else {
                <div class="message-row">
                  <div class="message-group">
                    @if (message.isEmergency) {
                      <div class="emergency-card" role="alert">
                        <div class="emergency-title">Cần cấp cứu ngay</div>
                        <p>{{ message.content }}</p>
                        <a href="tel:115" class="emergency-call"><i class="bi bi-telephone-fill" aria-hidden="true"></i> Gọi 115</a>
                      </div>
                    } @else {
                      <div class="bubble bubble-ai">{{ message.content }}</div>
                    }

                    @for (specialty of message.suggestedSpecialties; track specialty.name) {
                      <div class="specialty-card">
                        <div class="specialty-label">Chuyên khoa gợi ý</div>
                        <div class="specialty-name">{{ specialty.name }}</div>
                        <p>{{ specialty.reason }}</p>
                        <a routerLink="/booking" class="specialty-action" (click)="close()">Đặt lịch khám</a>
                      </div>
                    }
                    <time class="message-time">{{ message.createdAt | date: 'HH:mm' }}</time>
                  </div>
                </div>
              }
            }

            @if (isSending()) {
              <div class="message-row">
                <div class="bubble bubble-ai typing" role="status" aria-label="Trợ lý đang trả lời">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }

            @if (hasError()) {
              <div class="chat-error" role="alert">
                <span>{{ errorText() }}</span>
                @if (canRetry()) {
                  <button type="button" (click)="retry()">Thử lại</button>
                } @else {
                  <button type="button" (click)="resetConversation()">Trò chuyện mới</button>
                }
              </div>
            }
          </div>

          <form class="chat-composer" (submit)="$event.preventDefault(); send()">
            <div class="composer-box">
              <textarea
                #composer
                rows="1"
                placeholder="Nhập triệu chứng"
                aria-label="Nội dung tin nhắn"
                [attr.maxlength]="maxLength"
                [value]="draft()"
                (input)="onDraftInput($event)"
                (keydown.enter)="onEnter($event)"
              ></textarea>
              <button type="submit" class="send-button" aria-label="Gửi tin nhắn" [disabled]="!canSend()">
                <i class="bi bi-send-fill"></i>
              </button>
            </div>
            <div class="composer-hint">
              <span>Enter để gửi, Shift + Enter để xuống dòng</span>
              <span class="mono">{{ draft().length }}/{{ maxLength }}</span>
            </div>
          </form>
        </section>
      }

      <button
        #launcher
        type="button"
        class="chat-launcher"
        [class.is-open]="isOpen()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="isOpen() ? 'Đóng khung chat' : 'Mở trợ lý tư vấn'"
        (click)="toggle()"
      >
        <i class="bi" [class.bi-chat-left-text]="!isOpen()" [class.bi-chevron-down]="isOpen()" aria-hidden="true"></i>
        @if (!isOpen()) {
          <span>Trợ lý tư vấn</span>
        }
      </button>
    }
  `,
  styles: [`
    .chat-launcher {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1040;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      min-width: 40px;
      padding: 0 14px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      background: #ffffff;
      color: var(--text-main);
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      box-shadow: var(--shadow-md);
      cursor: pointer;
      transition: background-color 0.12s ease;

      i { font-size: 16px; line-height: 1; color: var(--primary-600); }
      &:hover { background: var(--bg-hover); }
      &.is-open { padding: 0; }
    }

    .chat-panel {
      position: fixed;
      right: 24px;
      bottom: 76px;
      z-index: 1040;
      display: flex;
      flex-direction: column;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: min(600px, calc(100vh - 100px));
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--bg-card);
      box-shadow: var(--shadow-lg);
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 8px 10px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .chat-heading {
      flex: 1;
      min-width: 0;

      h2 { color: var(--text-main); font-size: 15px; font-weight: 600; margin: 0; }
      p { color: var(--text-muted); font-size: 12px; margin: 0; }
    }

    .icon-button {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 30px;
      height: 30px;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;

      &:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-main); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    .chat-notice {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 6px 16px;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-subtle);
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.4;

      span:first-of-type { flex: 1; }
    }

    .mock-badge {
      flex-shrink: 0;
      padding: 0 6px;
      border-radius: var(--radius-sm);
      background: var(--warning-bg);
      color: var(--warning-text);
      font-weight: 500;
      white-space: nowrap;
    }

    .chat-messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      padding: 16px;
      overflow-y: auto;
      background: var(--bg-main);
    }

    .chat-welcome {
      margin: auto 0;

      h3 { font-size: 15px; font-weight: 600; margin: 0; }
      p { margin: 4px 0 12px; color: var(--text-muted); font-size: 13px; }
    }

    .suggestions { display: flex; flex-direction: column; gap: 6px; }

    .suggestion {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      color: var(--text-secondary);
      font-family: inherit;
      font-size: 13px;
      text-align: left;
      cursor: pointer;
      transition: background-color 0.12s ease, border-color 0.12s ease;

      &:hover { border-color: var(--border-strong); background: var(--bg-hover); color: var(--text-main); }
    }

    .message-row {
      display: flex;
      align-items: flex-start;

      &.is-user { justify-content: flex-end; }
      &.is-user .message-group { align-items: flex-end; }
    }

    .message-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
      max-width: 88%;
      min-width: 0;
    }

    .bubble {
      padding: 8px 12px;
      border-radius: var(--radius-lg);
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .bubble-user {
      background: var(--primary-600);
      color: #ffffff;
    }

    .bubble-ai {
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-main);
    }

    .message-time { color: var(--text-light); font-size: 11px; }

    .specialty-card, .emergency-card {
      width: 100%;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      font-size: 13px;

      p { margin: 4px 0 8px; }
    }

    .specialty-card {
      border: 1px solid var(--border-color);
      background: var(--bg-card);

      p { color: var(--text-secondary); }
    }

    .specialty-label { color: var(--text-muted); font-size: 12px; }

    .specialty-name { margin-top: 2px; color: var(--text-main); font-size: 14px; font-weight: 600; }

    .specialty-action, .emergency-call {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 10px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      transition: background-color 0.12s ease;
    }

    .specialty-action {
      border: 1px solid var(--border-strong);
      background: #ffffff;
      color: var(--primary-700);
      &:hover { background: var(--bg-hover); color: var(--primary-700); }
    }

    .emergency-card {
      border: 1px solid var(--danger-border);
      background: var(--danger-bg);
      color: var(--danger-text);
    }

    .emergency-title { font-size: 14px; font-weight: 600; }

    .emergency-call {
      background: var(--danger-solid);
      color: #ffffff;
      &:hover { background: var(--danger-text); color: #ffffff; }
    }

    .typing {
      display: inline-flex;
      gap: 4px;
      padding: 12px;

      span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-light);
        animation: typing-dot 1.2s infinite ease-in-out;
      }
      span:nth-child(2) { animation-delay: 0.2s; }
      span:nth-child(3) { animation-delay: 0.4s; }
    }

    @keyframes typing-dot {
      0%, 60%, 100% { opacity: 0.35; }
      30% { opacity: 1; }
    }

    .chat-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-md);
      background: var(--danger-bg);
      color: var(--danger-text);
      font-size: 13px;

      button {
        border: none;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-weight: 500;
        text-decoration: underline;
        cursor: pointer;
      }
    }

    .chat-composer {
      padding: 10px 12px 8px;
      border-top: 1px solid var(--border-color);
      background: var(--bg-card);
    }

    .composer-box {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      padding: 4px 4px 4px 10px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: var(--bg-card);

      &:focus-within { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15); }
    }

    textarea {
      flex: 1;
      min-width: 0;
      max-height: 110px;
      padding: 5px 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text-main);
      font-family: inherit;
      font-size: 14px;
      line-height: 1.45;
      resize: none;

      &::placeholder { color: var(--text-light); }
    }

    .send-button {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--primary-600);
      color: #ffffff;
      cursor: pointer;
      transition: background-color 0.12s ease;

      &:hover:not(:disabled) { background: var(--primary-700); }
      &:disabled { background: var(--bg-subtle); color: var(--text-light); cursor: not-allowed; }
    }

    .composer-hint {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
      color: var(--text-light);
      font-size: 11px;
    }

    @media (max-width: 576px) {
      .chat-panel {
        inset: 0;
        width: 100%;
        max-width: none;
        height: 100dvh;
        border: none;
        border-radius: 0;
      }

      .chat-launcher {
        right: 16px;
        bottom: 16px;
        &.is-open { display: none; }
      }

      /* Tránh iOS tự phóng to khi focus vào ô nhập */
      textarea { font-size: 16px; }
      .composer-hint span:first-child { visibility: hidden; }
    }

    @media (prefers-reduced-motion: reduce) {
      .typing span { animation: none; }
      .chat-launcher { transition: none; }
    }
  `]
})
export class ChatWidgetComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly messageList = viewChild<ElementRef<HTMLElement>>('messageList');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');

  private readonly currentUrl = signal(this.router.url);
  private readonly routerSubscription: Subscription;
  private requestSubscription?: Subscription;
  private nextMessageId = 1;
  private lastUsername: string | null;
  private failedMessage: string | null = null;

  readonly maxLength = MAX_MESSAGE_LENGTH;
  readonly suggestedQuestions = [
    'Tôi bị đau họng và sốt nhẹ 2 ngày nay',
    'Da tôi nổi mẩn đỏ và ngứa, nên khám khoa nào?',
    'Bé nhà tôi bị sốt và ho thì khám ở đâu?',
    'Tôi bị đau ngực và khó thở'
  ];

  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly hasError = signal(false);
  readonly errorText = signal('Không gửi được tin nhắn.');
  readonly canRetry = signal(true);
  readonly draft = signal('');
  readonly messages = signal<ChatMessage[]>([]);

  // Hiện nhãn "Chế độ dự phòng" khi câu trả lời gần nhất không đến từ Gemini
  readonly isFallbackMode = computed(() => {
    const lastAi = [...this.messages()].reverse().find(message => message.sender === 'AI');
    return lastAi?.source === 'FALLBACK';
  });

  // Bảng gọi số /queue chiếu trên TV sảnh chờ nên không hiển thị widget.
  readonly isVisible = computed(() => this.currentUrl().split(/[?#]/)[0] !== '/queue');
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isSending());

  constructor() {
    this.lastUsername = this.authService.currentUser()?.username ?? null;

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => this.currentUrl.set((event as NavigationEnd).urlAfterRedirects));

    // Nội dung tư vấn là thông tin sức khỏe, không để lộ cho người dùng tiếp theo trên cùng trình duyệt.
    effect(() => {
      const username = this.authService.currentUser()?.username ?? null;
      if (username !== this.lastUsername) {
        this.lastUsername = username;
        untracked(() => this.resetConversation());
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
    this.requestSubscription?.unsubscribe();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.isOpen.set(true);
    this.afterRender(() => {
      this.scrollToBottom();
      this.resizeComposer();
      this.composer()?.nativeElement.focus();
    });
  }

  close(): void {
    this.isOpen.set(false);
    this.afterRender(() => this.launcher()?.nativeElement.focus());
  }

  onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
    this.resizeComposer();
  }

  onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    // Bộ gõ tiếng Việt dùng Enter để chốt ký tự đang ghép, lúc đó không được gửi tin nhắn.
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing) {
      return;
    }
    keyboardEvent.preventDefault();
    this.send();
  }

  send(text: string = this.draft()): void {
    const content = text.trim();
    if (!content || this.isSending()) {
      return;
    }

    this.appendMessage({ sender: 'USER', content });
    this.draft.set('');
    this.afterRender(() => this.resizeComposer());
    this.requestReply(content);
  }

  retry(): void {
    if (this.failedMessage) {
      this.requestReply(this.failedMessage);
    }
  }

  resetConversation(): void {
    this.requestSubscription?.unsubscribe();
    this.isSending.set(false);
    this.hasError.set(false);
    this.failedMessage = null;
    this.chatService.resetSession();
    this.messages.set([]);
    this.draft.set('');
    if (this.isOpen()) {
      this.afterRender(() => {
        this.resizeComposer();
        this.composer()?.nativeElement.focus();
      });
    }
  }

  private requestReply(content: string): void {
    this.isSending.set(true);
    this.hasError.set(false);
    this.failedMessage = null;
    this.scrollAfterRender();

    this.requestSubscription = this.chatService.sendMessage(content).subscribe({
      next: reply => this.handleReply(reply),
      error: (err: HttpErrorResponse) => {
        // 400 = lỗi nghiệp vụ (vd. hội thoại quá dài): thử lại không có ích, gợi ý bắt đầu cuộc mới
        const isBadRequest = err.status === 400;
        this.errorText.set(isBadRequest && err.error?.message ? err.error.message : 'Không gửi được tin nhắn.');
        this.canRetry.set(!isBadRequest);
        this.isSending.set(false);
        this.hasError.set(true);
        this.failedMessage = content;
        this.scrollAfterRender();
      }
    });
  }

  private handleReply(reply: ChatReply): void {
    this.isSending.set(false);
    this.appendMessage({
      sender: 'AI',
      content: reply.content,
      isEmergency: reply.isEmergency,
      suggestedSpecialties: reply.suggestedSpecialties,
      source: reply.source
    });
    this.scrollAfterRender();
  }

  private appendMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): void {
    this.messages.update(list => [...list, { ...message, id: this.nextMessageId++, createdAt: new Date() }]);
  }

  private scrollAfterRender(): void {
    this.afterRender(() => this.scrollToBottom());
  }

  private scrollToBottom(): void {
    const list = this.messageList()?.nativeElement;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }

  private resizeComposer(): void {
    const textarea = this.composer()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  private afterRender(callback: () => void): void {
    afterNextRender(callback, { injector: this.injector });
  }
}
