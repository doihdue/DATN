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
    <div class="ktv-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-eyedropper"></i> Nhân Sự Cận Lâm Sàng & Xét Nghiệm
          </div>
          <h1 class="page-title">Quản Lý Kỹ Thuật Viên</h1>
          <p class="page-subtitle">
            Quản lý đội ngũ KTV xét nghiệm & chẩn đoán hình ảnh, phân công chuyên môn, cấp tài khoản và điều phối phân quyền
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-person-plus-fill"></i> Thêm Kỹ Thuật Viên Mới
          </button>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="search-filter-card">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            type="text"
            [(ngModel)]="searchKeyword"
            (ngModelChange)="applyFilters()"
            placeholder="Tìm theo tên KTV, mã nhân viên, tài khoản, email, số điện thoại..."
            class="search-input"
          />
          @if (searchKeyword) {
            <button type="button" class="btn-clear-search" (click)="clearSearch()" title="Xóa từ khóa tìm kiếm">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          }
        </div>
        <select class="filter-select" [(ngModel)]="filterDepartment" (ngModelChange)="applyFilters()" aria-label="Lọc theo bộ phận chuyên môn">
          <option value="">Tất cả chuyên khoa cận lâm sàng</option>
          <option value="XET_NGHIEM">🧪 Khoa Xét Nghiệm</option>
          <option value="CHAN_DOAN_HINH_ANH">📷 Khoa Chẩn Đoán Hình Ảnh</option>
        </select>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" aria-label="Lọc theo trạng thái tài khoản">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
        <div class="stats-summary">
          <span class="stat-pill stat-pill-clickable" (click)="setQuickFilter('', '')" title="Xem tất cả KTV">
            Tổng cộng: <strong>{{ technicianList().length }}</strong> KTV
          </span>
          <span class="stat-pill stat-pill-lab stat-pill-clickable" [class.pill-active]="filterDepartment === 'XET_NGHIEM'" (click)="setQuickFilter('XET_NGHIEM', filterStatus)" title="Lọc Khoa Xét Nghiệm">
            Xét nghiệm: <strong>{{ labCount() }}</strong>
          </span>
          <span class="stat-pill stat-pill-imaging stat-pill-clickable" [class.pill-active]="filterDepartment === 'CHAN_DOAN_HINH_ANH'" (click)="setQuickFilter('CHAN_DOAN_HINH_ANH', filterStatus)" title="Lọc Khoa Chẩn Đoán Hình Ảnh">
            CĐHA: <strong>{{ imagingCount() }}</strong>
          </span>
          <span class="stat-pill stat-pill-highlight stat-pill-clickable" [class.pill-active]="filterStatus === 'ACTIVE'" (click)="setQuickFilter(filterDepartment, 'ACTIVE')" title="Lọc KTV Đang hoạt động">
            Hoạt động: <strong>{{ activeCount() }}</strong>
          </span>
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

      <!-- Table List of Lab Technicians & Pagination -->
      <div class="table-card">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách kỹ thuật viên...</p>
          </div>
        } @else if (filteredTechnicians().length === 0) {
          <div class="empty-state">
            <i class="bi bi-person-x-fill"></i>
            <h3>Không tìm thấy kỹ thuật viên nào</h3>
            <p>Thử thay đổi bộ lọc hoặc nhấn "Thêm Kỹ Thuật Viên Mới" để tạo hồ sơ.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th style="width: 110px; text-align: center;">Mã KTV</th>
                  <th style="min-width: 250px;">Kỹ thuật viên</th>
                  <th style="min-width: 200px;">Bộ phận chuyên môn</th>
                  <th style="min-width: 200px;">Chức vụ</th>
                  <th style="min-width: 210px;">Liên hệ</th>
                  <th style="width: 120px; text-align: center;">Ngày vào làm</th>
                  <th style="width: 140px; text-align: center;">Trạng thái</th>
                  <th style="width: 170px; text-align: center;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedTechnicians(); track item.id) {
                  <tr class="table-row">
                    <td style="text-align: center;">
                      <span class="code-badge">{{ item.employeeCode || ('KTV' + item.id) }}</span>
                    </td>
                    <td>
                      <div class="ktv-cell">
                        <div class="ktv-avatar" [class.avatar-imaging]="item.department === 'CHAN_DOAN_HINH_ANH'">
                          {{ initials(item.fullName) }}
                        </div>
                        <div class="ktv-meta">
                          <strong class="ktv-name">{{ item.fullName }}</strong>
                          <span class="ktv-sub">{{ '@' + (item.username || '—') }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (item.department === 'CHAN_DOAN_HINH_ANH') {
                        <span class="dept-badge dept-imaging">
                          <i class="bi bi-camera-reels-fill"></i> Chẩn Đoán Hình Ảnh
                        </span>
                      } @else {
                        <span class="dept-badge dept-lab">
                          <i class="bi bi-eyedropper"></i> Xét Nghiệm
                        </span>
                      }
                    </td>
                    <td>
                      <span class="badge-position">
                        <i class="bi bi-person-workspace"></i> {{ item.position || (item.department === 'CHAN_DOAN_HINH_ANH' ? 'KTV Chẩn đoán hình ảnh' : 'KTV Xét nghiệm') }}
                      </span>
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span><i class="bi bi-envelope"></i> {{ item.email || '—' }}</span>
                        <span><i class="bi bi-telephone"></i> {{ item.phoneNumber || '—' }}</span>
                      </div>
                    </td>
                    <td style="text-align: center;">{{ item.hireDate ? (item.hireDate | date:'dd/MM/yyyy') : '—' }}</td>
                    <td style="text-align: center;">
                      @if (item.status === 'LOCKED') {
                        <span class="status-badge status-locked"><i class="bi bi-lock-fill"></i> Đã khóa</span>
                      } @else {
                        <span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Hoạt động</span>
                      }
                    </td>
                    <td style="text-align: center;">
                      <div class="action-buttons-cell">
                        <button class="btn-action btn-action-view" (click)="viewDetail(item)" title="Xem hồ sơ chi tiết" aria-label="Xem hồ sơ">
                          <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="btn-action btn-action-edit" (click)="openEditModal(item)" title="Chỉnh sửa thông tin" aria-label="Chỉnh sửa">
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        @if (item.status === 'LOCKED') {
                          <button class="btn-action btn-action-unlock" (click)="toggleStatus(item)" title="Mở khóa tài khoản" aria-label="Mở khóa">
                            <i class="bi bi-unlock-fill"></i>
                          </button>
                        } @else {
                          <button class="btn-action btn-action-lock" (click)="toggleStatus(item)" title="Khóa tài khoản" aria-label="Khóa">
                            <i class="bi bi-lock-fill"></i>
                          </button>
                        }
                        <button class="btn-action btn-action-delete" (click)="confirmDelete(item)" title="Xóa kỹ thuật viên" aria-label="Xóa">
                          <i class="bi bi-trash3-fill"></i>
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
                Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ filteredTechnicians().length }}</strong> KTV
              </span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng/trang:</label>
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
                <i class="bi bi-chevron-left"></i> Trước
              </button>
              <div class="page-numbers-group">
                @for (p of pagesList(); track p) {
                  <button class="btn-page btn-page-num" [class.active]="currentPage() === p" (click)="goToPage(p)">
                    {{ p }}
                  </button>
                }
              </div>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)" title="Trang sau">
                Sau <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Đến trang cuối cùng">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal Thêm / Chỉnh Sửa Kỹ Thuật Viên -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi" [ngClass]="isEditing() ? 'bi-pencil-square' : 'bi-person-plus-fill'"></i>
                {{ isEditing() ? 'Cập Nhật Hồ Sơ Kỹ Thuật Viên' : 'Thêm Kỹ Thuật Viên Mới' }}
              </h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error"><i class="bi bi-exclamation-circle-fill"></i> {{ formError() }}</div>
              }

              <!-- 1. Tài khoản đăng nhập -->
              <h3 class="form-section-title"><i class="bi bi-shield-lock"></i> Tài khoản đăng nhập (Quyền: ROLE_LAB_TECH)</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label" [class.required]="!isEditing()">Tên đăng nhập</label>
                  <input type="text" [(ngModel)]="formData.username" class="form-control" placeholder="vd: ktv_lan, ktv_minh" [disabled]="isEditing()" autocomplete="off" />
                  @if (isEditing()) {
                    <small class="form-hint">Không thể thay đổi tên đăng nhập.</small>
                  }
                </div>
                <div class="form-group">
                  <label class="form-label" [class.required]="!isEditing()">{{ isEditing() ? 'Đặt lại mật khẩu' : 'Mật khẩu' }}</label>
                  <input type="password" [(ngModel)]="formData.password" class="form-control" [placeholder]="isEditing() ? 'Để trống nếu giữ nguyên mật khẩu cũ' : 'Tối thiểu 6 ký tự'" autocomplete="new-password" />
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

              <!-- 2. Chuyên môn & Nhân sự -->
              <h3 class="form-section-title"><i class="bi bi-mortarboard-fill"></i> Chuyên môn &amp; Bộ phận công tác</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">Khoa / Bộ phận cận lâm sàng</label>
                  <select [(ngModel)]="formData.department" class="form-select" (ngModelChange)="onDepartmentChange($event)">
                    <option value="XET_NGHIEM">🧪 Khoa Xét Nghiệm</option>
                    <option value="CHAN_DOAN_HINH_ANH">📷 Khoa Chẩn Đoán Hình Ảnh (X-Quang, Siêu âm, CT)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Chức danh / Vị trí</label>
                  <input type="text" [(ngModel)]="formData.position" class="form-control" placeholder="vd: Kỹ thuật viên Trưởng, KTV Xét nghiệm..." />
                </div>
                <div class="form-group">
                  <label class="form-label">Mã nhân viên (KTV)</label>
                  <input type="text" [(ngModel)]="formData.employeeCode" class="form-control" placeholder="vd: KTV003 (để trống tự sinh)" />
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày vào làm</label>
                  <input type="date" [(ngModel)]="formData.hireDate" class="form-control" />
                </div>
              </div>

              <!-- 3. Thông tin cá nhân -->
              <h3 class="form-section-title"><i class="bi bi-person-vcard"></i> Thông tin cá nhân</h3>
              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label required">Họ và tên</label>
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Nguyễn Thị Mai" />
                </div>
                <div class="form-group">
                  <label class="form-label">Giới tính</label>
                  <select [(ngModel)]="formData.gender" class="form-select">
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
                  <label class="form-label">Số CCCD / CMND</label>
                  <input type="text" [(ngModel)]="formData.nationalId" class="form-control" placeholder="12 chữ số" />
                </div>
                <div class="form-group">
                  <label class="form-label">Link ảnh đại diện (URL)</label>
                  <input type="text" [(ngModel)]="formData.avatarUrl" class="form-control" placeholder="https://..." />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">Địa chỉ liên hệ</label>
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
                  <i class="bi bi-check-lg"></i> {{ isEditing() ? 'Cập Nhật Hồ Sơ' : 'Lưu Kỹ Thuật Viên' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Xem Chi Tiết KTV -->
      @if (showDetailModal() && selectedKtv()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog modal-md" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title"><i class="bi bi-person-badge-fill"></i> Hồ Sơ Chi Tiết Kỹ Thuật Viên</h2>
              <button class="modal-close-btn" (click)="closeDetailModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body profile-body">
              <div class="profile-header">
                <div class="profile-avatar" [class.avatar-imaging]="selectedKtv()!.department === 'CHAN_DOAN_HINH_ANH'">
                  {{ initials(selectedKtv()!.fullName) }}
                </div>
                <div class="profile-title">
                  <h3>{{ selectedKtv()!.fullName }}</h3>
                  <div class="profile-badges">
                    <span class="code-badge">{{ selectedKtv()!.employeeCode || ('KTV' + selectedKtv()!.id) }}</span>
                    @if (selectedKtv()!.department === 'CHAN_DOAN_HINH_ANH') {
                      <span class="dept-badge dept-imaging"><i class="bi bi-camera-reels-fill"></i> Chẩn Đoán Hình Ảnh</span>
                    } @else {
                      <span class="dept-badge dept-lab"><i class="bi bi-eyedropper"></i> Khoa Xét Nghiệm</span>
                    }
                    @if (selectedKtv()!.status === 'LOCKED') {
                      <span class="status-badge status-locked">Đã khóa</span>
                    } @else {
                      <span class="status-badge status-active">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>

              <div class="profile-details-grid">
                <div class="profile-item">
                  <span class="profile-label">Tài khoản</span>
                  <span class="profile-val"><strong>{{ selectedKtv()!.username || '—' }}</strong></span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Chức vụ</span>
                  <span class="profile-val">{{ selectedKtv()!.position || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Email</span>
                  <span class="profile-val">{{ selectedKtv()!.email || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Điện thoại</span>
                  <span class="profile-val">{{ selectedKtv()!.phoneNumber || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Giới tính</span>
                  <span class="profile-val">{{ selectedKtv()!.gender || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Ngày sinh</span>
                  <span class="profile-val">{{ selectedKtv()!.dateOfBirth ? (selectedKtv()!.dateOfBirth | date:'dd/MM/yyyy') : '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">CCCD/CMND</span>
                  <span class="profile-val">{{ selectedKtv()!.nationalId || '—' }}</span>
                </div>
                <div class="profile-item">
                  <span class="profile-label">Ngày vào làm</span>
                  <span class="profile-val">{{ selectedKtv()!.hireDate ? (selectedKtv()!.hireDate | date:'dd/MM/yyyy') : '—' }}</span>
                </div>
                <div class="profile-item full-width">
                  <span class="profile-label">Địa chỉ</span>
                  <span class="profile-val">{{ selectedKtv()!.address || '—' }}</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDetailModal()">Đóng</button>
              <button class="btn btn-primary" (click)="openEditModal(selectedKtv()!); closeDetailModal()">
                <i class="bi bi-pencil-fill"></i> Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Xác Nhận Xóa -->
      @if (showDeleteModal() && ktvToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header modal-header-danger">
              <h2 class="modal-title"><i class="bi bi-exclamation-triangle-fill"></i> Xác Nhận Xóa KTV</h2>
              <button class="modal-close-btn" (click)="cancelDelete()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body text-center">
              <p>
                Bạn có chắc chắn muốn xóa hồ sơ Kỹ thuật viên <strong>{{ ktvToDelete()!.fullName }}</strong>
                (mã <code>{{ ktvToDelete()!.employeeCode || ('KTV' + ktvToDelete()!.id) }}</code>)?
              </p>
              <p class="delete-warning-note">
                <i class="bi bi-info-circle"></i> Lưu ý: Nếu KTV này đã được phân ca trực hoặc đã từng ký kết quả xét nghiệm trong bệnh án, hệ thống sẽ ngăn chặn việc xóa để đảm bảo toàn vẹn dữ liệu y tế (bạn có thể khóa tài khoản thay thế).
              </p>
            </div>
            <div class="modal-footer justify-center">
              <button class="btn btn-secondary" (click)="cancelDelete()" [disabled]="submitting()">Hủy bỏ</button>
              <button class="btn btn-danger" (click)="executeDelete()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang xóa...
                } @else {
                  <i class="bi bi-trash3-fill"></i> Xóa vĩnh viễn
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .ktv-page {
      padding: 1.5rem 0 3rem;
      max-width: 1360px;
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
      padding: 0.3rem 0.85rem;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.8rem;
      font-weight: 700;
      border-radius: 9999px;
      margin-bottom: 0.5rem;
      border: 1px solid #bae6fd;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.4rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: #64748b;
      margin: 0;
      font-size: 0.95rem;
    }

    .search-filter-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box i {
      position: absolute;
      left: 0.85rem;
      color: #94a3b8;
      font-size: 0.95rem;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 0.85rem 0.65rem 2.4rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #f8fafc;
      transition: all 0.2s;
    }

    .search-input:focus {
      background: #ffffff;
      border-color: #0284c7;
      outline: none;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .btn-clear-search {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.95rem;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s;
    }

    .btn-clear-search:hover {
      color: #475569;
    }

    .stat-pill-clickable {
      cursor: pointer;
      user-select: none;
      transition: all 0.15s;
    }

    .stat-pill-clickable:hover {
      transform: translateY(-1px);
      filter: brightness(0.95);
    }

    .pill-active {
      box-shadow: 0 0 0 2px #0284c7;
      font-weight: 800 !important;
    }

    .filter-select {
      padding: 0.65rem 1rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #ffffff;
      color: #334155;
      font-weight: 500;
      cursor: pointer;
    }

    .filter-select:focus {
      border-color: #0284c7;
      outline: none;
    }

    .stats-summary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-left: auto;
      flex-wrap: wrap;
    }

    .stat-pill {
      font-size: 0.8rem;
      padding: 0.35rem 0.75rem;
      background: #f1f5f9;
      color: #475569;
      border-radius: 20px;
    }

    .stat-pill strong {
      color: #0f172a;
    }

    .stat-pill-lab {
      background: #ecfeff;
      color: #0e7490;
      border: 1px solid #cffafe;
    }

    .stat-pill-imaging {
      background: #faf5ff;
      color: #7e22ce;
      border: 1px solid #f3e8ff;
    }

    .stat-pill-highlight {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .table-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    }

    .table-responsive {
      overflow-x: auto;
    }

    .clinical-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .clinical-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .clinical-table td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.88rem;
      color: #334155;
      vertical-align: middle;
    }

    .table-row:hover td {
      background: #f8fafc;
    }

    .code-badge {
      display: inline-block;
      font-family: Consolas, monospace;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      background: #f1f5f9;
      color: #334155;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
    }

    .ktv-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .ktv-avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      font-weight: 800;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
    }

    .ktv-avatar.avatar-imaging {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      box-shadow: 0 2px 6px rgba(139, 92, 246, 0.25);
    }

    .ktv-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .ktv-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.92rem;
    }

    .ktv-sub {
      font-size: 0.78rem;
      color: #64748b;
      font-family: Consolas, monospace;
    }

    .dept-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .dept-lab {
      background: #ecfeff;
      color: #0891b2;
      border: 1px solid #a5f3fc;
    }

    .dept-imaging {
      background: #faf5ff;
      color: #7c3aed;
      border: 1px solid #ddd6fe;
    }

    .badge-position {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.82rem;
      color: #475569;
      background: #f8fafc;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.82rem;
      color: #475569;
    }

    .contact-cell i {
      color: #94a3b8;
      width: 14px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .status-active {
      background: #dcfce7;
      color: #15803d;
    }

    .status-locked {
      background: #fee2e2;
      color: #b91c1c;
    }

    .action-buttons-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-action:hover {
      transform: translateY(-1px);
    }

    .btn-action-view:hover {
      background: #e0f2fe;
      color: #0284c7;
      border-color: #bae6fd;
    }

    .btn-action-edit:hover {
      background: #fef3c7;
      color: #d97706;
      border-color: #fde68a;
    }

    .btn-action-lock:hover {
      background: #fee2e2;
      color: #dc2626;
      border-color: #fecaca;
    }

    .btn-action-unlock:hover {
      background: #dcfce7;
      color: #16a34a;
      border-color: #bbf7d0;
    }

    .btn-action-delete:hover {
      background: #fef2f2;
      color: #ef4444;
      border-color: #fca5a5;
    }

    /* Pagination */
    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .form-select-sm {
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      font-size: 0.82rem;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .page-numbers-group {
      display: flex;
      gap: 0.25rem;
    }

    .btn-page {
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #334155;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-page:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .btn-page.active {
      background: #0284c7;
      color: white;
      border-color: #0284c7;
    }

    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Buttons */
    .btn {
      padding: 0.65rem 1.2rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      border: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #0284c7;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0369a1;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
    }

    .btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e2e8f0;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover:not(:disabled) {
      background: #b91c1c;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    }

    /* Toast */
    .toast-floating-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #ffffff;
      padding: 0.85rem 1.1rem;
      border-radius: 10px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      border-left: 5px solid;
      min-width: 320px;
      max-width: 450px;
    }

    .toast-success {
      border-left-color: #16a34a;
    }
    .toast-success .toast-icon { color: #16a34a; font-size: 1.3rem; }

    .toast-danger {
      border-left-color: #dc2626;
    }
    .toast-danger .toast-icon { color: #dc2626; font-size: 1.3rem; }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 700;
      font-size: 0.9rem;
      color: #0f172a;
    }

    .toast-message {
      font-size: 0.82rem;
      color: #475569;
    }

    .btn-close-toast {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 0.9rem;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: modalScale 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modalScale {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .modal-lg { max-width: 780px; }
    .modal-md { max-width: 620px; }
    .modal-sm { max-width: 460px; }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header-danger {
      background: #fef2f2;
      border-bottom-color: #fee2e2;
    }
    .modal-header-danger .modal-title { color: #b91c1c; }

    .modal-title {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 1.6rem;
      line-height: 1;
      color: #94a3b8;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
      border-radius: 0 0 16px 16px;
    }

    .justify-center { justify-content: center; }

    .form-section-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0369a1;
      margin: 1.25rem 0 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 0.4rem;
    }

    .form-section-title:first-of-type {
      margin-top: 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .form-label.required::after {
      content: ' *';
      color: #dc2626;
    }

    .form-control, .form-select {
      padding: 0.6rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      background: #ffffff;
      color: #0f172a;
      transition: all 0.2s;
    }

    .form-control:focus, .form-select:focus {
      border-color: #0284c7;
      outline: none;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .form-control:disabled {
      background: #f1f5f9;
      color: #64748b;
      cursor: not-allowed;
    }

    .form-hint {
      font-size: 0.78rem;
      color: #64748b;
    }

    .form-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.88rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .delete-warning-note {
      font-size: 0.82rem;
      color: #64748b;
      background: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      text-align: left;
      border-left: 3px solid #0284c7;
    }

    /* Profile Detail Modal */
    .profile-header {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 1.25rem;
    }

    .profile-avatar {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      font-weight: 800;
      font-size: 1.3rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
    }

    .profile-avatar.avatar-imaging {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .profile-title h3 {
      font-size: 1.3rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.4rem;
    }

    .profile-badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .profile-details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .profile-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .profile-label {
      font-size: 0.78rem;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .profile-val {
      font-size: 0.92rem;
      color: #1e293b;
    }

    /* States */
    .loading-state, .empty-state {
      padding: 3.5rem 1rem;
      text-align: center;
      color: #64748b;
    }

    .empty-state i {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.5rem;
      display: block;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 0.75rem;
    }

    .spinner-sm {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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

