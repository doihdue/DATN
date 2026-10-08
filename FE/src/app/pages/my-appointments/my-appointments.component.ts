import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment, APPOINTMENT_STATUS_LABELS } from '../../models/appointment.model';
import { WorkSchedule } from '../../models/schedule.model';
import { addDays, formatDayTitle, toIsoDate } from '../../utils/date.utils';

type AppointmentTab = 'upcoming' | 'history';

@Component({
  selector: 'app-my-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="my-appt-page">
      <div class="page-header">
        <div>
          <h1 class="page-title"><i class="bi bi-calendar2-heart"></i> Lịch Hẹn Của Tôi</h1>
          <p class="page-subtitle">Theo dõi, huỷ hoặc đổi lịch khám đã đặt. Huỷ/đổi online phải trước giờ khám dự kiến.</p>
        </div>
        <a routerLink="/booking" class="btn btn-primary"><i class="bi bi-calendar-plus"></i> Đặt lịch mới</a>
      </div>

      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
            <div class="toast-icon">
              <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
            </div>
            <div class="toast-content">
              <div class="toast-title">{{ alertType() === 'success' ? 'Thành công' : 'Thông báo' }}</div>
              <div class="toast-message">{{ alertMessage() }}</div>
            </div>
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">
          Sắp tới <span class="tab-count">{{ upcoming().length }}</span>
        </button>
        <button type="button" role="tab" class="tab" [class.active]="tab() === 'history'" (click)="tab.set('history')">
          Lịch sử <span class="tab-count">{{ history().length }}</span>
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state"><div class="spinner"></div><p>Đang tải lịch hẹn...</p></div>
      } @else if (visibleList().length === 0) {
        <div class="empty-state">
          <i class="bi bi-calendar-x"></i>
          <h3>{{ tab() === 'upcoming' ? 'Bạn chưa có lịch hẹn sắp tới' : 'Chưa có lịch sử lịch hẹn' }}</h3>
          @if (tab() === 'upcoming') {
            <p><a routerLink="/booking">Đặt lịch khám ngay</a> để không phải chờ đợi lâu tại phòng khám.</p>
          }
        </div>
      } @else {
        <div class="appt-list">
          @for (appt of visibleList(); track appt.id) {
            <article class="appt-card" [ngClass]="'status-' + appt.status.toLowerCase()">
              <div class="appt-date">
                <span class="appt-day num">{{ appt.appointmentDate | date:'dd' }}</span>
                <span class="appt-month">Th {{ appt.appointmentDate | date:'MM/yyyy' }}</span>
                <span class="appt-time num">{{ appt.estimatedStartTime | slice:0:5 }}</span>
              </div>

              <div class="appt-main">
                <div class="appt-top">
                  <span class="status-pill" [ngClass]="'pill-' + appt.status.toLowerCase()">{{ statusLabel(appt) }}</span>
                  <span class="appt-code num">{{ appt.appointmentCode }}</span>
                </div>
                <h3 class="appt-doctor">{{ appt.academicTitle ? appt.academicTitle + ' ' : '' }}{{ appt.doctorName }}</h3>
                <div class="appt-meta">
                  <span><i class="bi bi-diagram-3"></i> {{ appt.specialtyName || 'Đa khoa' }}</span>
                  <span><i class="bi bi-door-open"></i> Phòng {{ appt.roomNumber }}{{ appt.floor ? ', tầng ' + appt.floor : '' }}</span>
                  <span><i class="bi bi-clock"></i> Ca {{ appt.shiftStartTime | slice:0:5 }} - {{ appt.shiftEndTime | slice:0:5 }}</span>
                  <span><i class="bi bi-hash"></i> STT đặt trước: <strong>{{ appt.bookingNumber }}</strong></span>
                </div>
                @if (appt.reasonForVisit) {
                  <p class="appt-reason"><i class="bi bi-chat-left-text"></i> {{ appt.reasonForVisit }}</p>
                }
                @if (appt.queueTicketNumber) {
                  <p class="appt-ticket">
                    <i class="bi bi-ticket-perforated"></i> Số thứ tự hàng đợi: <strong class="num">{{ appt.queueTicketNumber }}</strong>
                    <a [routerLink]="['/queue/tracking']" [queryParams]="{ ticket: appt.queueTicketNumber }">Theo dõi hàng đợi</a>
                  </p>
                }
                @if (appt.status === 'CANCELLED' && appt.cancellationReason) {
                  <p class="appt-cancel-reason"><i class="bi bi-x-octagon"></i> {{ appt.cancellationReason }}</p>
                }
              </div>

              @if (appt.status === 'PENDING' || appt.status === 'CONFIRMED') {
                <div class="appt-actions">
                  @if (appt.canModify) {
                    <button type="button" class="btn btn-outline btn-sm" (click)="openReschedule(appt)">
                      <i class="bi bi-arrow-repeat"></i> Đổi lịch
                    </button>
                    <button type="button" class="btn btn-outline-danger btn-sm" (click)="openCancel(appt)">
                      <i class="bi bi-x-circle"></i> Huỷ lịch
                    </button>
                    <span class="deadline-hint">Hạn huỷ/đổi: {{ appt.changeDeadline | date:'HH:mm dd/MM' }}</span>
                  } @else {
                    <span class="deadline-hint">Đã quá hạn huỷ/đổi online. Vui lòng liên hệ quầy lễ tân.</span>
                  }
                </div>
              }
            </article>
          }
        </div>
      }

      <!-- Modal huỷ lịch -->
      @if (cancelTarget(); as target) {
        <div class="modal-backdrop" (click)="cancelTarget.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title"><i class="bi bi-x-circle"></i> Huỷ lịch hẹn {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="cancelTarget.set(null)" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">
              <p>Bạn chắc chắn muốn huỷ lịch khám với <strong>{{ target.doctorName }}</strong> ngày
                <strong>{{ formatDayTitle(target.appointmentDate) }}</strong>?</p>
              <div class="form-group">
                <label class="form-label" for="cancel-reason">Lý do huỷ (không bắt buộc)</label>
                <textarea id="cancel-reason" class="form-control" rows="2" maxlength="500" [(ngModel)]="cancelReason"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="cancelTarget.set(null)">Giữ lịch</button>
              <button type="button" class="btn btn-danger" [disabled]="submitting()" (click)="confirmCancel()">
                @if (submitting()) { <span class="spinner-sm"></span> } Xác nhận huỷ
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal đổi lịch -->
      @if (rescheduleTarget(); as target) {
        <div class="modal-backdrop" (click)="rescheduleTarget.set(null)">
          <div class="modal-dialog modal-wide" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title"><i class="bi bi-arrow-repeat"></i> Đổi lịch {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="rescheduleTarget.set(null)" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">
              <p class="text-muted">Các ca còn chỗ của chuyên khoa <strong>{{ target.specialtyName || 'Đa khoa' }}</strong> trong 14 ngày tới.
                Sau khi đổi, lịch hẹn cần được phòng khám xác nhận lại.</p>
              @if (loadingSlots()) {
                <div class="loading-state"><div class="spinner"></div></div>
              } @else if (rescheduleOptions().length === 0) {
                <div class="empty-state"><i class="bi bi-calendar-x"></i><p>Không còn ca trống phù hợp.</p></div>
              } @else {
                <div class="option-list" role="radiogroup">
                  @for (s of rescheduleOptions(); track s.id) {
                    <label class="option-item" [class.selected]="newScheduleId === s.id">
                      <input type="radio" name="new-schedule" [value]="s.id" [(ngModel)]="newScheduleId" />
                      <span class="option-date">{{ formatDayTitle(s.workDate) }}</span>
                      <span>{{ s.startTime | slice:0:5 }} - {{ s.endTime | slice:0:5 }}</span>
                      <span>{{ s.doctorName }}</span>
                      <span class="option-slots">Còn {{ s.remainingSlots }} chỗ</span>
                    </label>
                  }
                </div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="rescheduleTarget.set(null)">Đóng</button>
              <button type="button" class="btn btn-primary" [disabled]="!newScheduleId || submitting()" (click)="confirmReschedule()">
                @if (submitting()) { <span class="spinner-sm"></span> } Xác nhận đổi lịch
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .my-appt-page { padding: 1.5rem 1rem 3rem; max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .page-title { font-size: 1.6rem; font-weight: 800; margin: 0 0 .3rem; color: var(--text-main); display: flex; gap: .5rem; align-items: center; }
    .page-subtitle { color: var(--text-muted); margin: 0; }

    .tabs { display: flex; gap: .5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1.25rem; }
    .tab {
      background: none; border: none; padding: .7rem 1rem; font-size: 1rem; font-weight: 600; color: var(--text-muted);
      border-bottom: 3px solid transparent; cursor: pointer; display: flex; gap: .4rem; align-items: center;
    }
    .tab.active { color: var(--primary-700); border-bottom-color: var(--primary-600); }
    .tab-count { background: var(--bg-subtle); border-radius: var(--radius-full); padding: 0 .55rem; font-size: .8rem; }

    .appt-list { display: flex; flex-direction: column; gap: 1rem; }
    .appt-card {
      display: grid; grid-template-columns: 96px 1fr; gap: 1.1rem; background: var(--bg-card);
      border: 1px solid var(--border-color); border-left: 4px solid var(--primary-500);
      border-radius: var(--radius-lg); padding: 1.1rem 1.25rem; box-shadow: var(--shadow-card);
    }
    .appt-card.status-pending { border-left-color: var(--warning-solid); }
    .appt-card.status-confirmed { border-left-color: var(--success-solid); }
    .appt-card.status-cancelled { border-left-color: var(--text-light); opacity: .8; }
    .appt-date {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--primary-50); border-radius: var(--radius-md); padding: .6rem .25rem; text-align: center;
    }
    .appt-day { font-size: 1.9rem; font-weight: 800; color: var(--primary-700); line-height: 1; }
    .appt-month { font-size: .8rem; color: var(--text-muted); margin-top: .2rem; }
    .appt-time { margin-top: .4rem; font-weight: 700; color: var(--text-main); }

    .appt-top { display: flex; justify-content: space-between; align-items: center; gap: .5rem; flex-wrap: wrap; }
    .appt-code { font-size: .85rem; color: var(--text-muted); font-weight: 600; }
    .appt-doctor { font-size: 1.1rem; font-weight: 700; margin: .4rem 0; color: var(--text-main); }
    .appt-meta { display: flex; flex-wrap: wrap; gap: .3rem 1.1rem; color: var(--text-secondary); font-size: .9rem; }
    .appt-reason, .appt-ticket, .appt-cancel-reason { margin: .55rem 0 0; font-size: .9rem; color: var(--text-secondary); }
    .appt-ticket a { margin-left: .5rem; }
    .appt-cancel-reason { color: var(--danger-text); }

    .appt-actions { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; border-top: 1px dashed var(--border-color); padding-top: .8rem; }
    .deadline-hint { font-size: .82rem; color: var(--text-muted); margin-left: auto; }

    .status-pill { font-size: .78rem; font-weight: 700; padding: .2rem .65rem; border-radius: var(--radius-full); border: 1px solid; }
    .pill-pending { background: var(--warning-bg); color: var(--warning-text); border-color: var(--warning-border); }
    .pill-confirmed { background: var(--success-bg); color: var(--success-text); border-color: var(--success-border); }
    .pill-checked_in { background: var(--info-bg); color: var(--info-text); border-color: var(--info-border); }
    .pill-completed { background: var(--teal-50); color: var(--teal-700); border-color: var(--teal-100); }
    .pill-cancelled { background: var(--bg-subtle); color: var(--text-muted); border-color: var(--border-color); }

    .modal-wide { max-width: 680px; }
    .text-muted { color: var(--text-muted); }
    .option-list { display: flex; flex-direction: column; gap: .5rem; max-height: 360px; overflow-y: auto; }
    .option-item {
      display: grid; grid-template-columns: auto 1.6fr 1fr 1.4fr auto; gap: .75rem; align-items: center;
      border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: .65rem .8rem; cursor: pointer; font-size: .92rem;
    }
    .option-item.selected { border-color: var(--primary-500); background: var(--primary-50); }
    .option-date { font-weight: 600; }
    .option-slots { color: var(--success-text); font-weight: 600; font-size: .85rem; }

    @media (max-width: 600px) {
      .appt-card { grid-template-columns: 1fr; }
      .appt-date { flex-direction: row; gap: .6rem; justify-content: flex-start; padding: .5rem .8rem; }
      .appt-time { margin-top: 0; margin-left: auto; }
      .option-item { grid-template-columns: auto 1fr; }
      .deadline-hint { margin-left: 0; width: 100%; }
    }
  `]
})
export class MyAppointmentsComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);

  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly tab = signal<AppointmentTab>('upcoming');

  readonly cancelTarget = signal<Appointment | null>(null);
  cancelReason = '';

  readonly rescheduleTarget = signal<Appointment | null>(null);
  readonly rescheduleOptions = signal<WorkSchedule[]>([]);
  readonly loadingSlots = signal(false);
  newScheduleId: number | null = null;

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  readonly upcoming = computed(() =>
    this.appointments()
      .filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'CHECKED_IN')
      .sort((a, b) => (a.appointmentDate + a.estimatedStartTime).localeCompare(b.appointmentDate + b.estimatedStartTime))
  );
  readonly history = computed(() =>
    this.appointments().filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED')
  );
  readonly visibleList = computed(() => this.tab() === 'upcoming' ? this.upcoming() : this.history());

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.appointmentService.getMyAppointments().subscribe({
      next: res => {
        this.appointments.set(res.data ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.showAlert(err.error?.message || 'Không tải được lịch hẹn', 'danger');
      }
    });
  }

  statusLabel(appt: Appointment): string {
    return APPOINTMENT_STATUS_LABELS[appt.status] ?? appt.status;
  }

  formatDayTitle(isoDate: string): string {
    return formatDayTitle(isoDate);
  }

  openCancel(appt: Appointment): void {
    this.cancelReason = '';
    this.cancelTarget.set(appt);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target) return;
    this.submitting.set(true);
    this.appointmentService.cancelAppointment(target.id, this.cancelReason.trim() || undefined).subscribe({
      next: res => {
        this.submitting.set(false);
        this.cancelTarget.set(null);
        this.replaceAppointment(res.data);
        this.showAlert('Đã huỷ lịch hẹn ' + res.data.appointmentCode, 'success');
      },
      error: err => {
        this.submitting.set(false);
        this.showAlert(err.error?.message || 'Huỷ lịch thất bại', 'danger');
      }
    });
  }

  openReschedule(appt: Appointment): void {
    this.newScheduleId = null;
    this.rescheduleOptions.set([]);
    this.rescheduleTarget.set(appt);
    this.loadingSlots.set(true);

    const today = new Date();
    this.appointmentService.getAvailableSchedules({
      startDate: toIsoDate(today),
      endDate: toIsoDate(addDays(today, 14)),
      specialtyId: appt.specialtyId ?? null
    }).subscribe({
      next: res => {
        this.rescheduleOptions.set((res.data ?? []).filter(s => s.id !== appt.workScheduleId));
        this.loadingSlots.set(false);
      },
      error: () => this.loadingSlots.set(false)
    });
  }

  confirmReschedule(): void {
    const target = this.rescheduleTarget();
    if (!target || !this.newScheduleId) return;
    this.submitting.set(true);
    this.appointmentService.rescheduleAppointment(target.id, this.newScheduleId).subscribe({
      next: res => {
        this.submitting.set(false);
        this.rescheduleTarget.set(null);
        this.replaceAppointment(res.data);
        this.showAlert('Đã đổi lịch, vui lòng chờ phòng khám xác nhận lại', 'success');
      },
      error: err => {
        this.submitting.set(false);
        this.showAlert(err.error?.message || 'Đổi lịch thất bại', 'danger');
      }
    });
  }

  private replaceAppointment(updated: Appointment): void {
    this.appointments.update(list => list.map(a => a.id === updated.id ? updated : a));
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertType.set(type);
    this.alertMessage.set(message);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
