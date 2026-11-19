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
    <div class="page my-appt-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lịch hẹn của tôi</h1>
          <p class="page-subtitle">Huỷ hoặc đổi lịch online phải thực hiện trước hạn ghi trên từng lịch hẹn.</p>
        </div>
        <div class="page-actions">
          <a routerLink="/booking" class="btn btn-primary"><i class="bi bi-plus-lg"></i> Đặt lịch mới</a>
        </div>
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

      <div class="panel">
        <div class="tabs" role="tablist">
          <button type="button" role="tab" class="tab" [class.active]="tab() === 'upcoming'" (click)="tab.set('upcoming')">
            Sắp tới <span class="tab-count mono">{{ upcoming().length }}</span>
          </button>
          <button type="button" role="tab" class="tab" [class.active]="tab() === 'history'" (click)="tab.set('history')">
            Lịch sử <span class="tab-count mono">{{ history().length }}</span>
          </button>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Đang tải lịch hẹn...</p></div>
        } @else if (visibleList().length === 0) {
          <div class="empty-state">
            <h3>{{ tab() === 'upcoming' ? 'Chưa có lịch hẹn sắp tới' : 'Chưa có lịch hẹn nào trong lịch sử' }}</h3>
            @if (tab() === 'upcoming') {
              <p><a routerLink="/booking">Đặt lịch khám</a></p>
            }
          </div>
        } @else {
          <div class="appt-list">
            @for (appt of visibleList(); track appt.id) {
              <article class="appt-card" [ngClass]="'status-' + appt.status.toLowerCase()">
                <div class="appt-date">
                  <span class="appt-day mono">{{ appt.appointmentDate | date:'dd/MM/yyyy' }}</span>
                  <span class="appt-time mono">{{ appt.estimatedStartTime | slice:0:5 }}</span>
                </div>

                <div class="appt-main">
                  <div class="appt-top">
                    <h3 class="appt-doctor">{{ appt.academicTitle ? appt.academicTitle + ' ' : '' }}{{ appt.doctorName }}</h3>
                    <span class="status" [ngClass]="'pill-' + appt.status.toLowerCase()">{{ statusLabel(appt) }}</span>
                    <span class="appt-code mono">{{ appt.appointmentCode }}</span>
                  </div>
                  <div class="appt-meta">
                    <span>{{ appt.specialtyName || 'Đa khoa' }}</span>
                    <span>Phòng {{ appt.roomNumber }}{{ appt.floor ? ', tầng ' + appt.floor : '' }}</span>
                    <span class="mono">Ca {{ appt.shiftStartTime | slice:0:5 }}–{{ appt.shiftEndTime | slice:0:5 }}</span>
                    <span>STT đặt trước: <strong class="mono">{{ appt.bookingNumber }}</strong></span>
                  </div>
                  @if (appt.reasonForVisit) {
                    <p class="appt-reason"><span class="text-muted">Lý do khám:</span> {{ appt.reasonForVisit }}</p>
                  }
                  @if (appt.queueTicketNumber) {
                    <p class="appt-ticket">
                      <span class="text-muted">Số thứ tự hàng đợi:</span> <strong class="mono">{{ appt.queueTicketNumber }}</strong>
                      <a [routerLink]="['/queue/tracking']" [queryParams]="{ ticket: appt.queueTicketNumber }">Theo dõi hàng đợi</a>
                    </p>
                  }
                  @if (appt.status === 'CANCELLED' && appt.cancellationReason) {
                    <p class="appt-cancel-reason">Lý do huỷ: {{ appt.cancellationReason }}</p>
                  }
                </div>

                @if (appt.status === 'PENDING' || appt.status === 'CONFIRMED') {
                  <div class="appt-actions">
                    @if (appt.canModify) {
                      <span class="deadline-hint">Hạn huỷ/đổi: <span class="mono">{{ appt.changeDeadline | date:'HH:mm dd/MM' }}</span></span>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="openReschedule(appt)">Đổi lịch</button>
                      <button type="button" class="btn btn-outline-danger btn-sm" (click)="openCancel(appt)">Huỷ lịch</button>
                    } @else {
                      <span class="deadline-hint">Đã quá hạn huỷ/đổi online. Liên hệ quầy lễ tân để được hỗ trợ.</span>
                    }
                  </div>
                }
              </article>
            }
          </div>
        }
      </div>

      <!-- Modal huỷ lịch -->
      @if (cancelTarget(); as target) {
        <div class="modal-backdrop" (click)="cancelTarget.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Huỷ lịch hẹn {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="cancelTarget.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="modal-text">Huỷ lịch khám với <strong>{{ target.doctorName }}</strong> ngày
                <strong>{{ formatDayTitle(target.appointmentDate) }}</strong>?</p>
              <div class="form-group">
                <label class="form-label" for="cancel-reason">Lý do huỷ (không bắt buộc)</label>
                <textarea id="cancel-reason" class="form-control" rows="2" maxlength="500" [(ngModel)]="cancelReason"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancelTarget.set(null)">Giữ lịch</button>
              <button type="button" class="btn btn-danger" [disabled]="submitting()" (click)="confirmCancel()">
                @if (submitting()) { <span class="spinner-sm"></span> } Huỷ lịch hẹn
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
              <h2 class="modal-title">Đổi lịch {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="rescheduleTarget.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="modal-text text-muted">Ca còn chỗ của {{ target.specialtyName || 'Đa khoa' }} trong 14 ngày tới.
                Sau khi đổi, lịch hẹn cần phòng khám xác nhận lại.</p>
              @if (loadingSlots()) {
                <div class="loading-state"><div class="spinner"></div></div>
              } @else if (rescheduleOptions().length === 0) {
                <div class="empty-state"><p>Không còn ca trống phù hợp.</p></div>
              } @else {
                <div class="option-list" role="radiogroup">
                  @for (s of rescheduleOptions(); track s.id) {
                    <label class="option-item" [class.selected]="newScheduleId === s.id">
                      <input type="radio" name="new-schedule" [value]="s.id" [(ngModel)]="newScheduleId" />
                      <span class="option-date">{{ formatDayTitle(s.workDate) }}</span>
                      <span class="mono">{{ s.startTime | slice:0:5 }}–{{ s.endTime | slice:0:5 }}</span>
                      <span>{{ s.doctorName }}</span>
                      <span class="option-slots mono">Còn {{ s.remainingSlots }} chỗ</span>
                    </label>
                  }
                </div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="rescheduleTarget.set(null)">Hủy</button>
              <button type="button" class="btn btn-primary" [disabled]="!newScheduleId || submitting()" (click)="confirmReschedule()">
                @if (submitting()) { <span class="spinner-sm"></span> } Đổi lịch
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .my-appt-page { max-width: 960px; }

    .tabs { display: flex; gap: 4px; padding: 0 12px; border-bottom: 1px solid var(--border-color); }
    .tab {
      background: none; border: none; padding: 10px 8px; margin-bottom: -1px; font: inherit; font-size: 14px; font-weight: 500;
      color: var(--text-muted); border-bottom: 2px solid transparent; cursor: pointer; display: flex; gap: 6px; align-items: center;
      transition: color .12s ease;
    }
    .tab:hover { color: var(--text-main); }
    .tab.active { color: var(--text-main); border-bottom-color: var(--primary-600); }
    .tab-count { background: var(--bg-subtle); color: var(--text-muted); border-radius: var(--radius-sm); padding: 0 6px; font-size: 12px; }

    .appt-list { display: flex; flex-direction: column; }
    .appt-card {
      display: grid; grid-template-columns: 110px 1fr; gap: 16px;
      padding: 14px 16px; border-bottom: 1px solid var(--border-color);
    }
    .appt-card:last-child { border-bottom: none; }
    .appt-card.status-cancelled .appt-main, .appt-card.status-cancelled .appt-date { opacity: .75; }

    .appt-date { display: flex; flex-direction: column; gap: 2px; padding-top: 1px; }
    .appt-day { font-size: 14px; font-weight: 600; color: var(--text-main); }
    .appt-time { font-size: 13px; color: var(--text-muted); }

    .appt-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 4px; }
    .appt-doctor { font-size: 14px; font-weight: 600; margin: 0; color: var(--text-main); }
    .appt-code { font-size: 12px; color: var(--text-muted); margin-left: auto; }
    .appt-meta { display: flex; flex-wrap: wrap; gap: 2px 16px; color: var(--text-secondary); font-size: 13px; }
    .appt-meta strong { font-weight: 600; }
    .appt-reason, .appt-ticket, .appt-cancel-reason { margin: 6px 0 0; font-size: 13px; color: var(--text-secondary); }
    .appt-ticket a { margin-left: 8px; }
    .appt-cancel-reason { color: var(--danger-text); }

    .appt-actions {
      grid-column: 2 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px;
    }
    .deadline-hint { font-size: 12px; color: var(--text-muted); margin-right: auto; }

    .pill-pending { background: var(--warning-bg); color: var(--warning-text); }
    .pill-confirmed { background: var(--success-bg); color: var(--success-text); }
    .pill-checked_in { background: var(--info-bg); color: var(--info-text); }
    .pill-completed { background: var(--bg-subtle); color: var(--text-secondary); }
    .pill-cancelled { background: var(--bg-subtle); color: var(--text-muted); }

    .loading-state, .empty-state { padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .empty-state h3 { font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 4px; }

    .modal-text { font-size: 14px; margin: 0 0 12px; }
    .modal-wide { max-width: 680px; }
    .option-list { display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; }
    .option-item {
      display: grid; grid-template-columns: auto 1.6fr 1fr 1.4fr auto; gap: 12px; align-items: center;
      border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px 12px; cursor: pointer; font-size: 14px;
      transition: border-color .12s ease, background-color .12s ease;
    }
    .option-item:hover { background: var(--bg-hover); }
    .option-item.selected { border-color: var(--primary-600); background: var(--primary-50); }
    .option-date { font-weight: 500; }
    .option-slots { color: var(--text-muted); font-size: 13px; }

    @media (max-width: 600px) {
      .page { padding: 16px; }
      .appt-card { grid-template-columns: 1fr; gap: 8px; }
      .appt-date { flex-direction: row; gap: 8px; }
      .appt-actions { grid-column: 1 / -1; }
      .option-item { grid-template-columns: auto 1fr; }
      .deadline-hint { width: 100%; }
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
      // Ngày mới nhất (xa nhất) ở trên -> ngày cũ nhất ở dưới
      .sort((a, b) => this.compareByTime(b, a))
  );
  readonly history = computed(() =>
    this.appointments()
      .filter(a => a.status === 'COMPLETED' || a.status === 'CANCELLED')
      // Gần hôm nay nhất (mới nhất) ở trên -> xa nhất (cũ nhất) ở dưới
      .sort((a, b) => this.compareByTime(b, a))
  );

  /** So sánh tăng dần theo ngày khám + giờ dự kiến; cùng giờ thì theo số thứ tự đặt lịch. */
  private compareByTime(a: Appointment, b: Appointment): number {
    return this.timeValue(a) - this.timeValue(b)
      || (a.bookingNumber ?? 0) - (b.bookingNumber ?? 0)
      || a.id - b.id;
  }

  private timeValue(a: Appointment): number {
    const [y, m, d] = (a.appointmentDate ?? '').split('-').map(Number);
    if (!y || !m || !d) return Number.MAX_SAFE_INTEGER; // thiếu ngày -> xếp cuối
    const [hh = 0, mm = 0, ss = 0] = (a.estimatedStartTime ?? a.shiftStartTime ?? '')
      .split(':').map(n => Number(n) || 0);
    return new Date(y, m - 1, d, hh, mm, ss).getTime();
  }
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
