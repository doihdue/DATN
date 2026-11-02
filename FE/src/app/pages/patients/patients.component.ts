import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PatientService } from '../../services/patient.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { Patient, PatientAccountStatus, PatientRequest } from '../../models/patient.model';
import { MedicalRecordResponse } from '../../models/medical-record.model';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="patient-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-person-heart"></i> Hồ Sơ Bệnh Nhân Toàn Viện
          </div>
          <h1 class="page-title">Quản Lý Bệnh Nhân</h1>
          <p class="page-subtitle">
            Tra cứu, cập nhật hồ sơ hành chính &amp; thông tin y tế, theo dõi lịch sử khám và quản lý tài khoản bệnh nhân
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-person-plus-fill"></i> Thêm Hồ Sơ Bệnh Nhân
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
            placeholder="Tìm theo mã BN, họ tên, số điện thoại, CCCD, tài khoản, email..."
            class="search-input"
          />
          @if (searchKeyword) {
            <button type="button" class="btn-clear-search" (click)="clearSearch()" title="Xóa từ khóa tìm kiếm">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          }
        </div>
        <select class="filter-select" [(ngModel)]="filterGender" (ngModelChange)="applyFilters()" aria-label="Lọc theo giới tính">
          <option value="">Tất cả giới tính</option>
          <option value="Nam">Nam</option>
          <option value="Nữ">Nữ</option>
          <option value="Khác">Khác</option>
        </select>
        <select class="filter-select" [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()" aria-label="Lọc theo tài khoản">
          <option value="">Tất cả loại hồ sơ</option>
          <option value="ACTIVE">Có tài khoản - Hoạt động</option>
          <option value="LOCKED">Có tài khoản - Đã khóa</option>
          <option value="NO_ACCOUNT">Vãng lai (chưa có tài khoản)</option>
        </select>
        <div class="stats-summary">
          <span class="stat-pill stat-pill-clickable" (click)="setQuickFilter('')" title="Xem tất cả bệnh nhân">
            Tổng cộng: <strong>{{ patientList().length }}</strong> BN
          </span>
          <span class="stat-pill stat-pill-highlight stat-pill-clickable" [class.pill-active]="filterStatus === 'ACTIVE'" (click)="setQuickFilter('ACTIVE')" title="Lọc bệnh nhân có tài khoản đang hoạt động">
            Tài khoản: <strong>{{ accountCount() }}</strong>
          </span>
          <span class="stat-pill stat-pill-walkin stat-pill-clickable" [class.pill-active]="filterStatus === 'NO_ACCOUNT'" (click)="setQuickFilter('NO_ACCOUNT')" title="Lọc bệnh nhân vãng lai">
            Vãng lai: <strong>{{ walkInCount() }}</strong>
          </span>
          <span class="stat-pill stat-pill-locked stat-pill-clickable" [class.pill-active]="filterStatus === 'LOCKED'" (click)="setQuickFilter('LOCKED')" title="Lọc tài khoản đã khóa">
            Đã khóa: <strong>{{ lockedCount() }}</strong>
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

      <!-- Table List of Patients & Pagination -->
      <div class="table-card">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách bệnh nhân...</p>
          </div>
        } @else if (filteredPatients().length === 0) {
          <div class="empty-state">
            <i class="bi bi-person-x-fill"></i>
            <h3>Không tìm thấy bệnh nhân nào</h3>
            <p>Thử thay đổi bộ lọc hoặc nhấn "Thêm Hồ Sơ Bệnh Nhân" để tạo hồ sơ mới.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="clinical-table">
              <thead>
                <tr>
                  <th style="width: 110px; text-align: center;">Mã BN</th>
                  <th style="min-width: 240px;">Bệnh nhân</th>
                  <th style="min-width: 210px;">Liên hệ</th>
                  <th style="min-width: 130px;">CCCD/CMND</th>
                  <th style="min-width: 170px;">Thông tin y tế</th>
                  <th style="width: 140px; text-align: center;">Lượt khám</th>
                  <th style="width: 150px; text-align: center;">Tài khoản</th>
                  <th style="width: 170px; text-align: center;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedPatients(); track item.id) {
                  <tr class="table-row">
                    <td style="text-align: center;">
                      <span class="code-badge">{{ patientCode(item.id) }}</span>
                    </td>
                    <td>
                      <div class="patient-cell">
                        <div class="patient-avatar" [class.avatar-female]="item.gender === 'Nữ'">
                          {{ initials(item.fullName) }}
                        </div>
                        <div class="patient-meta">
                          <strong class="patient-name">{{ item.fullName }}</strong>
                          <span class="patient-sub">
                            {{ item.gender || 'Chưa rõ' }}
                            @if (item.dateOfBirth) {
                              · {{ item.dateOfBirth | date:'dd/MM/yyyy' }} ({{ ageOf(item.dateOfBirth) }} tuổi)
                            }
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div class="contact-cell">
                        <span><i class="bi bi-telephone"></i> {{ item.phoneNumber || '—' }}</span>
                        @if (item.email) {
                          <span><i class="bi bi-envelope"></i> {{ item.email }}</span>
                        }
                      </div>
                    </td>
                    <td>{{ item.nationalId || '—' }}</td>
                    <td>
                      <div class="medical-cell">
                        @if (item.bloodGroup) {
                          <span class="blood-badge"><i class="bi bi-droplet-fill"></i> {{ item.bloodGroup }}</span>
                        }
                        @if (item.allergies) {
                          <span class="allergy-badge" [title]="'Dị ứng: ' + item.allergies">
                            <i class="bi bi-exclamation-diamond-fill"></i> Dị ứng
                          </span>
                        }
                        @if (!item.bloodGroup && !item.allergies) {
                          <span class="text-muted">—</span>
                        }
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <div class="visit-cell">
                        <strong>{{ item.totalVisits || 0 }}</strong>
                        <span>{{ item.lastVisitAt ? ('Gần nhất ' + (item.lastVisitAt | date:'dd/MM/yyyy')) : 'Chưa khám' }}</span>
                      </div>
                    </td>
                    <td style="text-align: center;">
                      @if (!item.hasAccount) {
                        <span class="status-badge status-walkin"><i class="bi bi-person-walking"></i> Vãng lai</span>
                      } @else if (item.status === 'LOCKED') {
                        <span class="status-badge status-locked"><i class="bi bi-lock-fill"></i> Đã khóa</span>
                      } @else {
                        <span class="status-badge status-active"><i class="bi bi-check-circle-fill"></i> Hoạt động</span>
                      }
                    </td>
                    <td style="text-align: center;">
                      <div class="action-buttons-cell">
                        <button class="btn-action btn-action-view" (click)="viewDetail(item)" title="Xem hồ sơ & lịch sử khám" aria-label="Xem hồ sơ">
                          <i class="bi bi-eye-fill"></i>
                        </button>
                        <button class="btn-action btn-action-edit" (click)="openEditModal(item)" title="Chỉnh sửa hồ sơ" aria-label="Chỉnh sửa">
                          <i class="bi bi-pencil-fill"></i>
                        </button>
                        @if (item.hasAccount) {
                          @if (item.status === 'LOCKED') {
                            <button class="btn-action btn-action-unlock" (click)="toggleStatus(item)" title="Mở khóa tài khoản" aria-label="Mở khóa">
                              <i class="bi bi-unlock-fill"></i>
                            </button>
                          } @else {
                            <button class="btn-action btn-action-lock" (click)="toggleStatus(item)" title="Khóa tài khoản" aria-label="Khóa">
                              <i class="bi bi-lock-fill"></i>
                            </button>
                          }
                        }
                        <button class="btn-action btn-action-delete" (click)="confirmDelete(item)" title="Xóa hồ sơ bệnh nhân" aria-label="Xóa">
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
                Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ filteredPatients().length }}</strong> bệnh nhân
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

      <!-- Modal Thêm / Chỉnh Sửa Bệnh Nhân -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi" [ngClass]="isEditing() ? 'bi-pencil-square' : 'bi-person-plus-fill'"></i>
                {{ isEditing() ? 'Cập Nhật Hồ Sơ Bệnh Nhân' : 'Thêm Hồ Sơ Bệnh Nhân Mới' }}
              </h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error"><i class="bi bi-exclamation-circle-fill"></i> {{ formError() }}</div>
              }

              @if (editingPatient()?.hasAccount) {
                <div class="account-info-box">
                  <i class="bi bi-shield-check"></i>
                  Bệnh nhân có tài khoản <strong>{{ '@' + editingPatient()!.username }}</strong>
                  ({{ editingPatient()!.email || 'chưa có email' }}). Tài khoản do bệnh nhân tự quản lý mật khẩu.
                </div>
              } @else if (!isEditing()) {
                <div class="account-info-box">
                  <i class="bi bi-info-circle"></i>
                  Hồ sơ tạo tại đây là hồ sơ vãng lai (chưa có tài khoản). Lễ tân có thể tra cứu bằng số điện thoại khi tiếp đón.
                </div>
              }

              <!-- 1. Thông tin hành chính -->
              <h3 class="form-section-title"><i class="bi bi-person-vcard"></i> Thông tin hành chính</h3>
              <div class="form-grid">
                <div class="form-group full-width">
                  <label class="form-label required">Họ và tên</label>
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Nguyễn Văn An" />
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
                  <input type="date" [(ngModel)]="formData.dateOfBirth" class="form-control" [max]="today" />
                </div>
                <div class="form-group">
                  <label class="form-label" [class.required]="!editingPatient()?.hasAccount">Số điện thoại</label>
                  <input type="tel" [(ngModel)]="formData.phoneNumber" class="form-control" placeholder="09xxxxxxxx" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số CCCD / CMND</label>
                  <input type="text" [(ngModel)]="formData.nationalId" class="form-control" placeholder="12 chữ số" />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">Địa chỉ</label>
                  <input type="text" [(ngModel)]="formData.address" class="form-control" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" />
                </div>
              </div>

              <!-- 2. Thông tin y tế -->
              <h3 class="form-section-title"><i class="bi bi-heart-pulse-fill"></i> Thông tin y tế</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nhóm máu</label>
                  <select [(ngModel)]="formData.bloodGroup" class="form-select">
                    <option value="">Chưa xác định</option>
                    @for (bg of bloodGroups; track bg) {
                      <option [value]="bg">{{ bg }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Dị ứng</label>
                  <input type="text" [(ngModel)]="formData.allergies" class="form-control" placeholder="vd: Penicillin, hải sản..." />
                </div>
                <div class="form-group full-width">
                  <label class="form-label">Tiền sử bệnh</label>
                  <textarea [(ngModel)]="formData.medicalHistorySummary" class="form-control" rows="3" placeholder="Bệnh mãn tính, phẫu thuật, tiền sử gia đình..."></textarea>
                </div>
              </div>

              <!-- 3. Người liên hệ khẩn cấp -->
              <h3 class="form-section-title"><i class="bi bi-telephone-plus-fill"></i> Người liên hệ khẩn cấp</h3>
              <div class="form-grid">
                <div class="form-group" [class.full-width]="!editingPatient()?.hasAccount">
                  <label class="form-label">Họ tên người liên hệ</label>
                  <input type="text" [(ngModel)]="formData.emergencyContactName" class="form-control" placeholder="vd: Nguyễn Thị B (vợ)" />
                </div>
                @if (editingPatient()?.hasAccount) {
                  <div class="form-group">
                    <label class="form-label">SĐT người liên hệ</label>
                    <input type="tel" [(ngModel)]="formData.emergencyContactPhone" class="form-control" placeholder="09xxxxxxxx" />
                  </div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()" [disabled]="submitting()">Hủy</button>
              <button class="btn btn-primary" (click)="savePatient()" [disabled]="submitting()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  <i class="bi bi-check-lg"></i> {{ isEditing() ? 'Cập Nhật Hồ Sơ' : 'Lưu Hồ Sơ' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Xem Chi Tiết Bệnh Nhân & Lịch Sử Khám -->
      @if (showDetailModal() && selectedPatient()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title"><i class="bi bi-person-badge-fill"></i> Hồ Sơ Bệnh Nhân</h2>
              <button class="modal-close-btn" (click)="closeDetailModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body profile-body">
              <div class="profile-header">
                <div class="profile-avatar" [class.avatar-female]="selectedPatient()!.gender === 'Nữ'">
                  {{ initials(selectedPatient()!.fullName) }}
                </div>
                <div class="profile-title">
                  <h3>{{ selectedPatient()!.fullName }}</h3>
                  <div class="profile-badges">
                    <span class="code-badge">{{ patientCode(selectedPatient()!.id) }}</span>
                    @if (selectedPatient()!.bloodGroup) {
                      <span class="blood-badge"><i class="bi bi-droplet-fill"></i> {{ selectedPatient()!.bloodGroup }}</span>
                    }
                    @if (!selectedPatient()!.hasAccount) {
                      <span class="status-badge status-walkin">Vãng lai</span>
                    } @else if (selectedPatient()!.status === 'LOCKED') {
                      <span class="status-badge status-locked">Đã khóa</span>
                    } @else {
                      <span class="status-badge status-active">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>

              <div class="detail-tabs">
                <button type="button" class="detail-tab" [class.active]="detailTab() === 'info'" (click)="detailTab.set('info')">
                  <i class="bi bi-person-lines-fill"></i> Thông tin hồ sơ
                </button>
                <button type="button" class="detail-tab" [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">
                  <i class="bi bi-clock-history"></i> Lịch sử khám ({{ selectedPatient()!.totalVisits || 0 }})
                </button>
              </div>

              @if (detailTab() === 'info') {
                <div class="profile-details-grid">
                  <div class="profile-item">
                    <span class="profile-label">Giới tính</span>
                    <span class="profile-val">{{ selectedPatient()!.gender || '—' }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="profile-label">Ngày sinh</span>
                    <span class="profile-val">
                      @if (selectedPatient()!.dateOfBirth) {
                        {{ selectedPatient()!.dateOfBirth | date:'dd/MM/yyyy' }} ({{ ageOf(selectedPatient()!.dateOfBirth) }} tuổi)
                      } @else {
                        —
                      }
                    </span>
                  </div>
                  <div class="profile-item">
                    <span class="profile-label">Điện thoại</span>
                    <span class="profile-val">{{ selectedPatient()!.phoneNumber || '—' }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="profile-label">CCCD/CMND</span>
                    <span class="profile-val">{{ selectedPatient()!.nationalId || '—' }}</span>
                  </div>
                  <div class="profile-item full-width">
                    <span class="profile-label">Địa chỉ</span>
                    <span class="profile-val">{{ selectedPatient()!.address || '—' }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="profile-label">Dị ứng</span>
                    <span class="profile-val" [class.text-danger]="selectedPatient()!.allergies">{{ selectedPatient()!.allergies || 'Không ghi nhận' }}</span>
                  </div>
                  <div class="profile-item">
                    <span class="profile-label">Người liên hệ khẩn cấp</span>
                    <span class="profile-val">
                      {{ selectedPatient()!.emergencyContactName || '—' }}
                      @if (selectedPatient()!.hasAccount && selectedPatient()!.emergencyContactPhone) {
                        · {{ selectedPatient()!.emergencyContactPhone }}
                      }
                    </span>
                  </div>
                  <div class="profile-item full-width">
                    <span class="profile-label">Tiền sử bệnh</span>
                    <span class="profile-val pre-line">{{ selectedPatient()!.medicalHistorySummary || 'Không ghi nhận' }}</span>
                  </div>
                  @if (selectedPatient()!.hasAccount) {
                    <div class="profile-item">
                      <span class="profile-label">Tài khoản</span>
                      <span class="profile-val"><strong>{{ selectedPatient()!.username }}</strong></span>
                    </div>
                    <div class="profile-item">
                      <span class="profile-label">Email</span>
                      <span class="profile-val">{{ selectedPatient()!.email || '—' }}</span>
                    </div>
                    <div class="profile-item">
                      <span class="profile-label">Ngày đăng ký</span>
                      <span class="profile-val">{{ selectedPatient()!.createdAt ? (selectedPatient()!.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</span>
                    </div>
                  }
                </div>
              } @else {
                @if (historyLoading()) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Đang tải lịch sử khám...</p>
                  </div>
                } @else if (historyError()) {
                  <div class="form-error"><i class="bi bi-exclamation-circle-fill"></i> {{ historyError() }}</div>
                } @else if (historyRecords().length === 0) {
                  <div class="empty-state">
                    <i class="bi bi-journal-x"></i>
                    <p>Bệnh nhân chưa có lượt khám nào được ghi nhận.</p>
                  </div>
                } @else {
                  <div class="history-list">
                    @for (rec of historyRecords(); track rec.id) {
                      <div class="history-item">
                        <div class="history-date">
                          <strong>{{ rec.createdAt | date:'dd/MM/yyyy' }}</strong>
                          <span>{{ rec.createdAt | date:'HH:mm' }}</span>
                        </div>
                        <div class="history-body">
                          <div class="history-diagnosis">
                            {{ rec.finalDiagnosis || rec.preliminaryDiagnosis || 'Chưa có chẩn đoán' }}
                            @if (rec.icd10Code) {
                              <span class="code-badge">{{ rec.icd10Code }}</span>
                            }
                          </div>
                          <div class="history-meta">
                            <span><i class="bi bi-person-badge"></i> {{ rec.doctorName || '—' }}</span>
                            @if (rec.specialtyName) {
                              <span><i class="bi bi-diagram-3"></i> {{ rec.specialtyName }}</span>
                            }
                            @if (rec.ticketNumber) {
                              <span><i class="bi bi-ticket-perforated"></i> Phiếu {{ rec.ticketNumber }}</span>
                            }
                          </div>
                          @if (rec.symptoms) {
                            <div class="history-symptoms">Triệu chứng: {{ rec.symptoms }}</div>
                          }
                          @if (rec.revisitDate) {
                            <div class="history-revisit"><i class="bi bi-calendar-check"></i> Hẹn tái khám: {{ rec.revisitDate | date:'dd/MM/yyyy' }}</div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeDetailModal()">Đóng</button>
              <button class="btn btn-primary" (click)="editFromDetail()">
                <i class="bi bi-pencil-fill"></i> Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Xác Nhận Xóa -->
      @if (showDeleteModal() && patientToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header modal-header-danger">
              <h2 class="modal-title"><i class="bi bi-exclamation-triangle-fill"></i> Xác Nhận Xóa Hồ Sơ</h2>
              <button class="modal-close-btn" (click)="cancelDelete()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body text-center">
              <p>
                Bạn có chắc chắn muốn xóa hồ sơ bệnh nhân <strong>{{ patientToDelete()!.fullName }}</strong>
                (mã <code>{{ patientCode(patientToDelete()!.id) }}</code>)?
                @if (patientToDelete()!.hasAccount) {
                  Tài khoản đăng nhập <strong>{{ '@' + patientToDelete()!.username }}</strong> cũng sẽ bị xóa.
                }
              </p>
              <p class="delete-warning-note">
                <i class="bi bi-info-circle"></i> Lưu ý: Nếu bệnh nhân đã có lịch hẹn, phiếu khám hoặc bệnh án, hệ thống sẽ ngăn chặn việc xóa để đảm bảo toàn vẹn dữ liệu y tế (bạn có thể khóa tài khoản thay thế).
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
    .patient-page {
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

    .patient-cell {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .patient-avatar {
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

    .patient-avatar.avatar-female {
      background: linear-gradient(135deg, #ec4899, #db2777);
      box-shadow: 0 2px 6px rgba(236, 72, 153, 0.25);
    }

    .patient-meta {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .patient-name {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.92rem;
    }

    .patient-sub {
      font-size: 0.78rem;
      color: #64748b;
      font-family: Consolas, monospace;
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

    .profile-avatar.avatar-female {
      background: linear-gradient(135deg, #ec4899, #db2777);
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
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

    .stat-pill-walkin {
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #fed7aa;
    }

    .stat-pill-locked {
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .status-walkin {
      background: #ffedd5;
      color: #c2410c;
    }

    .medical-cell {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .blood-badge, .allergy-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      white-space: nowrap;
    }

    .blood-badge {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .allergy-badge {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
      cursor: help;
    }

    .text-muted { color: #94a3b8; }
    .text-danger { color: #dc2626 !important; font-weight: 600; }
    .pre-line { white-space: pre-line; }

    .visit-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.1rem;
    }

    .visit-cell strong {
      font-size: 1.05rem;
      color: #0f172a;
    }

    .visit-cell span {
      font-size: 0.75rem;
      color: #64748b;
      white-space: nowrap;
    }

    .account-info-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0c4a6e;
      padding: 0.7rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    textarea.form-control {
      resize: vertical;
      font-family: inherit;
    }

    /* Detail tabs & history */
    .detail-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .detail-tab {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 0.55rem 0.9rem;
      font-size: 0.88rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: -1px;
    }

    .detail-tab.active {
      color: #0284c7;
      border-bottom-color: #0284c7;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-item {
      display: flex;
      gap: 1rem;
      padding: 0.85rem 1rem;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #0284c7;
      border-radius: 8px;
      background: #ffffff;
    }

    .history-date {
      display: flex;
      flex-direction: column;
      min-width: 85px;
      font-size: 0.8rem;
      color: #64748b;
    }

    .history-date strong {
      color: #0f172a;
      font-size: 0.9rem;
    }

    .history-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
    }

    .history-diagnosis {
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .history-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      font-size: 0.8rem;
      color: #475569;
    }

    .history-symptoms {
      font-size: 0.82rem;
      color: #475569;
    }

    .history-revisit {
      font-size: 0.8rem;
      color: #047857;
      font-weight: 600;
    }
  `]
})
export class PatientsComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly medicalRecordService = inject(MedicalRecordService);

  readonly bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly today = new Date().toISOString().split('T')[0];

  patientList = signal<Patient[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Filters & Search
  searchKeyword = '';
  filterGender = '';
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
  editingPatient = signal<Patient | null>(null);
  formError = signal<string | null>(null);

  showDetailModal = signal<boolean>(false);
  selectedPatient = signal<Patient | null>(null);
  detailTab = signal<'info' | 'history'>('info');
  historyRecords = signal<MedicalRecordResponse[]>([]);
  historyLoading = signal<boolean>(false);
  historyError = signal<string | null>(null);

  showDeleteModal = signal<boolean>(false);
  patientToDelete = signal<Patient | null>(null);

  // Form Data
  formData: PatientRequest = this.initialForm();

  filteredPatients = signal<Patient[]>([]);

  // Statistics
  accountCount = computed(() => this.patientList().filter(p => p.hasAccount && p.status !== 'LOCKED').length);
  walkInCount = computed(() => this.patientList().filter(p => !p.hasAccount).length);
  lockedCount = computed(() => this.patientList().filter(p => p.hasAccount && p.status === 'LOCKED').length);

  // Pagination Helpers
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPatients().length / this.pageSize())));
  startIndex = computed(() => this.filteredPatients().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1);
  endIndex = computed(() => Math.min(this.filteredPatients().length, this.currentPage() * this.pageSize()));
  paginatedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPatients().slice(start, start + this.pageSize());
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
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading.set(true);
    this.patientService.getPatients().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data) {
          this.patientList.set(res.data);
          this.applyFilters(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.showAlert(err?.error?.message || 'Không thể tải danh sách bệnh nhân', 'danger');
      }
    });
  }

  applyFilters(resetPage: boolean = true): void {
    const kw = this.normalizeText(this.searchKeyword);
    const gender = (this.filterGender || '').trim();
    const st = (this.filterStatus || '').trim();

    const filtered = this.patientList().filter(p => {
      if (gender && p.gender !== gender) return false;
      if (st === 'NO_ACCOUNT' && p.hasAccount) return false;
      if ((st === 'ACTIVE' || st === 'LOCKED') && (!p.hasAccount || (p.status || 'ACTIVE') !== st)) return false;
      if (!kw) return true;
      return [this.patientCode(p.id), String(p.id), p.fullName, p.phoneNumber, p.nationalId, p.username, p.email, p.emergencyContactPhone]
        .some(v => v && this.normalizeText(v).includes(kw));
    });

    this.filteredPatients.set(filtered);
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

  setQuickFilter(status: string): void {
    // Click lại vào bộ lọc đang chọn thì bỏ chọn
    this.filterStatus = status && this.filterStatus === status ? '' : status;
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
    this.editingPatient.set(null);
    this.formError.set(null);
    this.formData = this.initialForm();
    this.showModal.set(true);
  }

  openEditModal(item: Patient): void {
    this.isEditing.set(true);
    this.editingPatient.set(item);
    this.formError.set(null);
    this.formData = {
      fullName: item.fullName || '',
      gender: item.gender || 'Nam',
      dateOfBirth: item.dateOfBirth || '',
      address: item.address || '',
      nationalId: item.nationalId || '',
      phoneNumber: item.phoneNumber || '',
      bloodGroup: item.bloodGroup || '',
      allergies: item.allergies || '',
      medicalHistorySummary: item.medicalHistorySummary || '',
      emergencyContactName: item.emergencyContactName || '',
      emergencyContactPhone: item.hasAccount ? (item.emergencyContactPhone || '') : ''
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.formError.set(null);
  }

  savePatient(): void {
    this.formError.set(null);
    const phonePattern = /^[0-9+ ]{8,15}$/;
    const hasAccount = !!this.editingPatient()?.hasAccount;

    if (!this.formData.fullName || !this.formData.fullName.trim()) {
      this.formError.set('Họ và tên không được để trống');
      return;
    }

    const phone = (this.formData.phoneNumber || '').trim();
    if (!phone && !hasAccount) {
      this.formError.set('Số điện thoại liên hệ không được để trống (dùng để tra cứu khi tiếp đón)');
      return;
    }
    if (phone && !phonePattern.test(phone)) {
      this.formError.set('Số điện thoại không hợp lệ');
      return;
    }

    const emergencyPhone = (this.formData.emergencyContactPhone || '').trim();
    if (emergencyPhone && !phonePattern.test(emergencyPhone)) {
      this.formError.set('Số điện thoại người liên hệ không hợp lệ');
      return;
    }

    if (this.formData.dateOfBirth && this.formData.dateOfBirth > this.today) {
      this.formError.set('Ngày sinh không được lớn hơn ngày hiện tại');
      return;
    }

    const payload: PatientRequest = {
      ...this.formData,
      dateOfBirth: this.formData.dateOfBirth || undefined
    };

    this.submitting.set(true);
    const editing = this.editingPatient();

    const request$ = this.isEditing() && editing
      ? this.patientService.updatePatient(editing.id, payload)
      : this.patientService.createPatient(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeModal();
        this.showAlert(this.isEditing() ? 'Đã cập nhật hồ sơ bệnh nhân thành công!' : 'Đã tạo hồ sơ bệnh nhân mới thành công!', 'success');
        this.loadPatients();
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err?.error?.message || 'Có lỗi xảy ra khi lưu hồ sơ bệnh nhân');
      }
    });
  }

  viewDetail(item: Patient): void {
    this.selectedPatient.set(item);
    this.detailTab.set('info');
    this.showDetailModal.set(true);
    this.loadHistory(item.id);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedPatient.set(null);
    this.historyRecords.set([]);
  }

  editFromDetail(): void {
    const patient = this.selectedPatient();
    this.closeDetailModal();
    if (patient) {
      this.openEditModal(patient);
    }
  }

  private loadHistory(patientId: number): void {
    this.historyLoading.set(true);
    this.historyError.set(null);
    this.historyRecords.set([]);
    this.medicalRecordService.getPatientMedicalHistory(patientId).subscribe({
      next: (res) => {
        // Bỏ qua nếu người dùng đã chuyển sang xem bệnh nhân khác
        if (this.selectedPatient()?.id !== patientId) return;
        this.historyLoading.set(false);
        this.historyRecords.set(res.data?.records || []);
      },
      error: (err) => {
        if (this.selectedPatient()?.id !== patientId) return;
        this.historyLoading.set(false);
        this.historyError.set(err?.error?.message || 'Không thể tải lịch sử khám của bệnh nhân');
      }
    });
  }

  toggleStatus(item: Patient): void {
    if (!item.hasAccount) return;
    const newStatus: PatientAccountStatus = item.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    const actionLabel = newStatus === 'ACTIVE' ? 'mở khóa' : 'khóa';

    this.patientService.updateStatus(item.id, newStatus).subscribe({
      next: () => {
        this.showAlert(`Đã ${actionLabel} tài khoản của bệnh nhân ${item.fullName} thành công!`, 'success');
        this.loadPatients();
      },
      error: (err) => {
        this.showAlert(err?.error?.message || `Không thể ${actionLabel} tài khoản bệnh nhân`, 'danger');
      }
    });
  }

  confirmDelete(item: Patient): void {
    this.patientToDelete.set(item);
    this.showDeleteModal.set(true);
  }

  cancelDelete(): void {
    this.showDeleteModal.set(false);
    this.patientToDelete.set(null);
  }

  executeDelete(): void {
    const patient = this.patientToDelete();
    if (!patient) return;

    this.submitting.set(true);
    this.patientService.deletePatient(patient.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.cancelDelete();
        this.showAlert(`Đã xóa hồ sơ bệnh nhân ${patient.fullName} khỏi hệ thống!`, 'success');
        this.loadPatients();
      },
      error: (err) => {
        this.submitting.set(false);
        this.cancelDelete();
        this.showAlert(err?.error?.message || 'Không thể xóa hồ sơ bệnh nhân này', 'danger');
      }
    });
  }

  patientCode(id: number): string {
    return 'BN' + String(id).padStart(6, '0');
  }

  ageOf(dob?: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  initials(name: string): string {
    if (!name) return 'BN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private normalizeText(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .trim();
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

  private initialForm(): PatientRequest {
    return {
      fullName: '',
      gender: 'Nam',
      dateOfBirth: '',
      address: '',
      nationalId: '',
      phoneNumber: '',
      bloodGroup: '',
      allergies: '',
      medicalHistorySummary: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    };
  }
}
