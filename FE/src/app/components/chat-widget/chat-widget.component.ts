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
import { DatePipe, SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { Appointment } from '../../models/appointment.model';
import { ChatHistoryMessage, ChatMessage, ChatReply } from '../../models/chat.model';
import { WorkSchedule } from '../../models/schedule.model';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

const MAX_MESSAGE_LENGTH = 1000;

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [DatePipe, SlicePipe, RouterLink],
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
            <span class="chat-avatar" aria-hidden="true"><i class="bi bi-heart-pulse-fill"></i></span>
            <div class="chat-heading">
              <h2>Trợ lý tư vấn AI</h2>
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
            <i class="bi bi-info-circle" aria-hidden="true"></i>
            <span>Thông tin chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.</span>
            @if (isFallbackMode()) {
              <span class="mock-badge" title="Trợ lý AI tạm thời không khả dụng, đang gợi ý theo từ khóa">Chế độ dự phòng</span>
            }
          </div>

          <div #messageList class="chat-messages" role="log" aria-live="polite" aria-label="Nội dung trò chuyện">
            @if (isLoadingHistory()) {
              <div class="history-loading" role="status">
                <span class="spinner" aria-hidden="true"></span> Đang tải lại cuộc trò chuyện...
              </div>
            } @else if (messages().length === 0) {
              <div class="chat-welcome">
                <span class="welcome-icon" aria-hidden="true"><i class="bi bi-chat-heart"></i></span>
                <h3>Xin chào, bạn đang gặp vấn đề gì?</h3>
                <p>Hãy mô tả triệu chứng, tôi sẽ gợi ý chuyên khoa nên đăng ký khám.</p>
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
                  <span class="message-avatar" aria-hidden="true"><i class="bi bi-heart-pulse-fill"></i></span>
                  <div class="message-group">
                    @if (message.isEmergency) {
                      <div class="emergency-card" role="alert">
                        <div class="emergency-title">
                          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> Cần cấp cứu ngay
                        </div>
                        <p>{{ message.content }}</p>
                        <a href="tel:115" class="emergency-call"><i class="bi bi-telephone-fill" aria-hidden="true"></i> Gọi 115</a>
                      </div>
                    } @else if (message.appointment; as appt) {
                      <div class="booked-card" role="status">
                        <div class="booked-title">
                          <i class="bi bi-calendar-check-fill" aria-hidden="true"></i> Đặt lịch thành công
                        </div>
                        <dl>
                          <dt>Mã lịch hẹn</dt><dd><strong>{{ appt.appointmentCode }}</strong></dd>
                          <dt>Chuyên khoa</dt><dd>{{ appt.specialtyName }}</dd>
                          <dt>Bác sĩ</dt><dd>{{ appt.academicTitle ? appt.academicTitle + ' ' : '' }}{{ appt.doctorName }}</dd>
                          <dt>Ngày khám</dt><dd>{{ formatDay(appt.appointmentDate) }}</dd>
                          <dt>Số thứ tự</dt><dd>{{ appt.bookingNumber }}</dd>
                          <dt>Giờ dự kiến</dt><dd>{{ appt.estimatedStartTime | slice: 0 : 5 }}</dd>
                          @if (appt.roomNumber) {
                            <dt>Phòng</dt><dd>{{ appt.roomNumber }}{{ appt.floor != null ? ' · Tầng ' + appt.floor : '' }}</dd>
                          }
                        </dl>
                        <p>{{ message.content }}</p>
                        <a routerLink="/my-appointments" class="specialty-action" (click)="close()">
                          <i class="bi bi-list-check" aria-hidden="true"></i> Xem lịch hẹn của tôi
                        </a>
                      </div>
                    } @else {
                      <div class="bubble bubble-ai">{{ message.content }}</div>
                    }

                    @for (specialty of message.suggestedSpecialties; track specialty.name) {
                      <div class="specialty-card">
                        <div class="specialty-label">Chuyên khoa gợi ý</div>
                        <div class="specialty-name"><i class="bi bi-hospital" aria-hidden="true"></i> {{ specialty.name }}</div>
                        <p>{{ specialty.reason }}</p>
                        <button type="button" class="specialty-action" [disabled]="isSending()" (click)="askSchedules(specialty.name)">
                          <i class="bi bi-calendar-plus" aria-hidden="true"></i> Xem lịch khám
                        </button>
                      </div>
                    }

                    @if (message.staleBookingSpecialty; as specialtyName) {
                      <div class="stale-schedules">
                        <span>Danh sách ca khám có thể đã thay đổi.</span>
                        <button type="button" class="specialty-action" [disabled]="isSending()" (click)="askSchedules(specialtyName)">
                          <i class="bi bi-arrow-repeat" aria-hidden="true"></i> Xem lại lịch còn trống
                        </button>
                      </div>
                    }

                    @if (message.availableSchedules?.length) {
                      <div class="schedule-list" role="list" aria-label="Các ca khám còn chỗ">
                        @for (schedule of message.availableSchedules; track schedule.id) {
                          <div class="schedule-card" role="listitem" [class.is-selected]="isSelected(message.id, schedule.id)">
                            <div class="schedule-main">
                              <div class="schedule-date">{{ formatDay(schedule.workDate) }}</div>
                              <div class="schedule-time">
                                <i class="bi bi-clock" aria-hidden="true"></i>
                                {{ schedule.startTime | slice: 0 : 5 }} – {{ schedule.endTime | slice: 0 : 5 }}
                              </div>
                              <div class="schedule-doctor">
                                <i class="bi bi-person-badge" aria-hidden="true"></i>
                                {{ schedule.academicTitle ? schedule.academicTitle + ' ' : '' }}{{ schedule.doctorName }}
                              </div>
                              <div class="schedule-meta">
                                @if (schedule.roomNumber) {
                                  Phòng {{ schedule.roomNumber }}{{ schedule.floor != null ? ' · Tầng ' + schedule.floor : '' }} ·
                                }
                                Còn {{ schedule.remainingSlots }} chỗ
                              </div>
                            </div>
                            @if (bookedScheduleIds().has(schedule.id)) {
                              <span class="schedule-booked"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Đã đặt</span>
                            } @else if (isPatient()) {
                              <button
                                type="button"
                                class="schedule-action"
                                [disabled]="isBooking() || isSelected(message.id, schedule.id)"
                                (click)="selectSchedule(message.id, schedule)"
                              >Chọn</button>
                            }
                          </div>

                          @if (isSelected(message.id, schedule.id)) {
                            <div class="booking-confirm">
                              <div class="confirm-title">Xác nhận đặt lịch</div>
                              <p>
                                {{ schedule.specialtyName }} · {{ formatDay(schedule.workDate) }} ·
                                {{ schedule.startTime | slice: 0 : 5 }} – {{ schedule.endTime | slice: 0 : 5 }}
                              </p>
                              <textarea
                                rows="2"
                                maxlength="500"
                                placeholder="Lý do khám / triệu chứng (không bắt buộc)"
                                aria-label="Lý do khám"
                                [value]="bookingReason()"
                                (input)="onReasonInput($event)"
                              ></textarea>
                              @if (bookingError()) {
                                <div class="confirm-error" role="alert">
                                  <i class="bi bi-exclamation-circle" aria-hidden="true"></i> {{ bookingError() }}
                                </div>
                              }
                              <div class="confirm-actions">
                                <button type="button" class="btn-ghost" [disabled]="isBooking()" (click)="cancelSelection()">Huỷ</button>
                                <button type="button" class="btn-primary" [disabled]="isBooking()" (click)="confirmBooking()">
                                  {{ isBooking() ? 'Đang đặt...' : 'Xác nhận đặt lịch' }}
                                </button>
                              </div>
                            </div>
                          }
                        }
                      </div>

                      @if (!isLoggedIn()) {
                        <a routerLink="/login" [queryParams]="{ returnUrl: currentPath() }" class="login-hint" (click)="close()">
                          <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i> Đăng nhập tài khoản bệnh nhân để đặt lịch
                        </a>
                      } @else if (!isPatient()) {
                        <p class="role-hint">Chỉ tài khoản bệnh nhân mới đặt lịch khám được.</p>
                      }
                    }
                    <time class="message-time">{{ message.createdAt | date: 'HH:mm' }}</time>
                  </div>
                </div>
              }
            }

            @if (isSending()) {
              <div class="message-row">
                <span class="message-avatar" aria-hidden="true"><i class="bi bi-heart-pulse-fill"></i></span>
                <div class="bubble bubble-ai typing" role="status" aria-label="Trợ lý đang trả lời">
                  <span></span><span></span><span></span>
                </div>
              </div>
            }

            @if (hasError()) {
              <div class="chat-error" role="alert">
                <span><i class="bi bi-exclamation-circle" aria-hidden="true"></i> {{ errorText() }}</span>
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
                placeholder="Nhập triệu chứng của bạn..."
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
              <span>{{ draft().length }}/{{ maxLength }}</span>
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
        <i class="bi" [class.bi-chat-dots-fill]="!isOpen()" [class.bi-chevron-down]="isOpen()" aria-hidden="true"></i>
        @if (!isOpen()) {
          <span>Tư vấn AI</span>
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
      gap: 0.5rem;
      min-height: 56px;
      min-width: 56px;
      padding: 0 1.25rem;
      border: none;
      border-radius: var(--radius-full);
      background: var(--primary-700);
      color: #ffffff;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 700;
      box-shadow: 0 10px 24px -6px rgba(3, 105, 161, 0.55);
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;

      i { font-size: 1.25rem; line-height: 1; }
      &:hover { background: var(--primary-800); transform: translateY(-2px); }
      &.is-open { padding: 0; }
    }

    .chat-panel {
      position: fixed;
      right: 24px;
      bottom: 92px;
      z-index: 1040;
      display: flex;
      flex-direction: column;
      width: 400px;
      max-width: calc(100vw - 32px);
      height: min(640px, calc(100vh - 116px));
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      background: var(--bg-card);
      box-shadow: 0 24px 48px -12px rgba(15, 23, 42, 0.28);
      animation: panel-in 0.18s ease-out;
    }

    @keyframes panel-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .chat-header {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.85rem 0.75rem 0.85rem 1rem;
      background: var(--primary-800);
      color: #ffffff;
    }

    .chat-avatar {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: var(--radius-full);
      background: rgba(255, 255, 255, 0.16);
      font-size: 1.1rem;
    }

    .chat-heading {
      flex: 1;
      min-width: 0;

      h2 { color: #ffffff; font-size: 1rem; font-weight: 700; }
      p { color: var(--primary-100); font-size: 0.75rem; }
    }

    .icon-button {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 34px;
      height: 34px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: #ffffff;
      cursor: pointer;

      &:hover:not(:disabled) { background: rgba(255, 255, 255, 0.16); }
      &:disabled { opacity: 0.45; cursor: not-allowed; }
    }

    .chat-notice {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid var(--warning-border);
      background: var(--warning-bg);
      color: var(--warning-text);
      font-size: 0.72rem;
      line-height: 1.4;

      i { margin-top: 1px; }
      span:first-of-type { flex: 1; }
    }

    .mock-badge {
      flex-shrink: 0;
      padding: 0.05rem 0.4rem;
      border: 1px solid var(--warning-text);
      border-radius: var(--radius-xs);
      font-weight: 700;
      white-space: nowrap;
    }

    .chat-messages {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.85rem;
      min-height: 0;
      padding: 1rem;
      overflow-y: auto;
      background: var(--bg-main);
    }

    .chat-welcome {
      margin: auto 0;
      text-align: center;

      h3 { font-size: 1.05rem; }
      p { margin: 0.3rem 0 1rem; color: var(--text-muted); font-size: 0.85rem; }
    }

    .welcome-icon {
      display: inline-grid;
      place-items: center;
      width: 52px;
      height: 52px;
      margin-bottom: 0.65rem;
      border-radius: var(--radius-full);
      background: var(--primary-100);
      color: var(--primary-700);
      font-size: 1.5rem;
    }

    .suggestions { display: flex; flex-direction: column; gap: 0.5rem; }

    .suggestion {
      padding: 0.6rem 0.8rem;
      border: 1px solid var(--primary-200);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      color: var(--primary-800);
      font-family: inherit;
      font-size: 0.83rem;
      font-weight: 600;
      text-align: left;
      cursor: pointer;

      &:hover { border-color: var(--primary-500); background: var(--primary-50); }
    }

    .message-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;

      &.is-user { justify-content: flex-end; }
      &.is-user .message-group { align-items: flex-end; }
    }

    .message-avatar {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-full);
      background: var(--primary-100);
      color: var(--primary-700);
      font-size: 0.8rem;
    }

    .message-group {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      max-width: 84%;
      min-width: 0;
    }

    .bubble {
      padding: 0.6rem 0.85rem;
      font-size: 0.88rem;
      line-height: 1.5;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .bubble-user {
      border-radius: var(--radius-lg) var(--radius-lg) var(--radius-xs) var(--radius-lg);
      background: var(--primary-700);
      color: #ffffff;
    }

    .bubble-ai {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xs) var(--radius-lg) var(--radius-lg) var(--radius-lg);
      background: var(--bg-card);
      color: var(--text-main);
    }

    .message-time { color: var(--text-muted); font-size: 0.68rem; }

    .specialty-card, .emergency-card {
      width: 100%;
      padding: 0.75rem 0.85rem;
      border-radius: var(--radius-md);
      font-size: 0.82rem;

      p { margin: 0.25rem 0 0.6rem; }
    }

    .specialty-card {
      border: 1px solid var(--primary-200);
      background: var(--primary-50);

      p { color: var(--text-secondary); }
    }

    .specialty-label {
      color: var(--text-muted);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .specialty-name { margin-top: 0.15rem; color: var(--primary-900); font-size: 0.92rem; font-weight: 700; }

    .specialty-action, .emergency-call {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      color: #ffffff;
      font-weight: 700;
    }

    .specialty-action {
      background: var(--primary-700);
      &:hover { background: var(--primary-800); color: #ffffff; }
    }

    .emergency-card {
      border: 1px solid var(--danger-border);
      border-left: 4px solid var(--danger-solid);
      background: var(--danger-bg);
      color: var(--danger-text);
    }

    .emergency-title { font-size: 0.92rem; font-weight: 800; }

    .emergency-call {
      background: var(--danger-solid);
      &:hover { background: var(--danger-text); color: #ffffff; }
    }

    button.specialty-action {
      border: none;
      font-family: inherit;
      font-size: inherit;
      cursor: pointer;
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .schedule-list { display: flex; flex-direction: column; gap: 0.45rem; width: 100%; }

    .schedule-card {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 0.7rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-card);
      font-size: 0.8rem;

      &.is-selected { border-color: var(--primary-500); box-shadow: 0 0 0 2px var(--primary-100); }
    }

    .schedule-main { flex: 1; min-width: 0; }
    .schedule-date { color: var(--primary-900); font-weight: 700; }
    .schedule-time, .schedule-doctor { color: var(--text-main); }
    .schedule-time i, .schedule-doctor i { color: var(--text-muted); }
    .schedule-meta { color: var(--text-muted); font-size: 0.72rem; }

    .schedule-action, .btn-primary, .btn-ghost {
      flex-shrink: 0;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .schedule-action, .btn-primary {
      border: none;
      background: var(--primary-700);
      color: #ffffff;
      &:hover:not(:disabled) { background: var(--primary-800); }
    }

    .btn-ghost {
      border: 1px solid var(--border-color);
      background: var(--bg-card);
      color: var(--text-secondary);
      &:hover:not(:disabled) { background: var(--bg-subtle); }
    }

    .schedule-booked { flex-shrink: 0; color: var(--success-text, #15803d); font-weight: 700; }

    .booking-confirm {
      padding: 0.7rem 0.8rem;
      border: 1px solid var(--primary-200);
      border-radius: var(--radius-md);
      background: var(--primary-50);
      font-size: 0.8rem;

      p { margin: 0.2rem 0 0.5rem; color: var(--text-secondary); }
      textarea {
        width: 100%;
        max-height: none;
        padding: 0.4rem 0.55rem;
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        background: var(--bg-card);
        font-size: 0.8rem;
      }
    }

    .confirm-title { color: var(--primary-900); font-weight: 800; }
    .confirm-error { margin-top: 0.4rem; color: var(--danger-text); }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 0.4rem; margin-top: 0.5rem; }

    .login-hint {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--primary-700);
      font-size: 0.8rem;
      font-weight: 700;
    }

    .role-hint { color: var(--text-muted); font-size: 0.75rem; }

    .stale-schedules {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
      color: var(--text-muted);
      font-size: 0.78rem;
    }

    .history-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin: auto 0;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--primary-100);
      border-top-color: var(--primary-700);
      border-radius: var(--radius-full);
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .booked-card {
      width: 100%;
      padding: 0.75rem 0.85rem;
      border: 1px solid var(--success-border, #86efac);
      border-left: 4px solid var(--success-solid, #16a34a);
      border-radius: var(--radius-md);
      background: var(--success-bg, #f0fdf4);
      font-size: 0.82rem;

      dl {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.15rem 0.6rem;
        margin: 0.45rem 0;
      }
      dt { color: var(--text-muted); font-weight: 600; }
      dd { margin: 0; color: var(--text-main); }
      p { margin: 0 0 0.6rem; color: var(--text-secondary); }
    }

    .booked-title { color: var(--success-text, #15803d); font-size: 0.92rem; font-weight: 800; }

    .typing {
      display: inline-flex;
      gap: 0.3rem;
      padding: 0.8rem 0.9rem;

      span {
        width: 7px;
        height: 7px;
        border-radius: var(--radius-full);
        background: var(--text-light);
        animation: typing-dot 1.1s infinite ease-in-out;
      }
      span:nth-child(2) { animation-delay: 0.15s; }
      span:nth-child(3) { animation-delay: 0.3s; }
    }

    @keyframes typing-dot {
      0%, 60%, 100% { opacity: 0.4; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-4px); }
    }

    .chat-error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--danger-border);
      border-radius: var(--radius-sm);
      background: var(--danger-bg);
      color: var(--danger-text);
      font-size: 0.8rem;

      button {
        border: none;
        background: transparent;
        color: inherit;
        font-family: inherit;
        font-weight: 700;
        text-decoration: underline;
        cursor: pointer;
      }
    }

    .chat-composer {
      padding: 0.65rem 0.85rem 0.5rem;
      border-top: 1px solid var(--border-color);
      background: var(--bg-card);
    }

    .composer-box {
      display: flex;
      align-items: flex-end;
      gap: 0.4rem;
      padding: 0.3rem 0.3rem 0.3rem 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--bg-card);

      &:focus-within { border-color: var(--border-focus); box-shadow: 0 0 0 3px var(--primary-100); }
    }

    textarea {
      flex: 1;
      min-width: 0;
      max-height: 110px;
      padding: 0.4rem 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.88rem;
      line-height: 1.45;
      resize: none;

      &::placeholder { color: var(--text-muted); }
    }

    .send-button {
      display: grid;
      flex-shrink: 0;
      place-items: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: var(--radius-md);
      background: var(--primary-700);
      color: #ffffff;
      cursor: pointer;

      &:hover:not(:disabled) { background: var(--primary-800); }
      &:disabled { background: var(--bg-subtle); color: var(--text-light); cursor: not-allowed; }
    }

    .composer-hint {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      margin-top: 0.3rem;
      color: var(--text-muted);
      font-size: 0.68rem;
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
      .chat-panel, .typing span, .spinner { animation: none; }
      .chat-launcher { transition: none; }
    }
  `]
})
export class ChatWidgetComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  private readonly messageList = viewChild<ElementRef<HTMLElement>>('messageList');
  private readonly composer = viewChild<ElementRef<HTMLTextAreaElement>>('composer');
  private readonly launcher = viewChild<ElementRef<HTMLButtonElement>>('launcher');

  private readonly currentUrl = signal(this.router.url);
  private readonly routerSubscription: Subscription;
  private requestSubscription?: Subscription;
  private bookingSubscription?: Subscription;
  private historySubscription?: Subscription;
  // Chỉ tải lịch sử một lần, ở lần mở khung chat đầu tiên sau khi tải trang
  private historyRequested = false;
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
  readonly isLoadingHistory = signal(false);

  // ===== Đặt lịch ngay trong khung chat =====
  readonly isLoggedIn = this.authService.isAuthenticated;
  readonly isPatient = computed(() => this.authService.isAuthenticated() && this.authService.hasRole('PATIENT'));
  readonly selected = signal<{ messageId: number; schedule: WorkSchedule } | null>(null);
  readonly bookingReason = signal('');
  readonly isBooking = signal(false);
  readonly bookingError = signal<string | null>(null);
  readonly bookedScheduleIds = signal<ReadonlySet<number>>(new Set());
  readonly currentPath = computed(() => this.currentUrl().split(/[?#]/)[0] || '/');

  // Hiện nhãn "Chế độ dự phòng" khi câu trả lời gần nhất không đến từ Gemini
  readonly isFallbackMode = computed(() => {
    const lastAi = [...this.messages()].reverse().find(message => message.sender === 'AI');
    return lastAi?.source === 'FALLBACK';
  });

  // Bảng gọi số /queue chiếu trên TV sảnh chờ nên không hiển thị widget.
  readonly isVisible = computed(() => this.currentUrl().split(/[?#]/)[0] !== '/queue');
  readonly canSend = computed(() => this.draft().trim().length > 0 && !this.isSending() && !this.isLoadingHistory());

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
    this.bookingSubscription?.unsubscribe();
    this.historySubscription?.unsubscribe();
  }

  /** Nút "Xem lịch khám" trên thẻ gợi ý chuyên khoa: hỏi trợ lý lịch còn trống của khoa đó. */
  askSchedules(specialtyName: string): void {
    this.send(`Tôi muốn đặt lịch khám ${specialtyName}`);
  }

  isSelected(messageId: number, scheduleId: number): boolean {
    const current = this.selected();
    return current !== null && current.messageId === messageId && current.schedule.id === scheduleId;
  }

  selectSchedule(messageId: number, schedule: WorkSchedule): void {
    if (this.isBooking()) {
      return;
    }
    this.selected.set({ messageId, schedule });
    this.bookingError.set(null);
    this.scrollAfterRender();
  }

  cancelSelection(): void {
    this.selected.set(null);
    this.bookingError.set(null);
    this.bookingReason.set('');
  }

  onReasonInput(event: Event): void {
    this.bookingReason.set((event.target as HTMLTextAreaElement).value);
  }

  confirmBooking(): void {
    const current = this.selected();
    if (!current || this.isBooking()) {
      return;
    }
    this.isBooking.set(true);
    this.bookingError.set(null);

    const reason = this.bookingReason().trim();
    this.bookingSubscription = this.appointmentService
      .bookAppointment({ workScheduleId: current.schedule.id, reasonForVisit: reason || undefined })
      .subscribe({
        next: res => this.handleBooked(current.schedule, res.data),
        error: (err: HttpErrorResponse) => {
          this.isBooking.set(false);
          // Lỗi nghiệp vụ từ server (trùng lịch, ca đã kín, quá hạn...) hiển thị nguyên văn cho bệnh nhân
          this.bookingError.set(err.error?.message || 'Không đặt được lịch, vui lòng thử lại.');
        }
      });
  }

  formatDay(date: string | null | undefined): string {
    if (!date) {
      return '';
    }
    const [year, month, day] = date.split('-').map(Number);
    const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
    return `${weekday}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  private handleBooked(schedule: WorkSchedule, appointment: Appointment): void {
    this.isBooking.set(false);
    this.selected.set(null);
    this.bookingReason.set('');
    this.bookedScheduleIds.update(ids => new Set(ids).add(schedule.id));
    // Cập nhật số chỗ còn lại của ca vừa đặt ở mọi tin nhắn đang hiển thị ca đó
    this.messages.update(list => list.map(message => ({
      ...message,
      availableSchedules: message.availableSchedules?.map(s =>
        s.id === schedule.id ? { ...s, remainingSlots: Math.max(0, s.remainingSlots - 1) } : s)
    })));
    this.appendMessage({
      sender: 'AI',
      content: 'Lịch hẹn đang chờ phòng khám xác nhận. Bạn nhớ đến trước giờ dự kiến khoảng 15 phút để làm thủ tục nhé.',
      appointment
    });
    this.scrollAfterRender();
  }

  toggle(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.isOpen.set(true);
    this.restoreHistory();
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
    if (!content || this.isSending() || this.isLoadingHistory()) {
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
    this.historySubscription?.unsubscribe();
    this.isLoadingHistory.set(false);
    this.historyRequested = true; // Cuộc trò chuyện mới: không còn gì để tải lại
    this.requestSubscription?.unsubscribe();
    this.isSending.set(false);
    this.hasError.set(false);
    this.failedMessage = null;
    this.bookingSubscription?.unsubscribe();
    this.isBooking.set(false);
    this.cancelSelection();
    this.bookedScheduleIds.set(new Set());
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

  /** Sau khi tải lại trang: hiện lại cuộc trò chuyện của phiên đang lưu (nếu có). */
  private restoreHistory(): void {
    if (this.historyRequested) {
      return;
    }
    this.historyRequested = true;
    if (!this.chatService.hasSession() || this.messages().length > 0) {
      return;
    }

    this.isLoadingHistory.set(true);
    this.historySubscription = this.chatService.loadHistory().subscribe({
      next: history => {
        this.isLoadingHistory.set(false);
        this.messages.set(history.map(message => this.fromHistory(message)));
        this.scrollAfterRender();
      },
      error: (err: HttpErrorResponse) => {
        this.isLoadingHistory.set(false);
        // Phiên không còn hoặc không thuộc người dùng hiện tại: bỏ mã phiên, bắt đầu cuộc trò chuyện mới
        if (err.status === 404 || err.status === 401 || err.status === 403) {
          this.chatService.resetSession();
        }
      }
    });
  }

  private fromHistory(message: ChatHistoryMessage): ChatMessage {
    return {
      id: this.nextMessageId++,
      sender: message.sender,
      content: message.content,
      createdAt: new Date(message.createdAt),
      isEmergency: message.isEmergency,
      suggestedSpecialties: message.suggestedSpecialties,
      source: message.source ?? undefined,
      staleBookingSpecialty: message.bookingSpecialty ?? undefined
    };
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
      source: reply.source,
      availableSchedules: reply.availableSchedules ?? []
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
