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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Bệnh nhân</h1>
          <p class="page-subtitle">{{ patientList().length }} hồ sơ, {{ walkInCount() }} vãng lai</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-lg"></i> Thêm bệnh nhân
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
            placeholder="Tìm theo mã BN, họ tên, SĐT, CCCD, tài khoản, email"
            class="search-input"
          />
          @if (searchKeyword) {
            <button type="button" class="btn-clear-search" (click)="clearSearch()" title="Xóa từ khóa" aria-label="Xóa từ khóa">
              <i class="bi bi-x-lg"></i>
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
          <option value="">Tất cả hồ sơ</option>
          <option value="ACTIVE">Có tài khoản, hoạt động</option>
          <option value="LOCKED">Có tài khoản, đã khóa</option>
          <option value="NO_ACCOUNT">Vãng lai (chưa có tài khoản)</option>
        </select>
        <div class="quick-filters">
          <button type="button" class="quick-filter" [class.active]="!filterStatus" (click)="setQuickFilter('')">
            Tất cả <span class="mono">{{ patientList().length }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterStatus === 'ACTIVE'" (click)="setQuickFilter('ACTIVE')">
            Hoạt động <span class="mono">{{ accountCount() }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterStatus === 'NO_ACCOUNT'" (click)="setQuickFilter('NO_ACCOUNT')">
            Vãng lai <span class="mono">{{ walkInCount() }}</span>
          </button>
          <button type="button" class="quick-filter" [class.active]="filterStatus === 'LOCKED'" (click)="setQuickFilter('LOCKED')">
            Đã khóa <span class="mono">{{ lockedCount() }}</span>
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
            <p>Đang tải danh sách bệnh nhân...</p>
          </div>
        } @else if (filteredPatients().length === 0) {
          <div class="empty-state">
            <h3>Không có bệnh nhân phù hợp</h3>
            <p>Thử đổi từ khoá hoặc bộ lọc.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 100px;">Mã BN</th>
                  <th style="min-width: 240px;">Bệnh nhân</th>
                  <th style="min-width: 190px;">Liên hệ</th>
                  <th style="min-width: 130px;">CCCD/CMND</th>
                  <th style="min-width: 130px;">Thông tin y tế</th>
                  <th style="width: 150px;">Lượt khám</th>
                  <th style="width: 120px;">Tài khoản</th>
                  <th style="width: 140px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedPatients(); track item.id) {
                  <tr>
                    <td class="mono text-muted">{{ patientCode(item.id) }}</td>
                    <td>
                      <div class="person-cell">
                        <div class="avatar">{{ initials(item.fullName) }}</div>
                        <div class="person-meta">
                          <strong class="person-name">{{ item.fullName }}</strong>
                          <span class="person-sub">
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
                        <span>{{ item.phoneNumber || '—' }}</span>
                        @if (item.email) {
                          <span class="text-muted">{{ item.email }}</span>
                        }
                      </div>
                    </td>
                    <td class="mono">{{ item.nationalId || '—' }}</td>
                    <td>
                      <div class="medical-cell">
                        @if (item.bloodGroup) {
                          <span class="mono" title="Nhóm máu">{{ item.bloodGroup }}</span>
                        }
                        @if (item.allergies) {
                          <span class="status warning" [title]="'Dị ứng: ' + item.allergies">Dị ứng</span>
                        }
                        @if (!item.bloodGroup && !item.allergies) {
                          <span class="text-muted">—</span>
                        }
                      </div>
                    </td>
                    <td style="white-space: nowrap;">
                      <div class="contact-cell">
                        <span class="mono">{{ item.totalVisits || 0 }} lượt</span>
                        <span class="text-muted">{{ item.lastVisitAt ? ('Gần nhất ' + (item.lastVisitAt | date:'dd/MM/yyyy')) : 'Chưa khám' }}</span>
                      </div>
                    </td>
                    <td>
                      @if (!item.hasAccount) {
                        <span class="status">Vãng lai</span>
                      } @else if (item.status === 'LOCKED') {
                        <span class="status danger">Đã khóa</span>
                      } @else {
                        <span class="status success">Hoạt động</span>
                      }
                    </td>
                    <td>
                      <div class="row-actions">
                        <button class="icon-btn" (click)="viewDetail(item)" title="Xem hồ sơ và lịch sử khám" aria-label="Xem hồ sơ">
                          <i class="bi bi-eye"></i>
                        </button>
                        <button class="icon-btn" (click)="openEditModal(item)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                          <i class="bi bi-pencil"></i>
                        </button>
                        @if (item.hasAccount) {
                          <button class="icon-btn" (click)="toggleStatus(item)"
                                  [title]="item.status === 'LOCKED' ? 'Mở khóa tài khoản' : 'Khóa tài khoản'"
                                  [attr.aria-label]="item.status === 'LOCKED' ? 'Mở khóa' : 'Khóa'">
                            <i class="bi" [ngClass]="item.status === 'LOCKED' ? 'bi-unlock' : 'bi-lock'"></i>
                          </button>
                        }
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
              <span>{{ startIndex() }}–{{ endIndex() }} / {{ filteredPatients().length }}</span>
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

      <!-- Modal thêm / sửa bệnh nhân -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing() ? 'Sửa hồ sơ bệnh nhân' : 'Thêm bệnh nhân' }}</h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (formError()) {
                <div class="form-error">{{ formError() }}</div>
              }

              @if (editingPatient()?.hasAccount) {
                <div class="account-info-box">
                  Bệnh nhân có tài khoản <strong>{{ editingPatient()!.username }}</strong>
                  ({{ editingPatient()!.email || 'chưa có email' }}). Mật khẩu do bệnh nhân tự quản lý.
                </div>
              } @else if (!isEditing()) {
                <div class="account-info-box">
                  Hồ sơ tạo tại đây là hồ sơ vãng lai (chưa có tài khoản). Lễ tân tra cứu bằng số điện thoại khi tiếp đón.
                </div>
              }

              <!-- Thông tin hành chính -->
              <h3 class="form-section-title">Thông tin hành chính</h3>
              <div class="form-grid">
                <div class="form-group form-group-full">
                  <label class="form-label required">Họ và tên</label>
                  <input type="text" [(ngModel)]="formData.fullName" class="form-control" placeholder="vd: Nguyễn Văn An" />
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
                  <input type="date" [(ngModel)]="formData.dateOfBirth" class="form-control" [max]="today" />
                </div>
                <div class="form-group">
                  <label class="form-label" [class.required]="!editingPatient()?.hasAccount">Số điện thoại</label>
                  <input type="tel" [(ngModel)]="formData.phoneNumber" class="form-control" placeholder="09xxxxxxxx" />
                </div>
                <div class="form-group">
                  <label class="form-label">Số CCCD/CMND</label>
                  <input type="text" [(ngModel)]="formData.nationalId" class="form-control" placeholder="12 chữ số" />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Địa chỉ</label>
                  <input type="text" [(ngModel)]="formData.address" class="form-control" placeholder="Số nhà, đường, phường/xã, tỉnh/thành phố" />
                </div>
              </div>

              <!-- Thông tin y tế -->
              <h3 class="form-section-title">Thông tin y tế</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Nhóm máu</label>
                  <select [(ngModel)]="formData.bloodGroup" class="form-control">
                    <option value="">Chưa xác định</option>
                    @for (bg of bloodGroups; track bg) {
                      <option [value]="bg">{{ bg }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Dị ứng</label>
                  <input type="text" [(ngModel)]="formData.allergies" class="form-control" placeholder="vd: Penicillin, hải sản" />
                </div>
                <div class="form-group form-group-full">
                  <label class="form-label">Tiền sử bệnh</label>
                  <textarea [(ngModel)]="formData.medicalHistorySummary" class="form-control" rows="3" placeholder="Bệnh mãn tính, phẫu thuật, tiền sử gia đình"></textarea>
                </div>
              </div>

              <!-- Người liên hệ khẩn cấp -->
              <h3 class="form-section-title">Người liên hệ khẩn cấp</h3>
              <div class="form-grid">
                <div class="form-group" [class.form-group-full]="!editingPatient()?.hasAccount">
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
                  {{ isEditing() ? 'Lưu thay đổi' : 'Thêm bệnh nhân' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal hồ sơ bệnh nhân & lịch sử khám -->
      @if (showDetailModal() && selectedPatient()) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Hồ sơ bệnh nhân</h2>
              <button class="modal-close-btn" (click)="closeDetailModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-head">
                <div class="avatar avatar-lg">{{ initials(selectedPatient()!.fullName) }}</div>
                <div>
                  <h3 class="detail-name">{{ selectedPatient()!.fullName }}</h3>
                  <div class="detail-tags">
                    <span class="mono text-muted">{{ patientCode(selectedPatient()!.id) }}</span>
                    @if (selectedPatient()!.bloodGroup) {
                      <span>Nhóm máu {{ selectedPatient()!.bloodGroup }}</span>
                    }
                    @if (!selectedPatient()!.hasAccount) {
                      <span class="status">Vãng lai</span>
                    } @else if (selectedPatient()!.status === 'LOCKED') {
                      <span class="status danger">Đã khóa</span>
                    } @else {
                      <span class="status success">Hoạt động</span>
                    }
                  </div>
                </div>
              </div>

              <div class="detail-tabs">
                <button type="button" class="detail-tab" [class.active]="detailTab() === 'info'" (click)="detailTab.set('info')">
                  Thông tin hồ sơ
                </button>
                <button type="button" class="detail-tab" [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">
                  Lịch sử khám ({{ selectedPatient()!.totalVisits || 0 }})
                </button>
              </div>

              @if (detailTab() === 'info') {
                <dl class="detail-grid">
                  <dt>Giới tính</dt><dd>{{ selectedPatient()!.gender || '—' }}</dd>
                  <dt>Ngày sinh</dt>
                  <dd>
                    @if (selectedPatient()!.dateOfBirth) {
                      {{ selectedPatient()!.dateOfBirth | date:'dd/MM/yyyy' }} ({{ ageOf(selectedPatient()!.dateOfBirth) }} tuổi)
                    } @else {
                      —
                    }
                  </dd>
                  <dt>Số điện thoại</dt><dd>{{ selectedPatient()!.phoneNumber || '—' }}</dd>
                  <dt>Số CCCD/CMND</dt><dd>{{ selectedPatient()!.nationalId || '—' }}</dd>
                  <dt>Địa chỉ</dt><dd class="span-3">{{ selectedPatient()!.address || '—' }}</dd>
                  <dt>Dị ứng</dt><dd [class.text-danger]="selectedPatient()!.allergies">{{ selectedPatient()!.allergies || 'Không ghi nhận' }}</dd>
                  <dt>Liên hệ khẩn cấp</dt>
                  <dd>
                    {{ selectedPatient()!.emergencyContactName || '—' }}
                    @if (selectedPatient()!.hasAccount && selectedPatient()!.emergencyContactPhone) {
                      · {{ selectedPatient()!.emergencyContactPhone }}
                    }
                  </dd>
                  <dt>Tiền sử bệnh</dt><dd class="span-3 pre-line">{{ selectedPatient()!.medicalHistorySummary || 'Không ghi nhận' }}</dd>
                  @if (selectedPatient()!.hasAccount) {
                    <dt>Tài khoản</dt><dd>{{ selectedPatient()!.username }}</dd>
                    <dt>Email</dt><dd>{{ selectedPatient()!.email || '—' }}</dd>
                    <dt>Ngày đăng ký</dt><dd>{{ selectedPatient()!.createdAt ? (selectedPatient()!.createdAt | date:'dd/MM/yyyy HH:mm') : '—' }}</dd>
                  }
                </dl>
              } @else {
                @if (historyLoading()) {
                  <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Đang tải lịch sử khám...</p>
                  </div>
                } @else if (historyError()) {
                  <div class="form-error">{{ historyError() }}</div>
                } @else if (historyRecords().length === 0) {
                  <div class="empty-state">
                    <p>Chưa có lượt khám nào.</p>
                  </div>
                } @else {
                  <div class="history-list">
                    @for (rec of historyRecords(); track rec.id) {
                      <div class="history-item">
                        <div class="history-date">
                          <strong class="mono">{{ rec.createdAt | date:'dd/MM/yyyy' }}</strong>
                          <span class="mono">{{ rec.createdAt | date:'HH:mm' }}</span>
                        </div>
                        <div class="history-body">
                          <div class="history-diagnosis">
                            {{ rec.finalDiagnosis || rec.preliminaryDiagnosis || 'Chưa có chẩn đoán' }}
                            @if (rec.icd10Code) {
                              <span class="mono text-muted">{{ rec.icd10Code }}</span>
                            }
                          </div>
                          <div class="history-meta">
                            <span>{{ rec.doctorName || '—' }}</span>
                            @if (rec.specialtyName) {
                              <span>{{ rec.specialtyName }}</span>
                            }
                            @if (rec.ticketNumber) {
                              <span>Phiếu <span class="mono">{{ rec.ticketNumber }}</span></span>
                            }
                          </div>
                          @if (rec.symptoms) {
                            <div class="history-symptoms">Triệu chứng: {{ rec.symptoms }}</div>
                          }
                          @if (rec.revisitDate) {
                            <div class="history-revisit">Hẹn tái khám: <span class="mono">{{ rec.revisitDate | date:'dd/MM/yyyy' }}</span></div>
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
              <button class="btn btn-primary" (click)="editFromDetail()">Chỉnh sửa</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal xác nhận xóa -->
      @if (showDeleteModal() && patientToDelete()) {
        <div class="modal-backdrop" (click)="cancelDelete()">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Xóa hồ sơ bệnh nhân</h2>
              <button class="modal-close-btn" (click)="cancelDelete()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p>
                Xóa hồ sơ bệnh nhân <strong>{{ patientToDelete()!.fullName }}</strong>
                (<span class="mono">{{ patientCode(patientToDelete()!.id) }}</span>)?
                @if (patientToDelete()!.hasAccount) {
                  Tài khoản đăng nhập <strong>{{ patientToDelete()!.username }}</strong> cũng sẽ bị xóa.
                }
              </p>
              <p class="delete-warning-note">
                Không thể xóa nếu bệnh nhân đã có lịch hẹn, phiếu khám hoặc bệnh án. Khi đó hãy khóa tài khoản thay vì xóa.
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

    .medical-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .account-info-box {
      padding: 8px 12px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--text-secondary);
    }

    .detail-grid .span-3 { grid-column: span 3; }
    .pre-line { white-space: pre-line; }
    .text-danger { color: var(--danger-text); }

    .detail-tabs {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 16px;
    }

    .detail-tab {
      padding: 8px 0;
      margin-bottom: -1px;
      border: none;
      border-bottom: 2px solid transparent;
      background: none;
      font: inherit;
      font-size: 14px;
      color: var(--text-muted);
      cursor: pointer;
      transition: color 0.12s ease, border-color 0.12s ease;
    }

    .detail-tab:hover { color: var(--text-main); }

    .detail-tab.active {
      color: var(--primary-700);
      border-bottom-color: var(--primary-600);
      font-weight: 500;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .history-item {
      display: flex;
      gap: 16px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-color);
    }

    .history-item:last-child { border-bottom: none; }

    .history-date {
      display: flex;
      flex-direction: column;
      min-width: 84px;
      font-size: 13px;
    }

    .history-date strong { font-weight: 500; }
    .history-date span { color: var(--text-muted); font-size: 12px; }

    .history-body {
      flex: 1;
      min-width: 0;
      font-size: 13px;
    }

    .history-diagnosis {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-main);
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .history-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      margin-top: 2px;
      color: var(--text-muted);
    }

    .history-symptoms,
    .history-revisit {
      margin-top: 4px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 120px 1fr; }
      .detail-grid .span-3 { grid-column: auto; }
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
