import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment, AppointmentStatus, APPOINTMENT_STATUS_LABELS } from '../../models/appointment.model';
import { QueueTicket } from '../../models/queue.model';
import { toIsoDate } from '../../utils/date.utils';

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="appt-mgmt-page">
      <div class="page-header">
        <h1 class="page-title"><i class="bi bi-journal-check"></i> Quản Lý Lịch Hẹn Online</h1>
        <p class="page-subtitle">Xác nhận lịch hẹn, check-in bệnh nhân đến khám để cấp số thứ tự, hoặc huỷ lịch theo yêu cầu.</p>
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

      <div class="filters-card">
        <div class="form-group">
          <label class="form-label" for="f-date">Ngày khám</label>
          <input id="f-date" type="date" class="form-control" [(ngModel)]="filterDate" (change)="loadAppointments()" />
        </div>
        <div class="form-group">
          <label class="form-label" for="f-status">Trạng thái</label>
          <select id="f-status" class="form-control" [(ngModel)]="filterStatus" (change)="loadAppointments()">
            <option value="">-- Tất cả --</option>
            @for (s of statusOptions; track s) {
              <option [value]="s">{{ statusLabels[s] }}</option>
            }
          </select>
        </div>
        <div class="form-group grow">
          <label class="form-label" for="f-keyword">Tìm kiếm</label>
          <input id="f-keyword" type="search" class="form-control" placeholder="Mã lịch hẹn, tên hoặc SĐT bệnh nhân"
                 [(ngModel)]="filterKeyword" (keyup.enter)="loadAppointments()" />
        </div>
        <div class="filter-buttons">
          <button type="button" class="btn btn-primary" (click)="loadAppointments()"><i class="bi bi-search"></i> Lọc</button>
          <button type="button" class="btn btn-outline" (click)="resetFilters()"><i class="bi bi-arrow-counterclockwise"></i></button>
        </div>
      </div>

      <div class="stats-strip">
        <div class="stat-box"><span class="stat-number num">{{ appointments().length }}</span><span class="stat-label">Tổng lịch hẹn</span></div>
        <div class="stat-box stat-pending"><span class="stat-number num">{{ countByStatus()['PENDING'] || 0 }}</span><span class="stat-label">Chờ xác nhận</span></div>
        <div class="stat-box stat-confirmed"><span class="stat-number num">{{ countByStatus()['CONFIRMED'] || 0 }}</span><span class="stat-label">Đã xác nhận</span></div>
        <div class="stat-box stat-checked"><span class="stat-number num">{{ countByStatus()['CHECKED_IN'] || 0 }}</span><span class="stat-label">Đã check-in</span></div>
      </div>

      <div class="table-container">
        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Đang tải lịch hẹn...</p></div>
        } @else if (appointments().length === 0) {
          <div class="empty-state">
            <i class="bi bi-calendar-x"></i>
            <h3>Không có lịch hẹn nào</h3>
            <p>Thử chọn ngày khác hoặc bỏ bớt bộ lọc.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Giờ dự kiến</th>
                <th>Mã lịch / STT</th>
                <th>Bệnh nhân</th>
                <th>Bác sĩ / Phòng</th>
                <th>Lý do khám</th>
                <th>Trạng thái</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (a of appointments(); track a.id) {
                <tr>
                  <td>
                    <div class="num strong">{{ a.estimatedStartTime | slice:0:5 }}</div>
                    <div class="sub">{{ a.appointmentDate | date:'dd/MM/yyyy' }}</div>
                  </td>
                  <td>
                    <div class="num strong">{{ a.appointmentCode }}</div>
                    <div class="sub">STT #{{ a.bookingNumber }}</div>
                  </td>
                  <td>
                    <div class="strong">{{ a.patientName }}</div>
                    <div class="sub">{{ a.patientPhone || 'Chưa có SĐT' }}</div>
                  </td>
                  <td>
                    <div>{{ a.doctorName }}</div>
                    <div class="sub">Phòng {{ a.roomNumber }} · {{ a.specialtyName || 'Đa khoa' }}</div>
                  </td>
                  <td class="reason-cell">{{ a.reasonForVisit || '—' }}</td>
                  <td>
                    <span class="status-pill" [ngClass]="'pill-' + a.status.toLowerCase()">{{ statusLabels[a.status] }}</span>
                    @if (a.queueTicketNumber) {
                      <div class="sub">Số: <strong class="num">{{ a.queueTicketNumber }}</strong></div>
                    }
                    @if (a.status === 'CANCELLED' && a.cancellationReason) {
                      <div class="sub cancel-reason" [title]="a.cancellationReason">{{ a.cancellationReason }}</div>
                    }
                  </td>
                  <td class="text-right actions-cell">
                    @if (a.status === 'PENDING') {
                      <button type="button" class="btn btn-success btn-sm" [disabled]="busyId() === a.id" (click)="confirm(a)">
                        <i class="bi bi-check2"></i> Xác nhận
                      </button>
                    }
                    @if ((a.status === 'PENDING' || a.status === 'CONFIRMED') && a.appointmentDate === today) {
                      <button type="button" class="btn btn-primary btn-sm" [disabled]="busyId() === a.id" (click)="checkIn(a)">
                        <i class="bi bi-person-check"></i> Check-in
                      </button>
                    }
                    @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                      <button type="button" class="btn btn-outline-danger btn-sm" [disabled]="busyId() === a.id" (click)="openCancel(a)">
                        <i class="bi bi-x-circle"></i> Huỷ
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Modal huỷ -->
      @if (cancelTarget(); as target) {
        <div class="modal-backdrop" (click)="cancelTarget.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Huỷ lịch hẹn {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="cancelTarget.set(null)" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">
              <p>Huỷ lịch của bệnh nhân <strong>{{ target.patientName }}</strong> với {{ target.doctorName }}.</p>
              <div class="form-group">
                <label class="form-label required" for="mgmt-cancel-reason">Lý do huỷ</label>
                <textarea id="mgmt-cancel-reason" class="form-control" rows="2" maxlength="500" [(ngModel)]="cancelReason"
                          placeholder="Ví dụ: Bệnh nhân gọi điện xin huỷ"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="cancelTarget.set(null)">Đóng</button>
              <button type="button" class="btn btn-danger" [disabled]="!cancelReason.trim() || busyId() === target.id" (click)="confirmCancel()">
                Xác nhận huỷ
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Kết quả check-in -->
      @if (issuedTicket(); as ticket) {
        <div class="modal-backdrop" (click)="issuedTicket.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-body ticket-result">
              <i class="bi bi-ticket-perforated-fill"></i>
              <p>Đã cấp số thứ tự cho <strong>{{ ticket.patientName }}</strong></p>
              <div class="ticket-number num">{{ ticket.ticketNumber }}</div>
              <p class="sub">Phòng {{ ticket.roomNumber }} · {{ ticket.doctorName || 'Bác sĩ trực' }} · Chờ ước tính {{ ticket.estimatedWaitingMinutes ?? 0 }} phút</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-primary" (click)="issuedTicket.set(null)">Đóng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .appt-mgmt-page { padding: 1.5rem 1rem 3rem; max-width: 1250px; margin: 0 auto; }
    .page-header { margin-bottom: 1.25rem; }
    .page-title { font-size: 1.6rem; font-weight: 800; margin: 0 0 .3rem; color: var(--text-main); display: flex; gap: .5rem; align-items: center; }
    .page-subtitle { color: var(--text-muted); margin: 0; }

    .filters-card {
      display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; background: var(--bg-card);
      border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1rem 1.25rem; margin-bottom: 1rem;
      box-shadow: var(--shadow-card);
    }
    .filters-card .form-group { margin-bottom: 0; min-width: 170px; }
    .filters-card .grow { flex: 1; min-width: 220px; }
    .filter-buttons { display: flex; gap: .5rem; }

    .stats-strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .75rem; margin-bottom: 1rem; }
    .stat-box {
      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: .8rem 1rem; display: flex; flex-direction: column;
    }
    .stat-number { font-size: 1.5rem; font-weight: 800; color: var(--text-main); }
    .stat-label { font-size: .85rem; color: var(--text-muted); }
    .stat-pending .stat-number { color: var(--warning-solid); }
    .stat-confirmed .stat-number { color: var(--success-solid); }
    .stat-checked .stat-number { color: var(--info-solid); }

    .table-container {
      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card); overflow-x: auto;
    }
    .data-table { width: 100%; border-collapse: collapse; min-width: 900px; }
    .data-table th {
      text-align: left; font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; color: var(--text-muted);
      background: var(--bg-subtle); padding: .75rem 1rem; border-bottom: 1px solid var(--border-color);
    }
    .data-table td { padding: .8rem 1rem; border-bottom: 1px solid var(--border-color); vertical-align: top; font-size: .92rem; }
    .data-table tr:last-child td { border-bottom: none; }
    .text-right { text-align: right !important; }
    .strong { font-weight: 700; color: var(--text-main); }
    .sub { font-size: .82rem; color: var(--text-muted); margin-top: .15rem; }
    .reason-cell { max-width: 220px; color: var(--text-secondary); }
    .cancel-reason { max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .actions-cell { white-space: nowrap; }
    .actions-cell .btn + .btn { margin-left: .35rem; }

    .status-pill { font-size: .78rem; font-weight: 700; padding: .2rem .65rem; border-radius: var(--radius-full); border: 1px solid; white-space: nowrap; }
    .pill-pending { background: var(--warning-bg); color: var(--warning-text); border-color: var(--warning-border); }
    .pill-confirmed { background: var(--success-bg); color: var(--success-text); border-color: var(--success-border); }
    .pill-checked_in { background: var(--info-bg); color: var(--info-text); border-color: var(--info-border); }
    .pill-completed { background: var(--teal-50); color: var(--teal-700); border-color: var(--teal-100); }
    .pill-cancelled { background: var(--bg-subtle); color: var(--text-muted); border-color: var(--border-color); }

    .ticket-result { text-align: center; }
    .ticket-result > i { font-size: 2.5rem; color: var(--primary-600); }
    .ticket-number { font-size: 2.6rem; font-weight: 800; color: var(--primary-700); letter-spacing: .05em; margin: .25rem 0; }
  `]
})
export class AppointmentManagementComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);

  readonly today = toIsoDate(new Date());
  readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  readonly statusOptions = Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[];

  filterDate = this.today;
  filterStatus = '';
  filterKeyword = '';

  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<number | null>(null);

  readonly cancelTarget = signal<Appointment | null>(null);
  cancelReason = '';
  readonly issuedTicket = signal<QueueTicket | null>(null);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  readonly countByStatus = computed(() => {
    const counts: Record<string, number> = {};
    for (const a of this.appointments()) {
      counts[a.status] = (counts[a.status] || 0) + 1;
    }
    return counts;
  });

  ngOnInit(): void {
    this.loadAppointments();
  }

  loadAppointments(): void {
    this.loading.set(true);
    this.appointmentService.searchAppointments({
      date: this.filterDate,
      status: this.filterStatus,
      keyword: this.filterKeyword.trim()
    }).subscribe({
      next: res => {
        this.appointments.set(res.data ?? []);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.showAlert(err.error?.message || 'Không tải được danh sách lịch hẹn', 'danger');
      }
    });
  }

  resetFilters(): void {
    this.filterDate = this.today;
    this.filterStatus = '';
    this.filterKeyword = '';
    this.loadAppointments();
  }

  confirm(appt: Appointment): void {
    this.busyId.set(appt.id);
    this.appointmentService.confirmAppointment(appt.id).subscribe({
      next: res => {
        this.busyId.set(null);
        this.replaceAppointment(res.data);
        this.showAlert('Đã xác nhận lịch hẹn ' + res.data.appointmentCode, 'success');
      },
      error: err => {
        this.busyId.set(null);
        this.showAlert(err.error?.message || 'Xác nhận thất bại', 'danger');
      }
    });
  }

  checkIn(appt: Appointment): void {
    this.busyId.set(appt.id);
    this.appointmentService.checkInAppointment(appt.id).subscribe({
      next: res => {
        this.busyId.set(null);
        this.issuedTicket.set(res.data);
        this.loadAppointments();
      },
      error: err => {
        this.busyId.set(null);
        this.showAlert(err.error?.message || 'Check-in thất bại', 'danger');
      }
    });
  }

  openCancel(appt: Appointment): void {
    this.cancelReason = '';
    this.cancelTarget.set(appt);
  }

  confirmCancel(): void {
    const target = this.cancelTarget();
    if (!target) return;
    this.busyId.set(target.id);
    this.appointmentService.cancelAppointment(target.id, this.cancelReason.trim()).subscribe({
      next: res => {
        this.busyId.set(null);
        this.cancelTarget.set(null);
        this.replaceAppointment(res.data);
        this.showAlert('Đã huỷ lịch hẹn ' + res.data.appointmentCode, 'success');
      },
      error: err => {
        this.busyId.set(null);
        this.showAlert(err.error?.message || 'Huỷ lịch thất bại', 'danger');
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
