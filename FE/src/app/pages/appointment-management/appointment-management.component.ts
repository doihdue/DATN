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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lịch hẹn</h1>
          <p class="page-subtitle">{{ appointments().length }} lịch hẹn{{ filterDate ? ' ngày ' + (filterDate | date:'dd/MM/yyyy') : '' }}</p>
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

      <div class="stats-strip">
        <div class="stat-box"><span class="stat-label">Tổng lịch hẹn</span><span class="stat-number mono">{{ appointments().length }}</span></div>
        <div class="stat-box"><span class="stat-label">Chờ xác nhận</span><span class="stat-number mono">{{ countByStatus()['PENDING'] || 0 }}</span></div>
        <div class="stat-box"><span class="stat-label">Đã xác nhận</span><span class="stat-number mono">{{ countByStatus()['CONFIRMED'] || 0 }}</span></div>
        <div class="stat-box"><span class="stat-label">Đã check-in</span><span class="stat-number mono">{{ countByStatus()['CHECKED_IN'] || 0 }}</span></div>
      </div>

      <div class="panel">
        <div class="toolbar">
          <input id="f-date" type="date" class="filter-control" aria-label="Ngày khám" [(ngModel)]="filterDate" (change)="loadAppointments()" />
          <select id="f-status" class="filter-control" aria-label="Trạng thái" [(ngModel)]="filterStatus" (change)="loadAppointments()">
            <option value="">Tất cả trạng thái</option>
            @for (s of statusOptions; track s) {
              <option [value]="s">{{ statusLabels[s] }}</option>
            }
          </select>
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input id="f-keyword" type="search" class="filter-control search-input" placeholder="Mã lịch hẹn, tên hoặc SĐT bệnh nhân"
                   aria-label="Tìm kiếm" [(ngModel)]="filterKeyword" (keyup.enter)="loadAppointments()" />
          </div>
          <div class="filter-buttons">
            <button type="button" class="btn btn-secondary btn-sm" (click)="loadAppointments()">Lọc</button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="resetFilters()">Đặt lại</button>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state"><div class="spinner"></div><p>Đang tải lịch hẹn...</p></div>
        } @else if (appointments().length === 0) {
          <div class="empty-state">
            <h3>Không có lịch hẹn</h3>
            <p>Thử chọn ngày khác hoặc bỏ bớt bộ lọc.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Giờ dự kiến</th>
                  <th style="width: 140px;">Mã lịch / STT</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ / phòng</th>
                  <th>Lý do khám</th>
                  <th style="width: 150px;">Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (a of appointments(); track a.id) {
                  <tr>
                    <td>
                      <div class="mono strong">{{ a.estimatedStartTime | slice:0:5 }}</div>
                      <div class="sub mono">{{ a.appointmentDate | date:'dd/MM/yyyy' }}</div>
                    </td>
                    <td>
                      <div class="mono text-muted">{{ a.appointmentCode }}</div>
                      <div class="sub mono">STT {{ a.bookingNumber }}</div>
                    </td>
                    <td>
                      <div class="strong">{{ a.patientName }}</div>
                      <div class="sub mono">{{ a.patientPhone || 'Chưa có SĐT' }}</div>
                    </td>
                    <td>
                      <div>{{ a.doctorName }}</div>
                      <div class="sub">Phòng {{ a.roomNumber }} · {{ a.specialtyName || 'Đa khoa' }}</div>
                    </td>
                    <td class="reason-cell">{{ a.reasonForVisit || '—' }}</td>
                    <td>
                      <span class="status"
                            [class.warning]="a.status === 'PENDING'"
                            [class.success]="a.status === 'CONFIRMED' || a.status === 'COMPLETED'"
                            [class.info]="a.status === 'CHECKED_IN'">{{ statusLabels[a.status] }}</span>
                      @if (a.queueTicketNumber) {
                        <div class="sub">Số <strong class="mono">{{ a.queueTicketNumber }}</strong></div>
                      }
                      @if (a.status === 'CANCELLED' && a.cancellationReason) {
                        <div class="sub cancel-reason" [title]="a.cancellationReason">{{ a.cancellationReason }}</div>
                      }
                    </td>
                    <td class="text-right actions-cell">
                      @if (a.status === 'PENDING') {
                        <button type="button" class="btn btn-secondary btn-sm" [disabled]="busyId() === a.id" (click)="confirm(a)">
                          Xác nhận
                        </button>
                      }
                      @if ((a.status === 'PENDING' || a.status === 'CONFIRMED') && a.appointmentDate === today) {
                        <button type="button" class="btn btn-primary btn-sm" [disabled]="busyId() === a.id" (click)="checkIn(a)">
                          Check-in
                        </button>
                      }
                      @if (a.status === 'PENDING' || a.status === 'CONFIRMED') {
                        <button type="button" class="icon-btn danger" [disabled]="busyId() === a.id" (click)="openCancel(a)" title="Huỷ lịch hẹn" aria-label="Huỷ lịch hẹn">
                          <i class="bi bi-x-circle"></i>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Modal huỷ -->
      @if (cancelTarget(); as target) {
        <div class="modal-backdrop" (click)="cancelTarget.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Huỷ lịch hẹn {{ target.appointmentCode }}</h2>
              <button type="button" class="modal-close-btn" (click)="cancelTarget.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="modal-text">Huỷ lịch của bệnh nhân <strong>{{ target.patientName }}</strong> với {{ target.doctorName }}.</p>
              <div class="form-group">
                <label class="form-label required" for="mgmt-cancel-reason">Lý do huỷ</label>
                <textarea id="mgmt-cancel-reason" class="form-control" rows="2" maxlength="500" [(ngModel)]="cancelReason"
                          placeholder="Ví dụ: bệnh nhân gọi điện xin huỷ"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="cancelTarget.set(null)">Đóng</button>
              <button type="button" class="btn btn-danger" [disabled]="!cancelReason.trim() || busyId() === target.id" (click)="confirmCancel()">
                Huỷ lịch hẹn
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Kết quả check-in -->
      @if (issuedTicket(); as ticket) {
        <div class="modal-backdrop" (click)="issuedTicket.set(null)">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Đã cấp số thứ tự</h2>
              <button type="button" class="modal-close-btn" (click)="issuedTicket.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body ticket-result">
              <p>Bệnh nhân <strong>{{ ticket.patientName }}</strong></p>
              <div class="ticket-number mono">{{ ticket.ticketNumber }}</div>
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
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat-box {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stat-label { font-size: 13px; color: var(--text-muted); }
    .stat-number { font-size: 22px; font-weight: 600; color: var(--text-main); line-height: 1.3; }

    .toolbar .search-box { position: relative; flex: 1 1 260px; max-width: 420px; }
    .search-box i {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: var(--text-light); font-size: 14px;
    }
    .filter-control {
      height: 34px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
      padding: 0 8px;
      min-width: 160px;
    }
    .search-input { width: 100%; padding-left: 32px; }
    .filter-control:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15); }
    .filter-buttons { display: flex; gap: 6px; margin-left: auto; }

    .table-responsive { overflow-x: auto; }
    .data-table { min-width: 900px; }
    .data-table td { vertical-align: top; }
    .text-right { text-align: right !important; }
    .strong { font-weight: 500; color: var(--text-main); }
    .sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .reason-cell { max-width: 240px; color: var(--text-secondary); font-size: 13px; }
    .cancel-reason { max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .actions-cell { white-space: nowrap; }
    .actions-cell > * + * { margin-left: 4px; }
    .actions-cell .icon-btn { vertical-align: middle; }

    .modal-text { margin-bottom: 12px; color: var(--text-secondary); }
    .modal-sm { max-width: 420px; width: 100%; }
    .ticket-result { text-align: center; }
    .ticket-number { font-size: 36px; font-weight: 600; color: var(--text-main); margin: 4px 0 8px; }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .stats-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .filter-buttons { margin-left: 0; }
    }
  `]})
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
