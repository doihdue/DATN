import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ChatReply } from '../../models/chat.model';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ChatWidgetComponent } from './chat-widget.component';

const REPLY: ChatReply = { content: 'Trả lời', isEmergency: false, suggestedSpecialties: [] };

function setup(sendMessage: (message: string) => Observable<ChatReply>) {
  const currentUser = signal<{ username: string } | null>({ username: 'an' });
  TestBed.configureTestingModule({
    imports: [ChatWidgetComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { currentUser } },
      { provide: ChatService, useValue: { sendMessage, resetSession: vi.fn() } }
    ]
  });
  const fixture = TestBed.createComponent(ChatWidgetComponent);
  fixture.detectChanges();
  return { component: fixture.componentInstance, fixture, currentUser };
}

describe('ChatWidgetComponent', () => {
  it('thêm tin nhắn người dùng và câu trả lời, chặn gửi khi đang chờ', () => {
    const reply$ = new Subject<ChatReply>();
    const sendMessage = vi.fn(() => reply$.asObservable());
    const { component } = setup(sendMessage);

    component.send('  đau họng  ');
    component.send('tin nhắn thứ hai');

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith('đau họng');
    expect(component.isSending()).toBe(true);

    reply$.next(REPLY);

    expect(component.isSending()).toBe(false);
    expect(component.messages().map(message => message.sender)).toEqual(['USER', 'AI']);
  });

  it('bỏ qua tin nhắn rỗng', () => {
    const sendMessage = vi.fn(() => new Subject<ChatReply>().asObservable());
    const { component } = setup(sendMessage);

    component.send('   ');

    expect(sendMessage).not.toHaveBeenCalled();
    expect(component.messages()).toEqual([]);
  });

  it('thử lại đúng tin nhắn lỗi mà không thêm tin nhắn trùng', () => {
    const sendMessage = vi.fn((): Observable<ChatReply> => throwError(() => new Error('lỗi')));
    const { component } = setup(sendMessage);

    component.send('đau đầu');
    expect(component.hasError()).toBe(true);

    component.retry();

    expect(sendMessage).toHaveBeenLastCalledWith('đau đầu');
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(component.messages()).toHaveLength(1);
  });

  it('lỗi 400 hiện thông báo của server và không cho thử lại', () => {
    const sendMessage = vi.fn((): Observable<ChatReply> => throwError(() => new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'Cuộc trò chuyện đã quá dài' }
    })));
    const { component } = setup(sendMessage);

    component.send('đau đầu');

    expect(component.errorText()).toBe('Cuộc trò chuyện đã quá dài');
    expect(component.canRetry()).toBe(false);
  });

  it('hiện nhãn chế độ dự phòng khi câu trả lời gần nhất không đến từ AI', () => {
    const replies = [{ ...REPLY, source: 'FALLBACK' as const }, { ...REPLY, source: 'AI' as const }];
    const { component } = setup(() => of(replies.shift()!));

    component.send('đau họng');
    expect(component.isFallbackMode()).toBe(true);

    component.send('3 ngày');
    expect(component.isFallbackMode()).toBe(false);
  });

  it('không gửi khi đang ghép ký tự bằng bộ gõ, có gửi khi nhấn Enter', () => {
    const sendMessage = vi.fn(() => new Subject<ChatReply>().asObservable());
    const { component } = setup(sendMessage);
    component.draft.set('ho');

    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true }));
    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(sendMessage).not.toHaveBeenCalled();

    component.onEnter(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sendMessage).toHaveBeenCalledWith('ho');
  });

  it('xoá cuộc trò chuyện và bỏ câu trả lời đang chờ khi đổi người dùng', () => {
    const reply$ = new Subject<ChatReply>();
    const { component, currentUser } = setup(() => reply$.asObservable());

    component.send('đau họng');
    currentUser.set(null);
    TestBed.tick();
    reply$.next(REPLY);

    expect(component.messages()).toEqual([]);
    expect(component.isSending()).toBe(false);
  });
});
