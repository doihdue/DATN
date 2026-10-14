import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { SpecialtyService } from '../../services/specialty.service';
import { AuthService } from '../../services/auth.service';
import { WorkSchedule } from '../../models/schedule.model';
import { Specialty } from '../../models/specialty.model';
import { Appointment } from '../../models/appointment.model';
import { addDays, formatDayTitle, toIsoDate } from '../../utils/date.utils';

interface ScheduleDayGroup {
  date: string;
  schedules: WorkSchedule[];
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="booking-page">
      <!-- Header -->
      <div class="page-header">
        <div class="header-badge"><i class="bi bi-calendar-plus-fill"></i> Đặt lịch khám online</div>
        <h1 class="page-title">Đặt Lịch Khám Bệnh</h1>
        <p class="page-subtitle">Chọn chuyên khoa, bác sĩ và ca khám còn chỗ. Đến đúng giờ để không phải xếp hàng lâu.</p>
      </div>

      <!-- Toast -->
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

      <!-- Bước 1: Chuyên khoa -->
      <section class="step-card">
        <h2 class="step-title"><span class="step-num">1</span> Chọn chuyên khoa</h2>
        <div class="chip-list">
          <button type="button" class="chip" [class.active]="specialtyId() === null" (click)="selectSpecialty(null)">
            <i class="bi bi-grid"></i> Tất cả
          </button>
          @for (spec of specialties(); track spec.id) {
            <button type="button" class="chip" [class.active]="specialtyId() === spec.id" (click)="selectSpecialty(spec.id)">
              {{ spec.name }}
            </button>
          }
        </div>
      </section>

      <!-- Bước 2: Thời gian & bác sĩ -->
      <section class="step-card">
        <h2 class="step-title"><span class="step-num">2</span> Chọn thời gian và bác sĩ</h2>
        <div class="filters-grid">
          <div class="form-group">
            <label class="form-label" for="from-date">Từ ngày</label>
            <input id="from-date" type="date" class="form-control" [min]="today" [(ngModel)]="startDate" (change)="loadSchedules()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="to-date">Đến ngày</label>
            <input id="to-date" type="date" class="form-control" [min]="startDate" [(ngModel)]="endDate" (change)="loadSchedules()" />
          </div>
          <div class="form-group">
            <label class="form-label" for="doctor">Bác sĩ</label>
            <select id="doctor" class="form-control" [ngModel]="doctorId()" (ngModelChange)="doctorId.set($event)">
              <option [ngValue]="null">-- Tất cả bác sĩ --</option>
              @for (doc of doctors(); track doc.id) {
                <option [ngValue]="doc.id">{{ doc.name }}</option>
              }
            </select>
          </div>
        </div>
      </section>

