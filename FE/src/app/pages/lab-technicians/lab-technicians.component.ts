import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabTechnicianService } from '../../services/lab-technician.service';
import { LabTechnician, LabTechnicianRequest, LabTechnicianStatus } from '../../models/lab-technician.model';

@Component({
  selector: 'app-lab-technicians',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Kỹ thuật viên</h1>
          <p class="page-subtitle">{{ technicianList().length }} kỹ thuật viên, {{ activeCount() }} đang hoạt động</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-lg"></i> Thêm kỹ thuật viên
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
          @if (searchKeyword) {
            <button type="button" class="btn-clear-search" (click)="clearSearch()" title="Xóa từ khóa" aria-label="Xóa từ khóa">
              <i class="bi bi-x-lg"></i>
            </button>
          }
        </div>
        <select class="filter-select" [(ngModel)]="filterDepartment" (ngModelChange)="applyFilters()" aria-label="Lọc theo bộ phận">
          <option value="">Tất cả bộ phận</option>
          <option value="XET_NGHIEM">Xét nghiệm</option>
          <option value="CHAN_DOAN_HINH_ANH">Chẩn đoán hình ảnh</option>
        </select>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" aria-label="Lọc theo trạng thái">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
        <div class="quick-filters">
          <button type="button" class="quick-filter" [class.active]="!filterDepartment && !filterStatus" (click)="setQuickFilter('', '')">
            Tất cả <span class="mono">{{ technicianList().length }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterDepartment === 'XET_NGHIEM'" (click)="setQuickFilter('XET_NGHIEM', filterStatus)">
            Xét nghiệm <span class="mono">{{ labCount() }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterDepartment === 'CHAN_DOAN_HINH_ANH'" (click)="setQuickFilter('CHAN_DOAN_HINH_ANH', filterStatus)">
            CĐHA <span class="mono">{{ imagingCount() }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterStatus === 'ACTIVE'" (click)="setQuickFilter(filterDepartment, 'ACTIVE')">
            Hoạt động <span class="mono">{{ activeCount() }}</span>
          </button>
        </div>
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
            <p>Đang tải danh sách kỹ thuật viên...</p>
          </div>
        } @else if (filteredTechnicians().length === 0) {
          <div class="empty-state">
            <h3>Không có kỹ thuật viên phù hợp</h3>
            <p>Thử đổi từ khoá hoặc bộ lọc.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Mã</th>
                  <th style="min-width: 240px;">Kỹ thuật viên</th>
                  <th style="min-width: 150px;">Bộ phận</th>
                  <th style="min-width: 180px;">Chức vụ</th>
                  <th style="min-width: 200px;">Liên hệ</th>
                  <th style="width: 120px;">Ngày vào làm</th>
                  <th style="width: 120px;">Trạng thái</th>
                  <th style="width: 140px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedTechnicians(); track item.id) {
                  <tr>
                    <td class="mono text-muted">{{ item.employeeCode || ('KTV' + item.id) }}</td>
                    <td>
                      <div class="person-cell">
                        <div class="avatar">{{ initials(item.fullName) }}</div>
                        <div class="person-meta">
                          <strong class="person-name">{{ item.fullName }}</strong>
                          <span class="person-sub">{{ item.username || '—' }}</span>
                        </div>
                      </div>
                    </td>
                    <td>{{ item.department === 'CHAN_DOAN_HINH_ANH' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm' }}</td>
                    <td>{{ item.position || (item.department === 'CHAN_DOAN_HINH_ANH' ? 'KTV chẩn đoán hình ảnh' : 'KTV xét nghiệm') }}</td>
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
              <span>{{ startIndex() }}–{{ endIndex() }} / {{ filteredTechnicians().length }}</span>
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

      <!-- Modal thêm / sửa kỹ thuật viên -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing() ? 'Sửa thông tin kỹ thuật viên' : 'Thêm kỹ thuật viên' }}</h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error">{{ formError() }}</div>
              }

              <!-- Tài khoản đăng nhập -->
              <h3 class="form-section-title">Tài khoản đăng nhập</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" [class.required]="!isEditing()">Tên đăng nhập</label>
                  <input type="text" [(ngModel)]="formData.username" class="form-control" placeholder="vd: ktv_lan" [disabled]="isEditing()" autocomplete="off" />
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
                  <input type="email" [(ngModel)]="formData.email" class="form-control" placeholder="ktv@clinic.com" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số điện thoại</label>
                  <input type="tel" [(ngModel)]="formData.phoneNumber" class="form-control" placeholder="09xxxxxxxx" />
                </div>
              </div>

              <!-- Chuyên môn & nhân sự -->
              <h3 class="form-section-title">Chuyên môn</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">Bộ phận</label>
                  <select [(ngModel)]="formData.department" class="form-control" (ngModelChange)="onDepartmentChange($event)">
                    <option value="XET_NGHIEM">Xét nghiệm</option>
                    <option value="CHAN_DOAN_HINH_ANH">Chẩn đoán hình ảnh (X-quang, siêu âm, CT)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Chức danh</label>
                  <input type="text" [(ngModel)]="formData.position" class="form-control" placeholder="vd: KTV xét nghiệm" />
                </div>
                <div class="form-group">
                  <label class="form-label">Mã nhân viên</label>
                  <input type="text" [(ngModel)]="formData.employeeCode" class="form-control" placeholder="Để trống để tự sinh (KTVxxx)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày vào làm</label>
                  <input type="date" [(ngModel)]="formData.hireDate" class="form-control" />
                </div>
              </div>

              <!-- Thông tin cá nhân -->
              <h3 class="form-section-title">Thông tin cá nhân</h3>
              <div class="form-grid">
                <div class="form-group form-group-full">
                  <label class="form-label required">Họ và tên</label>
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Nguyễn Thị Mai" />
                </div>
                <div class="form-group">
                  <label class="form-label">Giới tính</label>
                  <select [(ngModel)]="formData.gender" class="form-control">
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
                  <label class="form-label">Ảnh đại diện (URL)</label>
                  <input type="text" [(ngModel)]="formData.avatarUrl" class="form-control" placeholder="https://..." />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Địa chỉ</label>
                  <input type="text" [(ngModel)]="formData.address" class="form-control" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" />
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()" [disabled]="submitting()">Hủy</button>
              <button class="btn btn-primary" (click)="saveTechnician()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  {{ isEditing() ? 'Lưu thay đổi' : 'Thêm kỹ thuật viên' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal hồ sơ KTV -->
      @if (showDetailModal() && selectedKtv()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Hồ sơ kỹ thuật viên</h2>
              <button class="modal-close-btn" (click)="closeDetailModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-head">
                <div class="avatar avatar-lg">{{ initials(selectedKtv()!.fullName) }}</div>
                <div>
                  <h3 class="detail-name">{{ selectedKtv()!.fullName }}</h3>
                  <div class="detail-tags">
                    <span class="mono text-muted">{{ selectedKtv()!.employeeCode || ('KTV' + selectedKtv()!.id) }}</span>
                    <span>{{ selectedKtv()!.department === 'CHAN_DOAN_HINH_ANH' ? 'Chẩn đoán hình ảnh' : 'Xét nghiệm' }}</span>
                    @if (selectedKtv()!.status === 'LOCKED') {
                      <span class="status danger">Đã khóa</span>
                    } @else {
                      <span class="status success">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>
              <dl class="detail-grid">
                <dt>Tên đăng nhập</dt><dd>{{ selectedKtv()!.username || '—' }}</dd>
                <dt>Chức vụ</dt><dd>{{ selectedKtv()!.position || '—' }}</dd>
                <dt>Email</dt><dd>{{ selectedKtv()!.email || '—' }}</dd>
                <dt>Số điện thoại</dt><dd>{{ selectedKtv()!.phoneNumber || '—' }}</dd>
                <dt>Giới tính</dt><dd>{{ selectedKtv()!.gender || '—' }}</dd>
                <dt>Ngày sinh</dt><dd>{{ selectedKtv()!.dateOfBirth ? (selectedKtv()!.dateOfBirth | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Số CCCD/CMND</dt><dd>{{ selectedKtv()!.nationalId || '—' }}</dd>
                <dt>Ngày vào làm</dt><dd>{{ selectedKtv()!.hireDate ? (selectedKtv()!.hireDate | date:'dd/MM/yyyy') : '—' }}</dd>
                <dt>Địa chỉ</dt><dd>{{ selectedKtv()!.address || '—' }}</dd>
              </dl>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDetailModal()">Đóng</button>
              <button class="btn btn-primary" (click)="openEditModal(selectedKtv()!); closeDetailModal()">Chỉnh sửa</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal xác nhận xóa -->
      @if (showDeleteModal() && ktvToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Xóa kỹ thuật viên</h2>
              <button class="modal-close-btn" (click)="cancelDelete()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p>
                Xóa hồ sơ kỹ thuật viên <strong>{{ ktvToDelete()!.fullName }}</strong>
                (<span class="mono">{{ ktvToDelete()!.employeeCode || ('KTV' + ktvToDelete()!.id) }}</span>)?
              </p>
              <p class="delete-warning-note">
                Không thể xóa nếu KTV đã được phân ca hoặc đã ký kết quả xét nghiệm. Khi đó hãy khóa tài khoản thay vì xóa.
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="cancelDelete()" [disabled]="submitting()">Hủy</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang xóa...
                } @else {
                  Xóa
                }
              </button>
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


    .search-box .btn-clear-search {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 26px;
      height: 26px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-light);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .search-box .btn-clear-search i {
      position: static;
      transform: none;
      font-size: 12px;
      color: inherit;
    }

    .search-box .btn-clear-search:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .quick-filters {
      display: flex;
      margin-left: auto;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .quick-filter {
      height: 32px;
      padding: 0 10px;
      border: none;
      border-left: 1px solid var(--border-color);
      background: #ffffff;
      color: var(--text-secondary);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .quick-filter:first-child { border-left: none; }
    .quick-filter:hover { background: var(--bg-hover); }

    .quick-filter .mono {
      color: var(--text-muted);
      margin-left: 4px;
    }

    .quick-filter.active {
      background: var(--primary-50);
      color: var(--primary-700);
      font-weight: 500;
    }

    .quick-filter.active .mono { color: var(--primary-700); }

    .modal-sm { max-width: 440px; width: 100%; }

    .delete-warning-note {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 120px 1fr; }
    }
  `]
})
export class LabTechniciansComponent implements OnInit {
  private readonly labTechService = inject(LabTechnicianService);

  technicianList = signal<LabTechnician[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Filters & Search
  searchKeyword = '';
  filterDepartment = '';
  filterStatus = '';

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  pageSizeOptions = [10, 20, 50];

  // Feedback Toast
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'danger'>('success');

  // Modals
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  editingId: number | null = null;
  formError = signal<string | null>(null);

  showDetailModal = signal<boolean>(false);
  selectedKtv = signal<LabTechnician | null>(null);

  showDeleteModal = signal<boolean>(false);
  ktvToDelete = signal<LabTechnician | null>(null);

  // Form Data
  formData: LabTechnicianRequest = this.initialForm();

  // Filtered List as a reactive writable signal
  filteredTechnicians = signal<LabTechnician[]>([]);

  // Statistics
  activeCount = computed(() => this.technicianList().filter(t => t.status === 'ACTIVE').length);
  labCount = computed(() => this.technicianList().filter(t => t.department === 'XET_NGHIEM').length);
  imagingCount = computed(() => this.technicianList().filter(t => t.department === 'CHAN_DOAN_HINH_ANH').length);

  // Pagination Helpers
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTechnicians().length / this.pageSize())));
  startIndex = computed(() => this.filteredTechnicians().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  endIndex = computed(() => Math.min(this.filteredTechnicians().length, this.currentPage() * this.pageSize()));
  paginatedTechnicians = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredTechnicians().slice(start, start + this.pageSize());
  });

  pagesList = computed(() => {
    const total = this.totalPages();
    const curr = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, curr - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.loadTechnicians();
  }

  loadTechnicians(): void {
    this.loading.set(true);
    this.labTechService.getTechnicians().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data) {
          this.technicianList.set(res.data);
          this.applyFilters(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.showAlert(err?.error?.message || 'Không thể tải danh sách kỹ thuật viên', 'danger');
      }
    });
  }

  applyFilters(resetPage: boolean = true): void {
    const kw = (this.searchKeyword || '').trim().toLowerCase();
    const dept = (this.filterDepartment || '').trim();
    const st = (this.filterStatus || '').trim();

    const filtered = this.technicianList().filter(t => {
      if (st && (t.status || 'ACTIVE') !== st) return false;
      if (dept && t.department !== dept) return false;
      if (!kw) return true;
      return [t.fullName, t.employeeCode, t.username, t.email, t.phoneNumber, t.position]
        .some(v => v && v.toLowerCase().includes(kw));
    });

    this.filteredTechnicians.set(filtered);
    if (resetPage) {
      this.currentPage.set(1);
    } else if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.applyFilters();
  }

  setQuickFilter(department: string, status: string): void {
    // Nếu click lại vào bộ lọc đang chọn thì toggle bỏ chọn
    if (department && this.filterDepartment === department) {
      this.filterDepartment = '';
    } else if (department !== undefined) {
      this.filterDepartment = department;
    }

    if (status && this.filterStatus === status) {
      this.filterStatus = '';
    } else if (status !== undefined) {
      this.filterStatus = status;
    }

    this.applyFilters();
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formError.set(null);
    this.formData = this.initialForm();
    this.showModal.set(true);
  }

  openEditModal(item: LabTechnician): void {
    this.isEditing.set(true);
    this.editingId = item.id;
    this.formError.set(null);
    this.formData = {
      username: item.username,
      password: '',
      email: item.email || '',
      phoneNumber: item.phoneNumber || '',
      fullName: item.fullName || '',
      gender: item.gender || 'Nam',
      dateOfBirth: item.dateOfBirth || '',
      address: item.address || '',
      nationalId: item.nationalId || '',
      avatarUrl: item.avatarUrl || '',
      employeeCode: item.employeeCode || '',
      department: item.department || 'XET_NGHIEM',
      position: item.position || '',
      hireDate: item.hireDate || ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formError.set(null);
  }

  onDepartmentChange(dept: string): void {
    if (!this.formData.position) {
      if (dept === 'CHAN_DOAN_HINH_ANH') {
        this.formData.position = 'Kỹ thuật viên Chẩn đoán hình ảnh';
      } else {
        this.formData.position = 'Kỹ thuật viên Xét nghiệm';
      }
    }
  }

  saveTechnician(): void {
    this.formError.set(null);

    // Basic Validation
    if (!this.isEditing()) {
      if (!this.formData.username || this.formData.username.trim().length < 3) {
        this.formError.set('Tên đăng nhập phải có ít nhất 3 ký tự');
        return;
      }
      if (!this.formData.password || this.formData.password.trim().length < 6) {
        this.formError.set('Mật khẩu khởi tạo phải có ít nhất 6 ký tự');
        return;
      }
    } else {
      if (this.formData.password && this.formData.password.trim().length < 6) {
        this.formError.set('Mật khẩu mới phải có ít nhất 6 ký tự (hoặc để trống nếu giữ nguyên)');
        return;
      }
    }

    if (!this.formData.fullName || !this.formData.fullName.trim()) {
      this.formError.set('Họ và tên không được để trống');
      return;
    }

    if (!this.formData.email || !this.formData.email.trim()) {
      this.formError.set('Email không được để trống');
      return;
    }

    if (!this.formData.department) {
      this.formError.set('Vui lòng chọn Khoa/Bộ phận cận lâm sàng');
      return;
    }

    this.submitting.set(true);

    if (this.isEditing() && this.editingId) {
      this.labTechService.updateTechnician(this.editingId, this.formData).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeModal();
          this.showAlert('Đã cập nhật hồ sơ kỹ thuật viên thành công!', 'success');
          this.loadTechnicians();
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(err?.error?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ KTV');
        }
      });
    } else {
      this.labTechService.createTechnician(this.formData).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeModal();
          this.showAlert('Đã tạo mới kỹ thuật viên & cấp tài khoản thành công!', 'success');
          this.loadTechnicians();
        },
        error: (err) => {
          this.submitting.set(false);
          this.formError.set(err?.error?.message || 'Có lỗi xảy ra khi thêm mới KTV');
        }
      });
    }
  }

  viewDetail(item: LabTechnician): void {
    this.selectedKtv.set(item);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedKtv.set(null);
  }

  toggleStatus(item: LabTechnician): void {
    const newStatus: LabTechnicianStatus = item.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const actionLabel = newStatus === 'ACTIVE' ? 'mở khóa' : 'khóa';

    this.labTechService.updateStatus(item.id, newStatus).subscribe({
      next: (res) => {
        this.showAlert(`Đã ${actionLabel} tài khoản KTV ${item.fullName} thành công!`, 'success');
        this.loadTechnicians();
      },
      error: (err) => {
        this.showAlert(err?.error?.message || `Không thể ${actionLabel} tài khoản KTV`, 'danger');
      }
    });
  }

  confirmDelete(item: LabTechnician): void {
    this.ktvToDelete.set(item);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.ktvToDelete.set(null);
  }

  executeDelete(): void {
    const ktv = this.ktvToDelete();
    if (!ktv) return;

    this.submitting.set(true);
    this.labTechService.deleteTechnician(ktv.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.cancelDelete();
        this.showAlert(`Đã xóa kỹ thuật viên ${ktv.fullName} khỏi hệ thống!`, 'success');
        this.loadTechnicians();
      },
      error: (err) => {
        this.submitting.set(false);
        this.cancelDelete();
        this.showAlert(err?.error?.message || 'Không thể xóa kỹ thuật viên này', 'danger');
      }
    });
  }

  initials(name: string): string {
    if (!name) return 'KT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private showAlert(msg: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(msg);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === msg) {
        this.alertMessage.set(null);
      }
    }, 4500);
  }

  private initialForm(): LabTechnicianRequest {
    return {
      username: '',
      password: '',
      email: '',
      phoneNumber: '',
      fullName: '',
      gender: 'Nam',
      dateOfBirth: '',
      address: '',
      nationalId: '',
      avatarUrl: '',
      employeeCode: '',
      department: 'XET_NGHIEM',
      position: 'Kỹ thuật viên Xét nghiệm',
      hireDate: new Date().toISOString().split('T')[0]
    };
  }
}

