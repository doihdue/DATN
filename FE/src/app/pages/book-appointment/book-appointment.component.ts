import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppointmentService } from '../../services/appointment.service';
import { SpecialtyService } from '../../services/specialty.service';
import { AuthService } from '../../services/auth.service';
import { WorkSchedule } from '../../models/schedule.model';
import { Specialty } from '../../models/specialty.model';
import { Appointment } from '../../models/appointment.model';
import { formatDayTitle, toIsoDate } from '../../utils/date.utils';

interface ScheduleDayGroup {
  date: string;
  schedules: WorkSchedule[];
}

@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page booking-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Đặt lịch khám</h1>
          <p class="page-subtitle">Chọn chuyên khoa, ngày khám và ca còn chỗ.</p>
        </div>
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

      <!-- Bộ lọc: chuyên khoa, ngày, bác sĩ -->
      <section class="panel filter-panel">
        <div class="panel-body">
          <div class="filter-label">Chuyên khoa</div>
          <div class="chip-list">
            <button type="button" class="chip" [class.active]="specialtyId() === null" (click)="selectSpecialty(null)">
              Tất cả
            </button>
            @for (spec of specialties(); track spec.id) {
              <button type="button" class="chip" [class.active]="specialtyId() === spec.id" (click)="selectSpecialty(spec.id)">
                {{ spec.name }}
              </button>
            }
          </div>

          <div class="filters-grid">
            <div class="form-group">
              <label class="form-label" for="work-date">Ngày khám</label>
              <input id="work-date" type="date" class="form-control" [min]="today" [(ngModel)]="workDate" (change)="onDateChange()" />
            </div>
            <div class="form-group">
              <label class="form-label" for="doctor">Bác sĩ</label>
              <select id="doctor" class="form-control" [ngModel]="doctorId()" (ngModelChange)="selectDoctor($event)">
                <option [ngValue]="null">Tất cả bác sĩ</option>
                @for (doc of doctors(); track doc.id) {
                  <option [ngValue]="doc.id">{{ doc.name }}</option>
                }
              </select>
            </div>
          </div>
        </div>
      </section>

      <!-- Ca khám -->
      <section class="panel" #slotsSection>
        <div class="panel-header">
          <h2 class="panel-title">Ca khám còn chỗ</h2>
          @if (!loading() && filteredSchedules().length > 0) {
            <span class="step-count text-muted mono">{{ filteredSchedules().length }} ca</span>
          }
        </div>

        <div class="panel-body">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Đang tải ca khám...</p>
            </div>
          } @else if (filteredSchedules().length === 0) {
            <div class="empty-state">
              <h3>Không còn ca khám trống</h3>
              <p>Thử chọn chuyên khoa hoặc ngày khám khác.</p>
            </div>
          } @else {
            @for (group of groupedSchedules(); track group.date) {
              <div class="day-group">
                <h3 class="day-title">{{ formatDayTitle(group.date) }}</h3>
                <div class="slot-grid">
                  @for (item of group.schedules; track item.id) {
                    <div class="slot-card">
                      <div class="slot-time mono">{{ item.startTime | slice:0:5 }} – {{ item.endTime | slice:0:5 }}</div>
                      <div class="slot-doctor">{{ item.academicTitle ? item.academicTitle + ' ' : '' }}{{ item.doctorName }}</div>
                      <div class="slot-meta">
                        <span>{{ item.specialtyName || 'Đa khoa' }}</span>
                        <span>Phòng {{ item.roomNumber }}{{ item.floor ? ', tầng ' + item.floor : '' }}</span>
                      </div>
                      <div class="slot-capacity">
                        <div class="capacity-bar">
                          <div class="capacity-fill" [style.width.%]="(item.currentBookedCount / item.maxPatients) * 100"></div>
                        </div>
                        <span class="mono" [class.low]="item.remainingSlots <= 3">Còn {{ item.remainingSlots }}/{{ item.maxPatients }} chỗ</span>
                      </div>
                      <button type="button" class="btn btn-outline btn-sm btn-block" (click)="openBookingModal(item)">
                        Chọn ca này
                      </button>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>

        @if (!loading() && filteredSchedules().length > 0 && totalPages() > 1) {
          <nav class="pagination-footer" aria-label="Phân trang ca khám">
            <div class="pagination-info">
              <span class="mono">{{ startIndex() }}–{{ endIndex() }} / {{ filteredSchedules().length }} ca</span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số ca mỗi trang</label>
                <select id="pageSizeSelect" class="form-select-sm" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
                  @for (opt of pageSizeOptions; track opt) {
                    <option [ngValue]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pagination-controls">
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Trang đầu" aria-label="Trang đầu">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)" title="Trang trước" aria-label="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>
              <div class="page-numbers-group">
                @for (p of pagesList(); track p) {
                  <button type="button" class="btn-page" [class.active]="currentPage() === p"
                          [attr.aria-current]="currentPage() === p ? 'page' : null" (click)="goToPage(p)">
                    {{ p }}
                  </button>
                }
              </div>
              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)" title="Trang sau" aria-label="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Trang cuối" aria-label="Trang cuối">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </nav>
        }
      </section>

      <!-- Modal xác nhận đặt lịch -->
      @if (selectedSchedule(); as sel) {
        <div class="modal-backdrop" (click)="closeBookingModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Xác nhận đặt lịch</h2>
              <button type="button" class="modal-close-btn" (click)="closeBookingModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <dl class="summary-list">
                <dt>Bác sĩ</dt><dd>{{ sel.academicTitle ? sel.academicTitle + ' ' : '' }}{{ sel.doctorName }}</dd>
                <dt>Chuyên khoa</dt><dd>{{ sel.specialtyName || 'Đa khoa' }}</dd>
                <dt>Ngày khám</dt><dd>{{ formatDayTitle(sel.workDate) }}</dd>
                <dt>Ca khám</dt><dd class="mono">{{ sel.startTime | slice:0:5 }} – {{ sel.endTime | slice:0:5 }}</dd>
                <dt>Phòng</dt><dd>{{ sel.roomNumber }} {{ sel.roomName ? '(' + sel.roomName + ')' : '' }}</dd>
              </dl>

              @if (!authService.isAuthenticated()) {
                <div class="alert alert-warning">Cần đăng nhập tài khoản bệnh nhân để đặt lịch.</div>
              } @else if (!isPatient()) {
                <div class="alert alert-warning">Chỉ tài khoản bệnh nhân được đặt lịch online. Lễ tân cấp số tại quầy.</div>
              } @else {
                <div class="form-group">
                  <label class="form-label" for="reason">Triệu chứng / lý do khám (không bắt buộc)</label>
                  <textarea id="reason" class="form-control" rows="3" maxlength="500"
                            placeholder="Ví dụ: sốt nhẹ, ho khan 3 ngày" [(ngModel)]="reasonForVisit"></textarea>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeBookingModal()">Hủy</button>
              @if (!authService.isAuthenticated()) {
                <button type="button" class="btn btn-primary" (click)="goToLogin()">Đăng nhập để đặt lịch</button>
              } @else if (isPatient()) {
                <button type="button" class="btn btn-primary" [disabled]="submitting()" (click)="confirmBooking()">
                  @if (submitting()) { <span class="spinner-sm"></span> }
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
            <div class="modal-header">
              <h2 class="modal-title">Đã đặt lịch</h2>
            </div>
            <div class="modal-body">
              <p class="success-note">Lịch hẹn đang chờ phòng khám xác nhận. Xuất trình mã lịch hẹn tại quầy lễ tân khi đến khám.</p>
              <div class="code-box">
                <span class="code-label">Mã lịch hẹn</span>
                <span class="code-value mono">{{ appt.appointmentCode }}</span>
              </div>
              <dl class="summary-list">
                <dt>Số thứ tự đặt trước</dt><dd class="mono">#{{ appt.bookingNumber }}</dd>
                <dt>Ngày khám</dt><dd>{{ formatDayTitle(appt.appointmentDate) }}</dd>
                <dt>Giờ khám dự kiến</dt><dd class="mono">{{ appt.estimatedStartTime | slice:0:5 }}</dd>
                <dt>Bác sĩ</dt><dd>{{ appt.doctorName }}</dd>
                <dt>Phòng</dt><dd>{{ appt.roomNumber }}</dd>
              </dl>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="bookedAppointment.set(null)">Đặt thêm lịch</button>
              <a routerLink="/my-appointments" class="btn btn-primary">Xem lịch hẹn của tôi</a>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .booking-page { max-width: 1100px; }

    .filter-panel { margin-bottom: 16px; }
    .filter-label { font-size: 13px; font-weight: 500; color: var(--text-secondary); margin-bottom: 6px; }

    .chip-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .chip {
      height: 30px; padding: 0 12px;
      border: 1px solid var(--border-strong); background: #fff; color: var(--text-secondary);
      border-radius: var(--radius-md); font: inherit; font-size: 13px; cursor: pointer;
      transition: background-color .12s ease, border-color .12s ease, color .12s ease;
    }
    .chip:hover { background: var(--bg-hover); color: var(--text-main); }
    .chip.active { background: var(--primary-600); border-color: var(--primary-600); color: #fff; }

    .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
    .filters-grid .form-group { margin-bottom: 0; }

    .step-count { font-size: 13px; }

    .day-group + .day-group { margin-top: 20px; }
    .day-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px; }
    .slot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .slot-card {
      border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px 14px;
      display: flex; flex-direction: column; gap: 6px; background: #fff;
      transition: border-color .12s ease;
    }
    .slot-card:hover { border-color: var(--border-strong); }
    .slot-time { font-size: 15px; font-weight: 600; color: var(--text-main); }
    .slot-doctor { font-size: 14px; font-weight: 500; color: var(--text-main); }
    .slot-meta { display: flex; flex-direction: column; gap: 2px; font-size: 13px; color: var(--text-muted); }
    .slot-capacity { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .slot-capacity .low { color: var(--warning-text); font-weight: 500; }
    .capacity-bar { height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
    .capacity-fill { height: 100%; background: var(--primary-500); }
    .btn-block { width: 100%; margin-top: 6px; }

    .loading-state, .empty-state { padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .empty-state h3 { font-size: 15px; font-weight: 600; color: var(--text-main); margin-bottom: 4px; }

    .pagination-footer {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
      padding: 10px 16px; border-top: 1px solid var(--border-color); font-size: 13px; color: var(--text-muted);
    }
    .pagination-info, .page-size-selector, .pagination-controls, .page-numbers-group { display: flex; align-items: center; gap: 8px; }
    .pagination-info { gap: 16px; }
    .pagination-controls, .page-numbers-group { gap: 4px; }
    .form-select-sm {
      height: 28px; border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
      font: inherit; font-size: 13px; padding: 0 6px; background: #fff;
    }
    .btn-page {
      min-width: 28px; height: 28px; padding: 0 6px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
      background: #fff; color: var(--text-secondary); font: inherit; font-size: 13px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .btn-page:hover:not(:disabled) { background: var(--bg-hover); }
    .btn-page:disabled { opacity: .45; cursor: not-allowed; }
    .btn-page.active { background: var(--primary-600); border-color: var(--primary-600); color: #fff; }

    .summary-list { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0 0 16px; font-size: 14px; }
    .summary-list dt { color: var(--text-muted); }
    .summary-list dd { margin: 0; color: var(--text-main); font-weight: 500; }

    .success-note { font-size: 14px; color: var(--text-secondary); margin: 0 0 12px; }
    .code-box {
      display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
      padding: 10px 14px; margin-bottom: 16px;
      background: var(--bg-subtle); border: 1px solid var(--border-color); border-radius: var(--radius-md);
    }
    .code-label { font-size: 13px; color: var(--text-muted); }
    .code-value { font-size: 20px; font-weight: 600; color: var(--text-main); letter-spacing: .02em; }

    @media (max-width: 600px) {
      .page { padding: 16px; }
      .pagination-footer { justify-content: center; }
    }
  `]
})
export class BookAppointmentComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly today = toIsoDate(new Date());
  workDate = this.today;

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

  // Phân trang (lưới 3 cột nên số ca/trang là bội số của 3)
  @ViewChild('slotsSection') private slotsSection?: ElementRef<HTMLElement>;
  readonly pageSizeOptions = [6, 9, 12, 18];
  readonly pageSize = signal(9);
  readonly currentPage = signal(1);

  readonly isPatient = computed(() => this.authService.userRoles().includes('ROLE_PATIENT'));

  readonly doctors = computed(() => {
    const map = new Map<number, string>();
    for (const s of this.schedules()) {
      map.set(s.doctorId, (s.academicTitle ? s.academicTitle + ' ' : '') + s.doctorName);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  });

  readonly filteredSchedules = computed(() => {
    const doctorId = this.doctorId();
    return doctorId ? this.schedules().filter(s => s.doctorId === doctorId) : this.schedules();
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredSchedules().length / this.pageSize())));

  readonly pagedSchedules = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredSchedules().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() =>
    this.filteredSchedules().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredSchedules().length));

  // Tối đa 5 nút số trang, trang hiện tại nằm giữa
  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage() - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  // Nhóm các ca của trang hiện tại theo ngày (danh sách đã sắp xếp theo ngày/giờ từ server)
  readonly groupedSchedules = computed<ScheduleDayGroup[]>(() => {
    const groups = new Map<string, WorkSchedule[]>();
    for (const s of this.pagedSchedules()) {
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
    this.currentPage.set(1);
    this.loadSchedules();
  }

  selectDoctor(id: number | null): void {
    this.doctorId.set(id);
    this.currentPage.set(1);
  }

  onDateChange(): void {
    // Không cho để trống hoặc chọn ngày trong quá khứ
    if (!this.workDate || this.workDate < this.today) {
      this.workDate = this.today;
    }
    this.currentPage.set(1);
    this.loadSchedules();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.slotsSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.appointmentService.getAvailableSchedules({
      startDate: this.workDate,
      endDate: this.workDate,
      specialtyId: this.specialtyId()
    }).subscribe({
      next: res => {
        this.schedules.set(res.data ?? []);
        if (this.doctorId() && !this.doctors().some(d => d.id === this.doctorId())) {
          this.doctorId.set(null);
        }
        if (this.currentPage() > this.totalPages()) {
          this.currentPage.set(this.totalPages());
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
