import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';
import { SpecialtyService } from '../../services/specialty.service';
import { ExaminationRoom, WorkSchedule, WorkScheduleRequest } from '../../models/schedule.model';
import { Specialty } from '../../models/specialty.model';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="schedules-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-calendar-check-fill"></i> Tầng Kế Hoạch & Xếp Lịch
          </div>
          <h1 class="page-title">Quản Lý Lịch Làm Việc Bác Sĩ</h1>
          <p class="page-subtitle">
            Phân bổ ca trực theo chuyên khoa, kiểm tra tự động xung đột trùng giờ bác sĩ & phòng khám
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-calendar-plus-fill"></i> Đăng Ký Ca Trực Mới
          </button>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="filters-card">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-calendar3"></i> Từ ngày</label>
            <input type="date" [(ngModel)]="filterStartDate" (change)="loadSchedules()" class="form-control" />
          </div>
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-calendar3"></i> Đến ngày</label>
            <input type="date" [(ngModel)]="filterEndDate" (change)="loadSchedules()" class="form-control" />
          </div>
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-door-open"></i> Phòng khám</label>
            <select [(ngModel)]="filterRoomId" (change)="loadSchedules()" class="form-control">
              <option [ngValue]="null">-- Tất cả phòng khám --</option>
              @for (room of rooms(); track room.id) {
                <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }}</option>
              }
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-diagram-3"></i> Chuyên khoa</label>
            <select [(ngModel)]="filterSpecialtyId" (change)="loadSchedules()" class="form-control">
              <option [ngValue]="null">-- Tất cả chuyên khoa --</option>
              @for (spec of specialties(); track spec.id) {
                <option [ngValue]="spec.id">{{ spec.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" (click)="resetFilters()">
            <i class="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
          </button>
        </div>
      </div>

      <!-- Stats Summary Strip -->
      <div class="stats-strip">
        <div class="stat-box">
          <span class="stat-number">{{ schedules().length }}</span>
          <span class="stat-label">Tổng ca làm việc</span>
        </div>
        <div class="stat-box stat-available">
          <span class="stat-number">{{ totalAvailableSlots() }}</span>
          <span class="stat-label">Chỗ khám còn trống</span>
        </div>
        <div class="stat-box stat-booked">
          <span class="stat-number">{{ totalBookedCount() }}</span>
          <span class="stat-label">Đã được đặt trước</span>
        </div>
      </div>

      <!-- Feedback Alerts -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType() === 'success' ? 'alert-success' : 'alert-danger'">
          <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
          <span>{{ alertMessage() }}</span>
          <button type="button" class="alert-close" (click)="alertMessage.set(null)">×</button>
        </div>
      }

      <!-- Schedules Table -->
      <div class="table-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách ca làm việc...</p>
          </div>
        } @else if (schedules().length === 0) {
          <div class="empty-state">
            <i class="bi bi-calendar-x"></i>
            <h3>Không có ca làm việc nào phù hợp</h3>
            <p>Hãy thay đổi bộ lọc hoặc đăng ký ca trực mới cho bác sĩ.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Ngày & Giờ</th>
                <th>Ca trực</th>
                <th>Bác sĩ phụ trách</th>
                <th>Phòng khám</th>
                <th>Lượng bệnh nhân (Đã đặt / Tối đa)</th>
                <th>Trạng thái</th>
                <th class="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (item of schedules(); track item.id) {
                <tr [class.row-cancelled]="item.status === 'CANCELLED'">
                  <td>
                    <div class="date-col">
                      <span class="work-date">{{ item.workDate }}</span>
                      <span class="work-time"><i class="bi bi-clock"></i> {{ item.startTime }} - {{ item.endTime }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getShiftBadgeClass(item.shiftType)">
                      {{ item.shiftType }}
                    </span>
                  </td>
                  <td>
                    <div class="doctor-col">
                      <strong>{{ item.doctorName }}</strong>
                      <span class="doctor-sub">{{ item.academicTitle || 'Bác sĩ' }} • {{ item.specialtyName }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="room-col">
                      <span class="room-badge">{{ item.roomNumber }}</span>
                      <span class="room-desc">{{ item.roomName }} (Tầng {{ item.floor }})</span>
                    </div>
                  </td>
                  <td>
                    <div class="capacity-col">
                      <div class="capacity-label">
                        <span>{{ item.currentBookedCount }} / {{ item.maxPatients }}</span>
                        <small>Còn {{ item.remainingSlots }} chỗ</small>
                      </div>
                      <div class="progress-bar-bg">
                        <div
                          class="progress-bar-fill"
                          [style.width.%]="(item.currentBookedCount / item.maxPatients) * 100"
                          [ngClass]="getCapacityColorClass(item.currentBookedCount, item.maxPatients)"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getStatusBadgeClass(item.status)">
                      {{ getStatusDisplayName(item.status) }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="row-actions">
                      @if (item.status !== 'CANCELLED') {
                        <button class="btn btn-sm btn-outline-warning" (click)="cancelSchedule(item)" title="Hủy ca trực">
                          <i class="bi bi-x-circle"></i> Hủy
                        </button>
                      }
                      <button class="btn btn-sm btn-outline-danger" (click)="deleteSchedule(item)" title="Xóa ca">
                        <i class="bi bi-trash3"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <!-- Modal Thêm Ca Làm Việc Mới -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-calendar-plus"></i> Đăng Ký Ca Làm Việc Bác Sĩ
              </h2>
              <button class="modal-close-btn" (click)="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="conflict-alert-box">
                <i class="bi bi-shield-check"></i>
                <small>Hệ thống tự động phát hiện xung đột: Ngăn chặn 1 bác sĩ trùng giờ ở 2 nơi, hoặc 2 bác sĩ trùng giờ trong cùng 1 phòng khám.</small>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label required">Bác sĩ phụ trách</label>
                  <select [(ngModel)]="formData.doctorId" class="form-control" required>
                    <option [ngValue]="null">-- Chọn bác sĩ --</option>
                    @for (doc of doctorList(); track doc.id) {
                      <option [ngValue]="doc.id">{{ doc.fullName }} ({{ doc.specialtyName }})</option>
                    }
                  </select>
                </div>
                <div class="form-group flex-1">
                  <label class="form-label required">Phòng khám điều trị</label>
                  <select [(ngModel)]="formData.examinationRoomId" class="form-control" required>
                    <option [ngValue]="null">-- Chọn phòng khám --</option>
                    @for (room of rooms(); track room.id) {
                      <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }} (Tầng {{ room.floor }})</option>
                    }
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label required">Ngày làm việc</label>
                  <input type="date" [(ngModel)]="formData.workDate" class="form-control" required />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Loại ca trực</label>
                  <select [(ngModel)]="formData.shiftType" class="form-control">
                    <option value="CA_SÁNG">Ca Sáng (07:30 - 12:00)</option>
                    <option value="CA_CHIỀU">Ca Chiều (13:30 - 17:30)</option>
                    <option value="CA_TỐI">Ca Tối (18:00 - 21:00)</option>
                    <option value="TỰ_DO">Khung giờ tùy chỉnh</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label required">Giờ bắt đầu</label>
                  <input type="time" [(ngModel)]="formData.startTime" class="form-control" required />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label required">Giờ kết thúc</label>
                  <input type="time" [(ngModel)]="formData.endTime" class="form-control" required />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label required">Số bệnh nhân tối đa</label>
                  <input type="number" [(ngModel)]="formData.maxPatients" min="1" max="100" class="form-control" required />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeModal()">Hủy bỏ</button>
              <button class="btn btn-primary" [disabled]="submitting() || !isFormValid()" (click)="saveSchedule()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang kiểm tra & lưu...
                } @else {
                  <i class="bi bi-check-circle"></i> Xác Nhận Xếp Ca
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .schedules-page {
      padding: 1.5rem 0 3rem;
      max-width: 1250px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background: var(--primary-100);
      color: var(--primary-800);
      font-size: 0.8rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.4rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 1rem;
    }

    .filters-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04);
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .filter-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .filter-actions {
      display: flex;
      justify-content: flex-end;
    }

    .stats-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-box {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary-800);
      line-height: 1.1;
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .stat-available .stat-number {
      color: #059669;
    }

    .stat-booked .stat-number {
      color: #d97706;
    }

    /* Table */
    .table-container {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      overflow-x: auto;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      text-align: left;
    }

    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .data-table td {
      padding: 0.95rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-main);
      vertical-align: middle;
    }

    .row-cancelled {
      opacity: 0.6;
      background: #fafafa;
    }

    .date-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .work-date {
      font-weight: 700;
      color: var(--text-main);
    }

    .work-time {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .doctor-col {
      display: flex;
      flex-direction: column;
    }

    .doctor-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .room-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .room-badge {
      font-family: monospace;
      font-weight: 700;
      background: var(--primary-50);
      color: var(--primary-700);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--primary-200);
    }

    .room-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .capacity-col {
      width: 180px;
    }

    .capacity-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
    }

    .progress-bar-bg {
      height: 6px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.3s;
    }

    .cap-green { background: #10b981; }
    .cap-orange { background: #f59e0b; }
    .cap-red { background: #ef4444; }

    .badge-shift-morning {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }

    .badge-shift-afternoon {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .badge-shift-evening {
      background: #f3e8ff;
      color: #7e22ce;
      border: 1px solid #e9d5ff;
    }

    .badge-status-available {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .badge-status-full {
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #ffedd5;
    }

    .badge-status-cancelled {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .row-actions {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .text-right { text-align: right; }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 650px;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 1.75rem;
      line-height: 1;
      color: var(--text-muted);
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
      max-height: 70vh;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
    }

    .conflict-alert-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 1.25rem;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .flex-1 { flex: 1; }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.4rem;
    }

    .form-label.required::after {
      content: ' *';
      color: var(--rose-600);
    }

    .form-control {
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-state i {
      font-size: 3rem;
      color: var(--text-muted);
    }

    .alert {
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-danger { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
    .alert-close { margin-left: auto; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: inherit; }
  `]
})
export class SchedulesComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly specialtyService = inject(SpecialtyService);

  readonly schedules = signal<WorkSchedule[]>([]);
  readonly rooms = signal<ExaminationRoom[]>([]);
  readonly specialties = signal<Specialty[]>([]);
  readonly doctorList = signal<any[]>([]);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showModal = signal(false);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  // Filters
  filterStartDate = new Date().toISOString().substring(0, 10);
  filterEndDate = '';
  filterRoomId: number | null = null;
  filterSpecialtyId: number | null = null;

  formData: WorkScheduleRequest = {
    doctorId: 0,
    examinationRoomId: 0,
    workDate: new Date().toISOString().substring(0, 10),
    shiftType: 'CA_SÁNG',
    startTime: '08:00',
    endTime: '12:00',
    maxPatients: 20
  };

  get totalAvailableSlots(): () => number {
    return () => this.schedules()
      .filter(s => s.status !== 'CANCELLED')
      .reduce((sum, s) => sum + s.remainingSlots, 0);
  }

  get totalBookedCount(): () => number {
    return () => this.schedules()
      .filter(s => s.status !== 'CANCELLED')
      .reduce((sum, s) => sum + s.currentBookedCount, 0);
  }

  ngOnInit(): void {
    this.loadRooms();
    this.loadSpecialties();
    this.loadSchedules();
  }

  loadRooms(): void {
    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.rooms.set(res.data);
        }
      }
    });
  }

  loadSpecialties(): void {
    this.specialtyService.getAllSpecialties().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.specialties.set(res.data);
          // Thu thập danh sách bác sĩ từ từng chuyên khoa
          const allDocs: any[] = [];
          res.data.forEach(spec => {
            this.specialtyService.getSpecialtyById(spec.id).subscribe({
              next: detailRes => {
                if (detailRes.success && detailRes.data) {
                  detailRes.data.doctors.forEach(d => {
                    allDocs.push({
                      id: d.id,
                      fullName: d.fullName,
                      specialtyName: spec.name
                    });
                  });
                  this.doctorList.set([...allDocs]);
                }
              }
            });
          });
        }
      }
    });
  }

  loadSchedules(): void {
    this.loading.set(true);
    this.scheduleService.getSchedules({
      startDate: this.filterStartDate || undefined,
      endDate: this.filterEndDate || undefined,
      roomId: this.filterRoomId || undefined,
      specialtyId: this.filterSpecialtyId || undefined
    }).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.schedules.set(res.data);
        }
        this.loading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải danh sách ca làm việc', 'danger');
        this.loading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.filterStartDate = new Date().toISOString().substring(0, 10);
    this.filterEndDate = '';
    this.filterRoomId = null;
    this.filterSpecialtyId = null;
    this.loadSchedules();
  }

  openAddModal(): void {
    this.formData = {
      doctorId: this.doctorList().length > 0 ? this.doctorList()[0].id : 0,
      examinationRoomId: this.rooms().length > 0 ? this.rooms()[0].id : 0,
      workDate: new Date().toISOString().substring(0, 10),
      shiftType: 'CA_SÁNG',
      startTime: '08:00',
      endTime: '12:00',
      maxPatients: 20
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  isFormValid(): boolean {
    return !!(
      this.formData.doctorId &&
      this.formData.examinationRoomId &&
      this.formData.workDate &&
      this.formData.startTime &&
      this.formData.endTime &&
      this.formData.maxPatients > 0
    );
  }

  saveSchedule(): void {
    if (!this.isFormValid()) return;

    this.submitting.set(true);
    this.scheduleService.createSchedule(this.formData).subscribe({
      next: () => {
        this.showAlert('Đăng ký ca làm việc thành công!', 'success');
        this.submitting.set(false);
        this.closeModal();
        this.loadSchedules();
      },
      error: err => {
        // Hiển thị lỗi xung đột lịch rất rõ ràng cho người dùng
        this.showAlert(err.error?.message || 'Lỗi khi xếp ca trực. Vui lòng kiểm tra lại giờ làm việc.', 'danger');
        this.submitting.set(false);
      }
    });
  }

  cancelSchedule(item: WorkSchedule): void {
    const reason = prompt('Nhập lý do hủy ca trực của bác sĩ ' + item.doctorName + ':', 'Bác sĩ có lịch công tác đột xuất');
    if (reason !== null) {
      this.scheduleService.cancelSchedule(item.id, reason).subscribe({
        next: () => {
          this.showAlert(`Đã hủy ca trực ngày ${item.workDate} thành công!`, 'success');
          this.loadSchedules();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Không thể hủy ca trực', 'danger');
        }
      });
    }
  }

  deleteSchedule(item: WorkSchedule): void {
    if (confirm(`Bạn có chắc muốn xóa vĩnh viễn ca làm việc ngày ${item.workDate} của bác sĩ ${item.doctorName}?`)) {
      this.scheduleService.deleteSchedule(item.id).subscribe({
        next: () => {
          this.showAlert('Đã xóa ca làm việc thành công!', 'success');
          this.loadSchedules();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Không thể xóa ca làm việc này.', 'danger');
        }
      });
    }
  }

  getShiftBadgeClass(shift: string): string {
    if (shift.includes('SÁNG')) return 'badge-shift-morning';
    if (shift.includes('CHIỀU')) return 'badge-shift-afternoon';
    return 'badge-shift-evening';
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'AVAILABLE') return 'badge-status-available';
    if (status === 'FULL') return 'badge-status-full';
    return 'badge-status-cancelled';
  }

  getStatusDisplayName(status: string): string {
    if (status === 'AVAILABLE') return 'Đang mở';
    if (status === 'FULL') return 'Đã đủ số';
    if (status === 'CANCELLED') return 'Đã hủy ca';
    return status;
  }

  getCapacityColorClass(current: number, max: number): string {
    const ratio = current / max;
    if (ratio < 0.6) return 'cap-green';
    if (ratio < 0.9) return 'cap-orange';
    return 'cap-red';
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
