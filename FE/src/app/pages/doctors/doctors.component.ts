import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoctorService } from '../../services/doctor.service';
import { SpecialtyService } from '../../services/specialty.service';
import { Doctor, DoctorRequest } from '../../models/doctor.model';
import { Specialty } from '../../models/specialty.model';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Bác sĩ</h1>
          <p class="page-subtitle">{{ doctors().length }} bác sĩ, {{ activeCount() }} đang hoạt động</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-lg"></i> Thêm bác sĩ
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
        <select class="filter-select" [(ngModel)]="filterSpecialtyId" (ngModelChange)="applyFilters()" aria-label="Lọc theo chuyên khoa">
          <option [ngValue]="null">Tất cả chuyên khoa</option>
          @for (sp of specialties(); track sp.id) {
            <option [ngValue]="sp.id">{{ sp.name }}</option>
          }
        </select>
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
            <p>Đang tải danh sách bác sĩ...</p>
          </div>
        } @else if (filteredDoctors().length === 0) {
          <div class="empty-state">
            <h3>Không có bác sĩ phù hợp</h3>
            <p>Thử đổi từ khoá hoặc bộ lọc.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Mã</th>
                  <th style="min-width: 240px;">Bác sĩ</th>
                  <th style="min-width: 170px;">Chuyên khoa</th>
                  <th style="min-width: 200px;">Liên hệ</th>
                  <th style="width: 110px; text-align: right;">Kinh nghiệm</th>
                  <th style="width: 120px;">Trạng thái</th>
                  <th style="width: 140px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedDoctors(); track item.id) {
                  <tr>
                    <td class="mono text-muted">{{ item.employeeCode || ('DOC' + item.id) }}</td>
                    <td>
                      <div class="doctor-cell">
                        <div class="avatar">{{ initials(item.fullName) }}</div>
                        <div class="doctor-meta">
                          <strong class="doctor-name">{{ item.fullName }}</strong>
                          <span class="doctor-sub">{{ item.academicTitle || 'Bác sĩ' }} · {{ item.username || '—' }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (item.specialtyName) {
                        {{ item.specialtyName }}
                      } @else {
                        <span class="text-muted">Chưa phân khoa</span>
                      }
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span>{{ item.email || '—' }}</span>
                        <span class="text-muted">{{ item.phoneNumber || '—' }}</span>
                      </div>
                    </td>
                    <td class="mono" style="text-align: right;">{{ item.yearsOfExperience ?? 0 }} năm</td>
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
              <span>
                {{ startIndex() }}–{{ endIndex() }} / {{ filteredDoctors().length }}
              </span>
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

      <!-- Modal thêm / sửa bác sĩ -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing() ? 'Sửa thông tin bác sĩ' : 'Thêm bác sĩ' }}</h2>
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
                  <input type="text" [(ngModel)]="formData.username" class="form-control" placeholder="vd: doctor_lan" [disabled]="isEditing()" autocomplete="off" />
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
                  <input type="email" [(ngModel)]="formData.email" class="form-control" placeholder="bacsi@clinic.com" />
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
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Trần Thị Lan" />
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

              <!-- Chuyên môn -->
              <h3 class="form-section-title">Chuyên môn</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Mã bác sĩ</label>
                  <input type="text" [(ngModel)]="formData.employeeCode" class="form-control" placeholder="Để trống để tự sinh (DOCxxx)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Chuyên khoa</label>
                  <select [(ngModel)]="formData.specialtyId" class="form-control">
                    <option [ngValue]="null">-- Chưa phân khoa --</option>
                    @for (sp of specialties(); track sp.id) {
                      <option [ngValue]="sp.id">{{ sp.name }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Học hàm / Học vị</label>
                  <input type="text" [(ngModel)]="formData.academicTitle" class="form-control" list="academicTitleOptions" placeholder="vd: Thạc sĩ, Bác sĩ CKI..." />
                  <datalist id="academicTitleOptions">
                    @for (t of academicTitleOptions; track t) {
                      <option [value]="t"></option>
                    }
                  </datalist>
                </div>
                <div class="form-group">
                  <label class="form-label">Chức vụ</label>
                  <input type="text" [(ngModel)]="formData.position" class="form-control" placeholder="Bác sĩ chuyên khoa" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số năm kinh nghiệm</label>
                  <input type="number" min="0" [(ngModel)]="formData.yearsOfExperience" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Thời gian khám TB (phút/lượt)</label>
                  <input type="number" min="1" [(ngModel)]="formData.averageConsultationTime" class="form-control" />
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày vào làm</label>
                  <input type="date" [(ngModel)]="formData.hireDate" class="form-control" />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Giới thiệu / Tiểu sử</label>
                  <textarea [(ngModel)]="formData.biography" rows="3" class="form-control" placeholder="Quá trình công tác, thế mạnh chuyên môn..."></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveDoctor()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  {{ isEditing() ? 'Lưu thay đổi' : 'Thêm bác sĩ' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Chi Tiết Hồ Sơ Bác Sĩ -->
      @if (selectedDoctor(); as doc) {
        <div class="modal-backdrop" (click)="selectedDoctor.set(null)">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Hồ sơ bác sĩ</h2>
              <button class="modal-close-btn" (click)="selectedDoctor.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-head">
                <div class="avatar avatar-lg">{{ initials(doc.fullName) }}</div>
                <div>
                  <h3 class="detail-name">{{ doc.academicTitle ? doc.academicTitle + ' ' : '' }}{{ doc.fullName }}</h3>
                  <div class="detail-tags">
                    <span class="mono text-muted">{{ doc.employeeCode || ('DOC' + doc.id) }}</span>
                    @if (doc.specialtyName) {
                      <span>{{ doc.specialtyName }}</span>
                    }
                    @if (doc.status === 'LOCKED') {
                      <span class="status danger">Đã khóa</span>
                    } @else {
                      <span class="status success">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>
              <dl class="detail-grid">
                <dt>Tên đăng nhập</dt><dd>{{ doc.username || '—' }}</dd>
                <dt>Email</dt><dd>{{ doc.email || '—' }}</dd>
                <dt>Số điện thoại</dt><dd>{{ doc.phoneNumber || '—' }}</dd>
                <dt>Giới tính</dt><dd>{{ doc.gender || '—' }}</dd>
                <dt>Ngày sinh</dt><dd>{{ doc.dateOfBirth ? (doc.dateOfBirth | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Số CCCD/CMND</dt><dd>{{ doc.nationalId || '—' }}</dd>
                <dt>Địa chỉ</dt><dd>{{ doc.address || '—' }}</dd>
                <dt>Chức vụ</dt><dd>{{ doc.position || '—' }}</dd>
                <dt>Kinh nghiệm</dt><dd>{{ doc.yearsOfExperience ?? 0 }} năm</dd>
                <dt>Thời gian khám TB</dt><dd>{{ doc.averageConsultationTime || 15 }} phút/lượt</dd>
                <dt>Ngày vào làm</dt><dd>{{ doc.hireDate ? (doc.hireDate | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Ngày tạo tài khoản</dt><dd>{{ doc.createdAt ? (doc.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd>
              </dl>
              <div class="detail-bio">
                <strong>Giới thiệu</strong>
                <p>{{ doc.biography || 'Chưa có thông tin giới thiệu.' }}</p>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="selectedDoctor.set(null)">Đóng</button>
              <button class="btn btn-primary" (click)="editFromDetail(doc)">Chỉnh sửa</button>
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

    .doctor-cell {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .doctor-meta {
      display: flex;
      flex-direction: column;
      line-height: 1.35;
    }

    .doctor-name { font-weight: 500; }

    .doctor-sub {
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
export class DoctorsComponent implements OnInit {
  private readonly doctorService = inject(DoctorService);
  private readonly specialtyService = inject(SpecialtyService);

  readonly doctors = signal<Doctor[]>([]);
  readonly filteredDoctors = signal<Doctor[]>([]);
  readonly specialties = signal<Specialty[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly selectedDoctor = signal<Doctor | null>(null);
  readonly formError = signal<string | null>(null);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  readonly academicTitleOptions = [
    'Bác sĩ', 'Bác sĩ Chuyên khoa I', 'Bác sĩ Chuyên khoa II', 'Thạc sĩ', 'Tiến sĩ', 'Phó Giáo sư', 'Giáo sư'
  ];

  searchKeyword = '';
  filterSpecialtyId: number | null = null;
  filterStatus = '';
  editingId: number | null = null;
  formData: DoctorRequest = this.emptyForm();

  readonly activeCount = computed(() => this.doctors().filter(d => d.status !== 'LOCKED').length);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 20];

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredDoctors().length / this.pageSize())));

  readonly paginatedDoctors = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredDoctors().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    if (this.filteredDoctors().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => Math.min(this.currentPage() * this.pageSize(), this.filteredDoctors().length));

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
    this.loadSpecialties();
    this.loadDoctors();
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

  loadSpecialties(): void {
    this.specialtyService.getAllSpecialties().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.specialties.set(res.data);
        }
      }
    });
  }

  loadDoctors(): void {
    this.loading.set(true);
    this.doctorService.getDoctors().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.doctors.set(res.data);
          this.applyFilters(false);
        }
        this.loading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải danh sách bác sĩ', 'danger');
        this.loading.set(false);
      }
    });
  }

  applyFilters(resetPage = true): void {
    const kw = this.searchKeyword.trim().toLowerCase();
    const filtered = this.doctors().filter(d => {
      if (this.filterSpecialtyId && d.specialtyId !== this.filterSpecialtyId) return false;
      if (this.filterStatus && (d.status || 'ACTIVE') !== this.filterStatus) return false;
      if (!kw) return true;
      return [d.fullName, d.employeeCode, d.username, d.email, d.phoneNumber]
        .some(v => v && v.toLowerCase().includes(kw));
    });
    this.filteredDoctors.set(filtered);
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

  openEditModal(item: Doctor): void {
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
      hireDate: item.hireDate || '',
      specialtyId: item.specialtyId ?? null,
      academicTitle: item.academicTitle || '',
      yearsOfExperience: item.yearsOfExperience ?? null,
      averageConsultationTime: item.averageConsultationTime ?? 15,
      biography: item.biography || ''
    };
    this.formError.set(null);
    this.showModal.set(true);
  }

  editFromDetail(item: Doctor): void {
    this.selectedDoctor.set(null);
    this.openEditModal(item);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveDoctor(): void {
    const error = this.validateForm();
    if (error) {
      this.formError.set(error);
      return;
    }
    this.formError.set(null);
    this.submitting.set(true);

    const payload = this.buildPayload();
    const request$ = this.isEditing() && this.editingId
      ? this.doctorService.updateDoctor(this.editingId, payload)
      : this.doctorService.createDoctor(payload);

    request$.subscribe({
      next: () => {
        this.showAlert(this.isEditing() ? 'Đã cập nhật hồ sơ bác sĩ thành công!' : 'Đã thêm bác sĩ mới thành công!', 'success');
        this.submitting.set(false);
        this.closeModal();
        this.loadDoctors();
      },
      error: err => {
        this.formError.set(err.error?.message || 'Không thể lưu thông tin bác sĩ');
        this.submitting.set(false);
      }
    });
  }

  viewDetail(item: Doctor): void {
    this.selectedDoctor.set(item);
  }

  toggleStatus(item: Doctor): void {
    const locking = item.status !== 'LOCKED';
    const question = locking
      ? `Khóa tài khoản của bác sĩ "${item.fullName}"? Bác sĩ sẽ không thể đăng nhập cho đến khi được mở khóa.`
      : `Mở khóa tài khoản của bác sĩ "${item.fullName}"?`;
    if (!confirm(question)) return;

    this.doctorService.updateStatus(item.id, locking ? 'LOCKED' : 'ACTIVE').subscribe({
      next: () => {
        this.showAlert(locking ? `Đã khóa tài khoản "${item.fullName}"` : `Đã mở khóa tài khoản "${item.fullName}"`, 'success');
        this.loadDoctors();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể cập nhật trạng thái tài khoản', 'danger');
      }
    });
  }

  confirmDelete(item: Doctor): void {
    if (!confirm(`Bạn có chắc chắn muốn xóa bác sĩ "${item.fullName}" và tài khoản đăng nhập đi kèm?`)) return;

    this.doctorService.deleteDoctor(item.id).subscribe({
      next: () => {
        this.showAlert(`Đã xóa bác sĩ "${item.fullName}" thành công!`, 'success');
        this.loadDoctors();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể xóa bác sĩ này.', 'danger');
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
    if (!f.fullName || !f.fullName.trim()) return 'Vui lòng nhập họ và tên bác sĩ';
    if (f.yearsOfExperience != null && f.yearsOfExperience < 0) return 'Số năm kinh nghiệm không hợp lệ';
    if (f.averageConsultationTime != null && f.averageConsultationTime < 1) return 'Thời gian khám trung bình phải lớn hơn 0';
    return null;
  }

  // Chuyển chuỗi rỗng thành undefined để backend hiểu là "không nhập"
  private buildPayload(): DoctorRequest {
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
      hireDate: clean(f.hireDate),
      specialtyId: f.specialtyId ?? null,
      academicTitle: clean(f.academicTitle),
      yearsOfExperience: f.yearsOfExperience ?? null,
      averageConsultationTime: f.averageConsultationTime ?? null,
      biography: clean(f.biography)
    };
  }

  private emptyForm(): DoctorRequest {
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
      hireDate: '',
      specialtyId: null,
      academicTitle: '',
      yearsOfExperience: null,
      averageConsultationTime: 15,
      biography: ''
    };
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
