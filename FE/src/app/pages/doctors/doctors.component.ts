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
    <div class="doctors-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-people-fill"></i> Nhân Sự Y Tế
          </div>
          <h1 class="page-title">Quản Lý Bác Sĩ</h1>
          <p class="page-subtitle">
            Thêm mới bác sĩ, cấp tài khoản đăng nhập, phân bổ chuyên khoa và quản lý trạng thái hoạt động
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-person-plus-fill"></i> Thêm Bác Sĩ Mới
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
            placeholder="Tìm theo tên, mã bác sĩ, tài khoản, email, số điện thoại..."
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
        <div class="stats-summary">
          <span class="stat-pill">
            Tổng cộng: <strong>{{ doctors().length }}</strong> bác sĩ
          </span>
          <span class="stat-pill stat-pill-highlight">
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

      <!-- Table List of Doctors & Pagination -->
      <div class="table-card">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách bác sĩ...</p>
          </div>
        } @else if (filteredDoctors().length === 0) {
          <div class="empty-state">
            <i class="bi bi-person-x-fill"></i>
            <h3>Không tìm thấy bác sĩ nào</h3>
            <p>Thử thay đổi bộ lọc hoặc nhấn "Thêm Bác Sĩ Mới" để tạo hồ sơ.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th style="width: 100px; text-align: center;">Mã BS</th>
                  <th style="min-width: 240px;">Bác sĩ</th>
                  <th style="min-width: 170px;">Chuyên khoa</th>
                  <th style="min-width: 200px;">Liên hệ</th>
                  <th style="width: 110px; text-align: center;">Kinh nghiệm</th>
                  <th style="width: 140px; text-align: center;">Trạng thái</th>
                  <th style="width: 170px; text-align: center;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedDoctors(); track item.id) {
                  <tr class="table-row">
                    <td style="text-align: center;">
                      <span class="code-badge">{{ item.employeeCode || ('DOC' + item.id) }}</span>
                    </td>
                    <td>
                      <div class="doctor-cell">
                        <div class="doctor-avatar">{{ initials(item.fullName) }}</div>
                        <div class="doctor-meta">
                          <strong class="doctor-name">{{ item.fullName }}</strong>
                          <span class="doctor-sub">{{ item.academicTitle || 'Bác sĩ' }} • {{ '@' + (item.username || '—') }}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      @if (item.specialtyName) {
                        <span class="badge-specialty"><i class="bi bi-hospital"></i> {{ item.specialtyName }}</span>
                      } @else {
                        <span class="text-muted-sm">Chưa phân khoa</span>
                      }
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span><i class="bi bi-envelope"></i> {{ item.email || '—' }}</span>
                        <span><i class="bi bi-telephone"></i> {{ item.phoneNumber || '—' }}</span>
                      </div>
                    </td>
                    <td style="text-align: center;">{{ item.yearsOfExperience ?? 0 }} năm</td>
                    <td style="text-align: center;">
                      @if (item.status === 'LOCKED') {
                        <span class="status-badge status-locked"><i class="bi bi-lock-fill"></i> Đã khóa</span>
                      } @else {
                        <span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Hoạt động</span>
                      }
                    </td>
                    <td style="text-align: center;">
                      <div class="action-buttons-cell">
                        <button class="btn-action btn-action-view" (click)="viewDetail(item)" title="Xem hồ sơ" aria-label="Xem hồ sơ">
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
                        <button class="btn-action btn-action-delete" (click)="confirmDelete(item)" title="Xóa bác sĩ" aria-label="Xóa">
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
                Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ filteredDoctors().length }}</strong> bác sĩ
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

      <!-- Modal Thêm / Chỉnh Sửa Bác Sĩ -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi" [ngClass]="isEditing() ? 'bi-pencil-square' : 'bi-person-plus-fill'"></i>
                {{ isEditing() ? 'Cập Nhật Hồ Sơ Bác Sĩ' : 'Thêm Bác Sĩ Mới' }}
              </h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error"><i class="bi bi-exclamation-circle-fill"></i> {{ formError() }}</div>
              }

              <!-- Tài khoản -->
              <h3 class="form-section-title"><i class="bi bi-shield-lock"></i> Tài khoản đăng nhập</h3>
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
              <h3 class="form-section-title"><i class="bi bi-person-vcard"></i> Thông tin cá nhân</h3>
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
              <h3 class="form-section-title"><i class="bi bi-clipboard2-pulse"></i> Chuyên môn &amp; nhân sự</h3>
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
              <button class="btn btn-outline" (click)="closeModal()">Hủy bỏ</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveDoctor()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  <i class="bi bi-check2-circle"></i> {{ isEditing() ? 'Lưu Thay Đổi' : 'Tạo Bác Sĩ' }}
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
              <h2 class="modal-title"><i class="bi bi-person-badge"></i> Hồ sơ bác sĩ</h2>
              <button class="modal-close-btn" (click)="selectedDoctor.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-head">
                <div class="doctor-avatar doctor-avatar-lg">{{ initials(doc.fullName) }}</div>
                <div>
                  <h3 class="detail-name">{{ doc.academicTitle ? doc.academicTitle + ' ' : '' }}{{ doc.fullName }}</h3>
                  <div class="detail-tags">
                    <span class="code-badge">{{ doc.employeeCode || ('DOC' + doc.id) }}</span>
                    @if (doc.specialtyName) {
                      <span class="badge-specialty"><i class="bi bi-hospital"></i> {{ doc.specialtyName }}</span>
                    }
                    @if (doc.status === 'LOCKED') {
                      <span class="status-badge status-locked"><i class="bi bi-lock-fill"></i> Đã khóa</span>
                    } @else {
                      <span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Hoạt động</span>
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
              <button class="btn btn-outline" (click)="selectedDoctor.set(null)">Đóng</button>
              <button class="btn btn-primary" (click)="editFromDetail(doc)"><i class="bi bi-pencil-fill"></i> Chỉnh sửa</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .doctors-page {
      padding: 1.5rem 0 3rem;
      max-width: 1300px;
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

    .search-filter-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04);
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 260px;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.5rem 1rem;
    }

    .search-box i {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .search-input {
      border: none;
      background: transparent;
      outline: none;
      width: 100%;
      font-size: 0.95rem;
      color: var(--text-main);
    }

    .filter-select {
      padding: 0.55rem 0.85rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: #ffffff;
      font-size: 0.9rem;
      color: var(--text-main);
      min-width: 170px;
    }

    .stats-summary {
      display: flex;
      gap: 0.75rem;
      margin-left: auto;
    }

    .stat-pill {
      background: #f1f5f9;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      color: var(--text-main);
      white-space: nowrap;
    }

    .stat-pill-highlight {
      background: var(--primary-50);
      color: var(--primary-800);
      border: 1px solid var(--primary-200);
    }

    /* Table Card & Responsive */
    .table-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05);
      overflow: hidden;
      animation: modalFadeIn 0.25s ease-out;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .clinical-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.92rem;
    }

    .clinical-table thead th {
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 1rem 1.15rem;
      border-bottom: 2px solid #e2e8f0;
      white-space: nowrap;
    }

    .clinical-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.15s;
    }

    .clinical-table tbody tr:hover {
      background: #f8fafc;
    }

    .clinical-table td {
      padding: 1rem 1.15rem;
      vertical-align: middle;
      color: #1e293b;
    }

    /* Doctor Cell */
    .doctor-cell {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .doctor-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.95rem;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.25);
    }

    .doctor-avatar-lg {
      width: 64px;
      height: 64px;
      font-size: 1.35rem;
    }

    .doctor-meta {
      display: flex;
      flex-direction: column;
    }

    .doctor-name {
      color: #0f172a;
      font-size: 0.98rem;
      font-weight: 800;
    }

    .doctor-sub {
      color: #64748b;
      font-size: 0.78rem;
      font-weight: 600;
    }

    .code-badge {
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      font-size: 0.8rem;
      display: inline-block;
    }

    .badge-specialty {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #eff6ff;
      color: var(--primary-700);
      border: 1px solid #bfdbfe;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .text-muted-sm {
      color: #94a3b8;
      font-size: 0.85rem;
      font-style: italic;
    }

    .contact-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      font-size: 0.85rem;
      color: #475569;
    }

    .contact-cell i {
      color: #94a3b8;
      margin-right: 0.25rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .status-active {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .status-locked {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    /* Action Buttons in Cell */
    .action-buttons-cell {
      display: flex;
      justify-content: center;
      gap: 0.4rem;
    }

    .btn-action {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.88rem;
      transition: all 0.2s;
    }

    .btn-action-view {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
    }

    .btn-action-view:hover {
      background: #475569;
      color: #ffffff;
      border-color: #475569;
    }

    .btn-action-edit {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0284c7;
    }

    .btn-action-edit:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .btn-action-lock {
      background: #fffbeb;
      border: 1px solid #fde68a;
      color: #b45309;
    }

    .btn-action-lock:hover {
      background: #d97706;
      color: #ffffff;
      border-color: #d97706;
    }

    .btn-action-unlock {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      color: #047857;
    }

    .btn-action-unlock:hover {
      background: #059669;
      color: #ffffff;
      border-color: #059669;
    }

    .btn-action-delete {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }

    .btn-action-delete:hover {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }

    /* ==================== PAGINATION BAR ==================== */
    .pagination-footer {
      padding: 1rem 1.35rem;
      background: #ffffff;
      border-top: 1.5px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.88rem;
      color: #475569;
    }

    .pagination-info strong {
      color: #0f172a;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .form-select-sm {
      padding: 0.35rem 0.65rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      color: #0f172a;
      font-weight: 700;
      background: #ffffff;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-page {
      min-width: 34px;
      height: 34px;
      padding: 0 0.5rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-page:hover:not(:disabled) {
      background: #f0f9ff;
      border-color: #0284c7;
      color: #0284c7;
    }

    .btn-page.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
    }

    .btn-page:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .btn-page-nav {
      gap: 0.25rem;
      padding: 0 0.75rem;
    }

    .page-numbers-group {
      display: flex;
      gap: 0.3rem;
    }

    /* Modal Styles */
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
      max-width: 540px;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    .modal-lg {
      max-width: 820px;
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

    /* Form */
    .form-section-title {
      font-size: 0.85rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--primary-700);
      margin: 0.5rem 0 0.85rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px dashed var(--border-color);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 1rem;
    }

    .form-group-full {
      grid-column: 1 / -1;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .stats-summary {
        margin-left: 0;
      }
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.4rem;
    }

    .form-label.required::after {
      content: ' *';
      color: var(--rose-600);
    }

    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      transition: all 0.2s;
      background: #ffffff;
    }

    .form-control:disabled {
      background: #f1f5f9;
      color: #64748b;
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .form-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      display: block;
    }

    .form-error {
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Detail */
    .detail-head {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }

    .detail-name {
      font-size: 1.2rem;
      font-weight: 800;
      margin: 0 0 0.4rem;
      color: #0f172a;
    }

    .detail-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      align-items: center;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 170px 1fr;
      gap: 0.55rem 1rem;
      margin: 0 0 1.25rem;
      font-size: 0.92rem;
    }

    .detail-grid dt {
      color: var(--text-muted);
      font-weight: 600;
    }

    .detail-grid dd {
      margin: 0;
      color: var(--text-main);
      font-weight: 600;
    }

    .detail-bio {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      font-size: 0.9rem;
    }

    .detail-bio p {
      margin: 0.35rem 0 0;
      color: #475569;
      white-space: pre-line;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px dashed var(--border-color);
    }

    .empty-state i {
      font-size: 3rem;
      color: var(--text-muted);
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