      <!-- Bước 3: Ca khám -->
      <section class="step-card">
        <h2 class="step-title"><span class="step-num">3</span> Chọn ca khám còn chỗ</h2>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tìm ca khám còn chỗ...</p>
          </div>
        } @else if (groupedSchedules().length === 0) {
          <div class="empty-state">
            <i class="bi bi-calendar-x"></i>
            <h3>Không còn ca khám trống</h3>
            <p>Hãy chọn chuyên khoa khác hoặc mở rộng khoảng ngày tìm kiếm.</p>
          </div>
        } @else {
          @for (group of groupedSchedules(); track group.date) {
            <div class="day-group">
              <h3 class="day-title"><i class="bi bi-calendar3"></i> {{ formatDayTitle(group.date) }}</h3>
              <div class="slot-grid">
                @for (item of group.schedules; track item.id) {
                  <div class="slot-card">
                    <div class="slot-time">
                      <i class="bi bi-clock"></i> {{ item.startTime | slice:0:5 }} - {{ item.endTime | slice:0:5 }}
                    </div>
                    <div class="slot-doctor">{{ item.academicTitle ? item.academicTitle + ' ' : '' }}{{ item.doctorName }}</div>
                    <div class="slot-meta">
                      <span><i class="bi bi-diagram-3"></i> {{ item.specialtyName || 'Đa khoa' }}</span>
                      <span><i class="bi bi-door-open"></i> Phòng {{ item.roomNumber }}{{ item.floor ? ' - Tầng ' + item.floor : '' }}</span>
                    </div>
                    <div class="slot-capacity">
                      <div class="capacity-bar">
                        <div class="capacity-fill" [style.width.%]="(item.currentBookedCount / item.maxPatients) * 100"></div>
                      </div>
                      <span [class.low]="item.remainingSlots <= 3">Còn {{ item.remainingSlots }} / {{ item.maxPatients }} chỗ</span>
                    </div>
                    <button type="button" class="btn btn-primary btn-sm btn-block" (click)="openBookingModal(item)">
                      <i class="bi bi-check2-circle"></i> Chọn ca này
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        }
      </section>

      <!-- Modal xác nhận đặt lịch -->
      @if (selectedSchedule(); as sel) {
        <div class="modal-backdrop" (click)="closeBookingModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title"><i class="bi bi-calendar-check"></i> Xác nhận đặt lịch</h2>
              <button type="button" class="modal-close-btn" (click)="closeBookingModal()" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="modal-body">
              <dl class="summary-list">
                <dt>Bác sĩ</dt><dd>{{ sel.academicTitle ? sel.academicTitle + ' ' : '' }}{{ sel.doctorName }}</dd>
                <dt>Chuyên khoa</dt><dd>{{ sel.specialtyName || 'Đa khoa' }}</dd>
                <dt>Ngày khám</dt><dd>{{ formatDayTitle(sel.workDate) }}</dd>
                <dt>Ca khám</dt><dd>{{ sel.startTime | slice:0:5 }} - {{ sel.endTime | slice:0:5 }}</dd>
                <dt>Phòng</dt><dd>{{ sel.roomNumber }} {{ sel.roomName ? '(' + sel.roomName + ')' : '' }}</dd>
              </dl>

              @if (!authService.isAuthenticated()) {
                <div class="alert alert-warning">
                  <i class="bi bi-info-circle"></i> Bạn cần đăng nhập tài khoản bệnh nhân để đặt lịch.
                </div>
              } @else if (!isPatient()) {
                <div class="alert alert-warning">
                  <i class="bi bi-info-circle"></i> Chỉ tài khoản bệnh nhân mới đặt lịch online được. Lễ tân vui lòng cấp số tại quầy.
                </div>
              } @else {
                <div class="form-group">
                  <label class="form-label" for="reason">Triệu chứng / lý do khám (không bắt buộc)</label>
                  <textarea id="reason" class="form-control" rows="3" maxlength="500"
                            placeholder="Ví dụ: Sốt nhẹ, ho khan 3 ngày nay..." [(ngModel)]="reasonForVisit"></textarea>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeBookingModal()">Quay lại</button>
              @if (!authService.isAuthenticated()) {
                <button type="button" class="btn btn-primary" (click)="goToLogin()">
                  <i class="bi bi-box-arrow-in-right"></i> Đăng nhập để đặt lịch
                </button>
              } @else if (isPatient()) {
                <button type="button" class="btn btn-primary" [disabled]="submitting()" (click)="confirmBooking()">
                  @if (submitting()) { <span class="spinner-sm"></span> } @else { <i class="bi bi-send-check"></i> }
                  Xác nhận đặt lịch
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal đặt lịch thành công -->
      @if (bookedAppointment(); as appt) {
        <div class="modal-backdrop">
          <div class="modal-dialog">
            <div class="modal-body success-body">
              <div class="success-icon"><i class="bi bi-check-circle-fill"></i></div>
              <h2>Đặt lịch thành công!</h2>
              <p class="text-muted">Lịch hẹn đang chờ phòng khám xác nhận. Vui lòng xuất trình mã lịch hẹn tại quầy lễ tân.</p>
              <div class="code-box">
                <span class="code-label">Mã lịch hẹn</span>
                <span class="code-value num">{{ appt.appointmentCode }}</span>
              </div>
              <dl class="summary-list">
                <dt>Số thứ tự đặt trước</dt><dd class="num">#{{ appt.bookingNumber }}</dd>
                <dt>Ngày khám</dt><dd>{{ formatDayTitle(appt.appointmentDate) }}</dd>
                <dt>Giờ khám dự kiến</dt><dd class="num">{{ appt.estimatedStartTime | slice:0:5 }}</dd>
                <dt>Bác sĩ</dt><dd>{{ appt.doctorName }}</dd>
                <dt>Phòng</dt><dd>{{ appt.roomNumber }}</dd>
              </dl>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="bookedAppointment.set(null)">Đặt thêm lịch</button>
              <a routerLink="/my-appointments" class="btn btn-primary"><i class="bi bi-list-check"></i> Xem lịch hẹn của tôi</a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .booking-page { padding: 1.5rem 1rem 3rem; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; }
    .header-badge {
      display: inline-flex; align-items: center; gap: .4rem; padding: .3rem .8rem;
      background: var(--primary-50); color: var(--primary-700); border: 1px solid var(--primary-200);
      border-radius: var(--radius-full); font-size: .8rem; font-weight: 600; margin-bottom: .6rem;
    }
    .page-title { font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0 0 .35rem; }
    .page-subtitle { color: var(--text-muted); margin: 0; font-size: 1rem; }

    .step-card {
      background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card); padding: 1.25rem 1.5rem; margin-bottom: 1.25rem;
    }
    .step-title { display: flex; align-items: center; gap: .6rem; font-size: 1.1rem; font-weight: 700; margin: 0 0 1rem; color: var(--text-main); }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%; background: var(--primary-600); color: #fff;
      display: inline-flex; align-items: center; justify-content: center; font-size: .9rem;
    }

    .chip-list { display: flex; flex-wrap: wrap; gap: .5rem; }
    .chip {
      border: 1px solid var(--border-color); background: var(--bg-subtle); color: var(--text-secondary);
      padding: .55rem 1rem; border-radius: var(--radius-full); font-size: .95rem; font-weight: 600; cursor: pointer;
      transition: all .15s ease;
    }
    .chip:hover { border-color: var(--primary-300); color: var(--primary-700); }
    .chip.active { background: var(--primary-600); border-color: var(--primary-600); color: #fff; }

    .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .filters-grid .form-group { margin-bottom: 0; }

    .day-group + .day-group { margin-top: 1.5rem; }
    .day-title { font-size: 1rem; font-weight: 700; color: var(--primary-800); margin: 0 0 .75rem; display: flex; gap: .4rem; align-items: center; }
    .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
    .slot-card {
      border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem;
      display: flex; flex-direction: column; gap: .5rem; background: #fff; transition: box-shadow .15s ease, border-color .15s ease;
    }
    .slot-card:hover { border-color: var(--primary-300); box-shadow: var(--shadow-md); }
    .slot-time { font-weight: 700; color: var(--primary-700); font-size: 1.05rem; }
    .slot-doctor { font-weight: 700; color: var(--text-main); font-size: 1rem; }
    .slot-meta { display: flex; flex-direction: column; gap: .2rem; font-size: .88rem; color: var(--text-muted); }
    .slot-capacity { font-size: .85rem; color: var(--success-text); font-weight: 600; }
    .slot-capacity .low { color: var(--warning-solid); }
    .capacity-bar { height: 6px; background: var(--bg-subtle); border-radius: var(--radius-full); overflow: hidden; margin-bottom: .3rem; }
    .capacity-fill { height: 100%; background: var(--teal-500); }
    .btn-block { width: 100%; justify-content: center; margin-top: auto; }

    .summary-list { display: grid; grid-template-columns: max-content 1fr; gap: .45rem 1rem; margin: 0 0 1rem; }
    .summary-list dt { color: var(--text-muted); font-size: .9rem; }
    .summary-list dd { margin: 0; font-weight: 600; color: var(--text-main); }

    .success-body { text-align: center; }
    .success-body .summary-list { text-align: left; max-width: 360px; margin: 1rem auto 0; }
    .success-icon { font-size: 3rem; color: var(--success-solid); }
    .success-body h2 { margin: .25rem 0 .5rem; font-size: 1.4rem; }
    .text-muted { color: var(--text-muted); }
    .code-box {
      display: inline-flex; flex-direction: column; padding: .75rem 1.5rem; margin-top: .5rem;
      background: var(--primary-50); border: 1px dashed var(--primary-300); border-radius: var(--radius-md);
    }
    .code-label { font-size: .8rem; color: var(--text-muted); }
    .code-value { font-size: 1.5rem; font-weight: 800; color: var(--primary-700); letter-spacing: .05em; }

    @media (max-width: 600px) {
      .step-card { padding: 1rem; }
      .page-title { font-size: 1.4rem; }
    }
  `]
})
export class BookAppointmentComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly today = toIsoDate(new Date());
  startDate = this.today;
  endDate = toIsoDate(addDays(new Date(), 7));

  readonly specialties = signal<Specialty[]>([]);
  readonly specialtyId = signal<number | null>(null);
  readonly doctorId = signal<number | null>(null);
  readonly schedules = signal<WorkSchedule[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);

  readonly selectedSchedule = signal<WorkSchedule | null>(null);
  readonly bookedAppointment = signal<Appointment | null>(null);
  reasonForVisit = '';

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  readonly isPatient = computed(() => this.authService.userRoles().includes('ROLE_PATIENT'));

  readonly doctors = computed(() => {
    const map = new Map<number, string>();
    for (const s of this.schedules()) {
      map.set(s.doctorId, (s.academicTitle ? s.academicTitle + ' ' : '') + s.doctorName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  });

  readonly groupedSchedules = computed<ScheduleDayGroup[]>(() => {
    const doctorId = this.doctorId();
    const groups = new Map<string, WorkSchedule[]>();
    for (const s of this.schedules()) {
      if (doctorId && s.doctorId !== doctorId) continue;
      if (!groups.has(s.workDate)) groups.set(s.workDate, []);
      groups.get(s.workDate)!.push(s);
    }
    return Array.from(groups, ([date, schedules]) => ({ date, schedules }));
  });

  ngOnInit(): void {
    this.specialtyService.getAllSpecialties().subscribe({
      next: res => this.specialties.set(res.data ?? [])
    });
    this.loadSchedules();
  }

  selectSpecialty(id: number | null): void {
    this.specialtyId.set(id);
    this.doctorId.set(null);
    this.loadSchedules();
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.appointmentService.getAvailableSchedules({
      startDate: this.startDate,
      endDate: this.endDate,
      specialtyId: this.specialtyId()
    }).subscribe({
      next: res => {
        this.schedules.set(res.data ?? []);
        if (this.doctorId() && !this.doctors().some(d => d.id === this.doctorId())) {
          this.doctorId.set(null);
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.showAlert(err.error?.message || 'Không tải được danh sách ca khám', 'danger');
      }
    });
  }

  openBookingModal(schedule: WorkSchedule): void {
    this.reasonForVisit = '';
    this.selectedSchedule.set(schedule);
  }

  closeBookingModal(): void {
    this.selectedSchedule.set(null);
  }

  goToLogin(): void {
    this.router.navigate(['/login'], { queryParams: { returnUrl: '/booking' } });
  }

  confirmBooking(): void {
    const schedule = this.selectedSchedule();
    if (!schedule) return;

    this.submitting.set(true);
    this.appointmentService.bookAppointment({
      workScheduleId: schedule.id,
      reasonForVisit: this.reasonForVisit.trim() || undefined
    }).subscribe({
      next: res => {
        this.submitting.set(false);
        this.selectedSchedule.set(null);
        this.bookedAppointment.set(res.data);
        this.loadSchedules();
      },
      error: err => {
        this.submitting.set(false);
        this.showAlert(err.error?.message || 'Đặt lịch thất bại, vui lòng thử lại', 'danger');
        this.loadSchedules();
      }
    });
  }

  formatDayTitle(isoDate: string): string {
    return formatDayTitle(isoDate);
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertType.set(type);
    this.alertMessage.set(message);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
