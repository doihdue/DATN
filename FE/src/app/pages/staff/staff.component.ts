import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StaffService } from '../../services/staff.service';
import { Staff, StaffRequest } from '../../models/staff.model';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lễ tân</h1>
          <p class="page-subtitle">{{ staffList().length }} lễ tân, {{ activeCount() }} đang hoạt động</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-lg"></i> Thêm lễ tân
          </button>
        </div>
      </div>

      <div class="panel">
      <div class="toolbar">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            type="text"
            [(ngModel)]="searchKeyword"
            (ngModelChange)="applyFilters()"
            placeholder="Tìm theo tên, mã, tài khoản, email, số điện thoại"
            class="search-input"
          />
        </div>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" aria-label="Lọc theo trạng thái">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
      </div>

      <!-- Feedback Alerts (Top-Right Floating Toast) -->
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
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" title="Đóng thông báo" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <div>
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách lễ tân...</p>
          </div>
        } @else if (filteredStaff().length === 0) {
          <div class="empty-state">
            <h3>Không có lễ tân phù hợp</h3>
            <p>Thử đổi từ khoá hoặc bộ lọc.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Mã</th>
                  <th style="min-width: 240px;">Lễ tân</th>
                  <th style="min-width: 190px;">Chức vụ</th>
                  <th style="min-width: 200px;">Liên hệ</th>
                  <th style="width: 120px;">Ngày vào làm</th>
                  <th style="width: 120px;">Trạng thái</th>
                  <th style="width: 140px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedStaff(); track item.id) {
                  <tr>
                    <td class="mono text-muted">{{ item.employeeCode || ('STF' + item.id) }}</td>
                    <td>
                      <div class="person-cell">
                        <div class="avatar">{{ initials(item.fullName) }}</div>
                        <div class="person-meta">
                          <strong class="person-name">{{ item.fullName }}</strong>
                          <span class="person-sub">{{ item.username || '—' }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ item.position || 'Nhân viên tiếp đón & lễ tân' }}</td>
                    <td>
                      <div class="contact-cell">
                        <span>{{ item.email || '—' }}</span>
                        <span class="text-muted">{{ item.phoneNumber || '—' }}</span>
                      </div>
                    </td>
                    <td class="mono">{{ item.hireDate ? (item.hireDate | date:'dd/MM/yyyy') : '—' }}</td>
                    <td>
                      @if (item.status === 'LOCKED') {
                        <span class="status danger">Đã khóa</span>
                      } @else {
                        <span class="status success">Hoạt động</span>
                      }
                    </td>
                    <td>
                      <div class="row-actions">
                        <button class="icon-btn" (click)="viewDetail(item)" title="Xem hồ sơ" aria-label="Xem hồ sơ">
                          <i class="bi bi-eye"></i>
                        </button>
                        <button class="icon-btn" (click)="openEditModal(item)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="icon-btn" (click)="toggleStatus(item)"
                                [title]="item.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'"
                                [attr.aria-label]="item.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'">
                          <i class="bi" [ngClass]="item.status === 'LOCKED' ? 'bi-unlock' : 'bi-lock'"></i>
                        </button>
                        <button class="icon-btn danger" (click)="confirmDelete(item)" title="Xóa" aria-label="Xóa">
                          <i class="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-footer">
            <div class="pagination-info">
              <span>{{ startIndex() }}–{{ endIndex() }} / {{ filteredStaff().length }}</span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng</label>
                <select
                  id="pageSizeSelect"
                  [ngModel]="pageSize()"
                  (ngModelChange)="onPageSizeChange($event)"
                  class="form-select-sm"
                >
                  @for (opt of pageSizeOptions; track opt) {
                    <option [ngValue]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pagination-controls">
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Về trang đầu tiên">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)" title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>
              <div class="page-numbers-group">
                @for (p of pagesList(); track p) {
                  <button class="btn-page btn-page-num" [class.active]="currentPage() === p" (click)="goToPage(p)">
                    {{ p }}
                  </button>
                }
              </div>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)" title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Đến trang cuối cùng">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      </div>

      <!-- Modal thêm / sửa lễ tân -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing() ? 'Sửa thông tin lễ tân' : 'Thêm lễ tân' }}</h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error">{{ formError() }}</div>
              }

              <!-- Tài khoản -->
              <h3 class="form-section-title">Tài khoản đăng nhập</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" [class.required]="!isEditing()">Tên đăng nhập</label>
                  <input type="text" [(ngModel)]="formData.username" class="form-control" placeholder="vd: staff_hoa" [disabled]="isEditing()" autocomplete="off" />
                  @if (isEditing()) {
                    <small class="form-hint">Không thể thay đổi tên đăng nhập.</small>
                  }
                </div>
                <div class="form-group">
                  <label class="form-label" [class.required]="!isEditing()">{{ isEditing() ? 'Đặt lại mật khẩu' : 'Mật khẩu' }}</label>
                  <input type="password" [(ngModel)]="formData.password" class="form-control" [placeholder]="isEditing() ? 'Để trống nếu giữ nguyên' : 'Tối thiểu 6 ký tự'" autocomplete="new-password" />
                </div>
                <div class="form-group">
                  <label class="form-label required">Email</label>
                  <input type="email" [(ngModel)]="formData.email" class="form-control" placeholder="letan@clinic.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số điện thoại</label>
                  <input type="tel" [(ngModel)]="formData.phoneNumber" class="form-control" placeholder="09xxxxxxxx" />
                </div>
              </div>

              <!-- Thông tin cá nhân -->
              <h3 class="form-section-title">Thông tin cá nhân</h3>
              <div class="form-grid">
                <div class="form-group form-group-full">
                  <label class="form-label required">Họ và tên</label>
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Phạm Thị Hoa" />
                </div>
                <div class="form-group">
                  <label class="form-label">Giới tính</label>
                  <select [(ngModel)]="formData.gender" class="form-control">
                    <option value="">-- Chọn --</option>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày sinh</label>
                  <input type="date" [(ngModel)]="formData.dateOfBirth" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số CCCD/CMND</label>
                  <input type="text" [(ngModel)]="formData.nationalId" class="form-control" placeholder="12 chữ số" />
                </div>
                <div class="form-group">
                  <label class="form-label">Địa chỉ</label>
                  <input type="text" [(ngModel)]="formData.address" class="form-control" placeholder="Tỉnh/Thành phố..." />
                </div>
              </div>

              <!-- Nhân sự -->
              <h3 class="form-section-title">Thông tin nhân sự</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Mã nhân viên</label>
                  <input type="text" [(ngModel)]="formData.employeeCode" class="form-control" placeholder="Để trống để tự sinh (STFxxx)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày vào làm</label>
                  <input type="date" [(ngModel)]="formData.hireDate" class="form-control" />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Chức vụ</label>
                  <input type="text" [(ngModel)]="formData.position" class="form-control" list="positionOptions" placeholder="Nhân viên tiếp đón & lễ tân" />
                  <datalist id="positionOptions">
                    @for (p of positionOptions; track p) {
                      <option [value]="p"></option>
                    }
                  </datalist>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveStaff()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  {{ isEditing() ? 'Lưu thay đổi' : 'Thêm lễ tân' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal hồ sơ lễ tân -->
      @if (selectedStaff(); as st) {
        <div class="modal-backdrop" (click)="selectedStaff.set(null)">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Hồ sơ lễ tân</h2>
              <button class="modal-close-btn" (click)="selectedStaff.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-head">
                <div class="avatar avatar-lg">{{ initials(st.fullName) }}</div>
                <div>
                  <h3 class="detail-name">{{ st.fullName }}</h3>
                  <div class="detail-tags">
                    <span class="mono text-muted">{{ st.employeeCode || ('STF' + st.id) }}</span>
                    <span>{{ st.position || 'Nhân viên tiếp đón & lễ tân' }}</span>
                    @if (st.status === 'LOCKED') {
                      <span class="status danger">Đã khóa</span>
                    } @else {
                      <span class="status success">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>
              <dl class="detail-grid">
                <dt>Tên đăng nhập</dt><dd>{{ st.username || '—' }}</dd>
                <dt>Email</dt><dd>{{ st.email || '—' }}</dd>
                <dt>Số điện thoại</dt><dd>{{ st.phoneNumber || '—' }}</dd>
                <dt>Giới tính</dt><dd>{{ st.gender || '—' }}</dd>
                <dt>Ngày sinh</dt><dd>{{ st.dateOfBirth ? (st.dateOfBirth | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Số CCCD/CMND</dt><dd>{{ st.nationalId || '—' }}</dd>
                <dt>Địa chỉ</dt><dd>{{ st.address || '—' }}</dd>
                <dt>Ngày vào làm</dt><dd>{{ st.hireDate ? (st.hireDate | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Ngày tạo tài khoản</dt><dd>{{ st.createdAt ? (st.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd>
              </dl>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="selectedStaff.set(null)">Đóng</button>
              <button class="btn btn-primary" (click)="editFromDetail(st)">Chỉnh sửa</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toolbar .search-box {
      position: relative;
      flex: 1 1 280px;
      max-width: 420px;
    }

    .search-box i {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-light);
      font-size: 14px;
    }

    .search-input,
    .filter-select {
      height: 34px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
    }

    .search-input {
      width: 100%;
      padding: 0 10px 0 32px;
    }

    .filter-select {
      padding: 0 8px;
      min-width: 170px;
    }

    .search-input:focus,
    .filter-select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .table-responsive { overflow-x: auto; }
    .data-table td.text-muted { color: var(--text-muted); }
    .data-table td.mono { white-space: nowrap; }

    .person-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .person-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.35;
    }

    .person-name { font-weight: 500; }

    .person-sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      font-size: 13px;
      line-height: 1.45;
    }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 2px;
    }

    .loading-state,
    .empty-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state h3 {
      font-size: 15px;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 16px;
      border-top: 1px solid var(--border-color);
      font-size: 13px;
      color: var(--text-muted);
    }

    .pagination-info,
    .page-size-selector,
    .pagination-controls,
    .page-numbers-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination-info { gap: 16px; }
    .pagination-controls, .page-numbers-group { gap: 4px; }

    .form-select-sm {
      height: 28px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 13px;
      padding: 0 6px;
      background: #ffffff;
    }

    .btn-page {
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: #ffffff;
      color: var(--text-secondary);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-page:hover:not(:disabled) { background: var(--bg-hover); }
    .btn-page:disabled { opacity: 0.45; cursor: not-allowed; }

    .btn-page.active {
      background: var(--primary-600);
      border-color: var(--primary-600);
      color: #ffffff;
    }

    /* Modal */
    .modal-lg { max-width: 760px; width: 100%; }

    .form-section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      margin: 20px 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }

    .form-section-title:first-of-type { margin-top: 0; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-group-full { grid-column: 1 / -1; }

    .form-control:disabled {
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    .form-error {
      padding: 8px 12px;
      margin-bottom: 12px;
      border: 1px solid var(--danger-border);
      background: var(--danger-bg);
      color: var(--danger-text);
      border-radius: var(--radius-md);
      font-size: 13px;
    }

    .detail-head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 16px;
    }

    .avatar-lg {
      width: 48px;
      height: 48px;
      font-size: 16px;
    }

    .detail-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .detail-tags {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 160px 1fr 160px 1fr;
      gap: 8px 16px;
      font-size: 14px;
      margin: 0;
    }

    .detail-grid dt { color: var(--text-muted); }
    .detail-grid dd { margin: 0; }

    .detail-bio {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      font-size: 14px;
    }

    .detail-bio p {
      margin-top: 4px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 120px 1fr; }
    }
  `]
})
export class StaffComponent implements OnInit {
  private readonly staffService = inject(StaffService);

  readonly staffList = signal<Staff[]>([]);
  readonly filteredStaff = signal<Staff[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly selectedStaff = signal<Staff | null>(null);
  readonly formError = signal<string | null>(null);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  readonly positionOptions = [
    'Nhân viên Tiếp đón & Lễ tân', 'Trưởng nhóm Lễ tân', 'Nhân viên Điều phối hàng đợi', 'Nhân viên Thu ngân'
  ];

  searchKeyword = '';
  filterStatus = '';
  editingId: number | null = null;
  formData: StaffRequest = this.emptyForm();

  readonly activeCount = computed(() => this.staffList().filter(s => s.status !== 'LOCKED').length);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 20];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredStaff().length / this.pageSize())));

  readonly paginatedStaff = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredStaff().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    if (this.filteredStaff().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredStaff().length));

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const curr = this.currentPage();
    const maxVisible = 5;

    let start = Math.max(1, curr - Math.floor(maxVisible / 2));
    const end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadStaff();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  loadStaff(): void {
    this.loading.set(true);
    this.staffService.getStaff().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.staffList.set(res.data);
          this.applyFilters(false);
        }
        this.loading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải danh sách lễ tân', 'danger');
        this.loading.set(false);
      }
    });
  }

  applyFilters(resetPage = true): void {
    const kw = this.searchKeyword.trim().toLowerCase();
    const filtered = this.staffList().filter(s => {
      if (this.filterStatus && (s.status || 'ACTIVE') !== this.filterStatus) return false;
      if (!kw) return true;
      return [s.fullName, s.employeeCode, s.username, s.email, s.phoneNumber]
        .some(v => v && v.toLowerCase().includes(kw));
    });
    this.filteredStaff.set(filtered);
    if (resetPage) {
      this.currentPage.set(1);
    } else if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const last = parts[parts.length - 1][0];
    return parts.length > 1 ? (parts[parts.length - 2][0] + last).toUpperCase() : last.toUpperCase();
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = this.emptyForm();
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEditModal(item: Staff): void {
    this.isEditing.set(true);
    this.editingId = item.id;
    this.formData = {
      username: item.username || '',
      password: '',
      email: item.email || '',
      phoneNumber: item.phoneNumber || '',
      fullName: item.fullName,
      gender: item.gender || '',
      dateOfBirth: item.dateOfBirth || '',
      address: item.address || '',
      nationalId: item.nationalId || '',
      employeeCode: item.employeeCode || '',
      position: item.position || '',
      hireDate: item.hireDate || ''
    };
    this.formError.set(null);
    this.showModal.set(true);
  }

  editFromDetail(item: Staff): void {
    this.selectedStaff.set(null);
    this.openEditModal(item);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveStaff(): void {
    const error = this.validateForm();
    if (error) {
      this.formError.set(error);
      return;
    }
    this.formError.set(null);
    this.submitting.set(true);

    const payload = this.buildPayload();
    const request$ = this.isEditing() && this.editingId
      ? this.staffService.updateStaff(this.editingId, payload)
      : this.staffService.createStaff(payload);

    request$.subscribe({
      next: () => {
        this.showAlert(this.isEditing() ? 'Đã cập nhật hồ sơ lễ tân thành công!' : 'Đã thêm lễ tân mới thành công!', 'success');
        this.submitting.set(false);
        this.closeModal();
        this.loadStaff();
      },
      error: err => {
        this.formError.set(err.error?.message || 'Không thể lưu thông tin lễ tân');
        this.submitting.set(false);
      }
    });
  }

  viewDetail(item: Staff): void {
    this.selectedStaff.set(item);
  }

  toggleStatus(item: Staff): void {
    const locking = item.status !== 'LOCKED';
    const question = locking
      ? `Khóa tài khoản của lễ tân "${item.fullName}"? Nhân viên sẽ không thể đăng nhập cho đến khi được mở khóa.`
      : `Mở khóa tài khoản của lễ tân "${item.fullName}"?`;
    if (!confirm(question)) return;

    this.staffService.updateStatus(item.id, locking ? 'LOCKED' : 'ACTIVE').subscribe({
      next: () => {
        this.showAlert(locking ? `Đã khóa tài khoản "${item.fullName}"` : `Đã mở khóa tài khoản "${item.fullName}"`, 'success');
        this.loadStaff();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể cập nhật trạng thái tài khoản', 'danger');
      }
    });
  }

  confirmDelete(item: Staff): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa lễ tân "${item.fullName}" và tài khoản đăng nhập đi kèm?`)) return;

    this.staffService.deleteStaff(item.id).subscribe({
      next: () => {
        this.showAlert(`Đã xóa lễ tân "${item.fullName}" thành công!`, 'success');
        this.loadStaff();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể xóa lễ tân này.', 'danger');
      }
    });
  }

  private validateForm(): string | null {
    const f = this.formData;
    if (!this.isEditing()) {
      if (!f.username || f.username.trim().length < 3) return 'Tên đăng nhập phải có ít nhất 3 ký tự';
      if (!f.password || f.password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    } else if (f.password && f.password.length < 6) {
      return 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    if (!f.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return 'Email không hợp lệ';
    if (!f.fullName || !f.fullName.trim()) return 'Vui lòng nhập họ và tên lễ tân';
    return null;
  }

  // Chuyển chuỗi rỗng thành undefined để backend hiểu là "không nhập"
  private buildPayload(): StaffRequest {
    const clean = (v?: string | null) => (v && v.trim() ? v.trim() : undefined);
    const f = this.formData;
    return {
      username: this.isEditing() ? undefined : clean(f.username),
      password: f.password ? f.password : undefined,
      email: f.email.trim(),
      phoneNumber: clean(f.phoneNumber),
      fullName: f.fullName.trim(),
      gender: clean(f.gender),
      dateOfBirth: clean(f.dateOfBirth),
      address: clean(f.address),
      nationalId: clean(f.nationalId),
      employeeCode: clean(f.employeeCode),
      position: clean(f.position),
      hireDate: clean(f.hireDate)
    };
  }

  private emptyForm(): StaffRequest {
    return {
      username: '',
      password: '',
      email: '',
      phoneNumber: '',
      fullName: '',
      gender: '',
      dateOfBirth: '',
      address: '',
      nationalId: '',
      employeeCode: '',
      position: '',
      hireDate: ''
    };
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
