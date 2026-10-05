import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpecialtyService } from '../../services/specialty.service';
import { Specialty, SpecialtyDetail, SpecialtyRequest } from '../../models/specialty.model';

@Component({
  selector: 'app-specialties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="specialties-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-diagram-3-fill"></i> Tầng Danh Mục Hệ Thống
          </div>
          <h1 class="page-title">Quản Lý Chuyên Khoa</h1>
          <p class="page-subtitle">
            Cấu hình danh mục chuyên khoa phòng khám, định tuyến phân bổ bác sĩ và phòng điều trị
          </p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-circle-fill"></i> Thêm Chuyên Khoa Mới
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
            (ngModelChange)="filterSpecialties()"
            placeholder="Tìm kiếm theo tên chuyên khoa hoặc mô tả..."
            class="search-input"
          />
        </div>
        <div class="stats-summary">
          <span class="stat-pill">
            Tổng cộng: <strong>{{ specialties().length }}</strong> chuyên khoa
          </span>
          <span class="stat-pill stat-pill-highlight">
            Đội ngũ: <strong>{{ totalDoctors() }}</strong> bác sĩ
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

      <!-- Grid Cards of Specialties -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải danh mục chuyên khoa...</p>
        </div>
      } @else if (filteredSpecialties().length === 0) {
        <div class="empty-state">
          <i class="bi bi-inbox-fill"></i>
          <h3>Không tìm thấy chuyên khoa nào</h3>
          <p>Thử tìm kiếm với từ khóa khác hoặc nhấn "Thêm Chuyên Khoa Mới" để tạo.</p>
        </div>
      } @else {
        <div class="specialties-grid">
          @for (item of filteredSpecialties(); track item.id) {
            <div class="specialty-card">
              <div class="card-top">
                <div class="card-icon">
                  @if (item.iconUrl) {
                    <i [class]="item.iconUrl"></i>
                  } @else {
                    <i class="bi bi-heart-pulse-fill"></i>
                  }
                </div>
                <div class="card-badges">
                  <span class="badge badge-doctor-count">
                    <i class="bi bi-person-badge-fill"></i> {{ item.doctorCount }} Bác sĩ
                  </span>
                </div>
              </div>

              <h3 class="card-title">{{ item.name }}</h3>
              <p class="card-desc">{{ item.description || 'Chưa có mô tả chi tiết cho chuyên khoa này.' }}</p>

              <div class="card-footer">
                <button class="btn btn-sm btn-ghost" (click)="viewDoctors(item)">
                  <i class="bi bi-eye"></i> Xem bác sĩ
                </button>
                <div class="action-buttons">
                  <button class="btn btn-sm btn-outline-primary" (click)="openEditModal(item)" title="Chỉnh sửa">
                    <i class="bi bi-pencil-square"></i> Sửa
                  </button>
                  <button class="btn btn-sm btn-outline-danger" (click)="confirmDelete(item)" title="Xóa chuyên khoa">
                    <i class="bi bi-trash3"></i> Xóa
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Thêm / Chỉnh Sửa Chuyên Khoa -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                {{ isEditing() ? 'Cập Nhật Chuyên Khoa' : 'Thêm Chuyên Khoa Mới' }}
              </h2>
              <button class="modal-close-btn" (click)="closeModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Tên chuyên khoa</label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  placeholder="Ví dụ: Khoa Khám bệnh tổng quát, Khoa Tim mạch..."
                  class="form-control"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Biểu tượng Icon (Bootstrap Icons)</label>
                <div class="input-with-icon">
                  <input
                    type="text"
                    [(ngModel)]="formData.iconUrl"
                    placeholder="bi bi-heart-pulse-fill"
                    class="form-control"
                  />
                  <div class="icon-preview">
                    <i [class]="formData.iconUrl || 'bi bi-heart-pulse-fill'"></i>
                  </div>
                </div>
                <small class="form-hint">Gợi ý: bi bi-heart-pulse, bi bi-capsule, bi bi-hospital, bi bi-eye, bi bi-activity</small>
              </div>

              <div class="form-group">
                <label class="form-label">Mô tả nhiệm vụ & chức năng</label>
                <textarea
                  [(ngModel)]="formData.description"
                  rows="4"
                  placeholder="Mô tả phạm vi khám, đối tượng điều trị..."
                  class="form-control"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeModal()">Hủy bỏ</button>
              <button class="btn btn-primary" [disabled]="submitting() || !formData.name.trim()" (click)="saveSpecialty()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  <i class="bi bi-check2-circle"></i> {{ isEditing() ? 'Lưu Thay Đổi' : 'Tạo Chuyên Khoa' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Chi Tiết Danh Sách Bác Sĩ Của Khoa -->
      @if (selectedDetail()) {
        <div class="modal-backdrop" (click)="selectedDetail.set(null)">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-hospital"></i> Bác sĩ thuộc: {{ selectedDetail()?.name }}
              </h2>
              <button class="modal-close-btn" (click)="selectedDetail.set(null)">×</button>
            </div>
            <div class="modal-body">
              @if (selectedDetail()!.doctors.length === 0) {
                <div class="empty-state-sm">
                  <i class="bi bi-person-x"></i>
                  <p>Hiện chưa có bác sĩ nào được phân bổ vào chuyên khoa này.</p>
                </div>
              } @else {
                <div class="doctor-list-table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Mã BS</th>
                        <th>Họ và Tên Bác sĩ</th>
                        <th>Học vị / Chức danh</th>
                        <th>Kinh nghiệm</th>
                        <th>Thời gian khám TB</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (doc of selectedDetail()!.doctors; track doc.id) {
                        <tr>
                          <td><span class="code-badge">{{ doc.employeeCode || ('DOC' + doc.id) }}</span></td>
                          <td><strong>{{ doc.fullName }}</strong></td>
                          <td><span class="badge badge-accent">{{ doc.academicTitle || 'Bác sĩ chuyên khoa' }}</span></td>
                          <td>{{ doc.yearsOfExperience || 0 }} năm</td>
                          <td><i class="bi bi-clock"></i> {{ doc.averageConsultationTime || 15 }} phút/lượt</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" (click)="selectedDetail.set(null)">Đóng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .specialties-page {
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

    .search-filter-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04);
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 280px;
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

    .stats-summary {
      display: flex;
      gap: 0.75rem;
    }

    .stat-pill {
      background: #f1f5f9;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-full);
      font-size: 0.85rem;
      color: var(--text-main);
    }

    .stat-pill-highlight {
      background: var(--primary-50);
      color: var(--primary-800);
      border: 1px solid var(--primary-200);
    }

    .specialties-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    .specialty-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      transition: all 0.25s ease;
    }

    .specialty-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px -4px rgba(2, 132, 199, 0.15);
      border-color: var(--primary-300);
    }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }

    .card-icon {
      width: 50px;
      height: 50px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
    }

    .badge-doctor-count {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-size: 0.8rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-full);
      font-weight: 700;
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0 0 0.5rem;
    }

    .card-desc {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
      flex-grow: 1;
      margin-bottom: 1.5rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #f1f5f9;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--primary-700);
      font-weight: 600;
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .btn-ghost:hover {
      background: var(--primary-50);
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
      max-width: 780px;
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

    .form-group {
      margin-bottom: 1.25rem;
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
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .input-with-icon {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .icon-preview {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background: var(--primary-50);
      color: var(--primary-700);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      border: 1px solid var(--primary-200);
    }

    .form-hint {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.25rem;
      display: block;
    }

    /* Table */
    .doctor-list-table-wrapper {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      text-align: left;
    }

    .data-table th {
      background: #f8fafc;
      padding: 0.75rem 1rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
    }

    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-main);
    }

    .code-badge {
      font-family: monospace;
      font-weight: 700;
      background: #f1f5f9;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      color: var(--primary-800);
    }

    .badge-accent {
      background: #eff6ff;
      color: var(--primary-700);
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
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

    .empty-state-sm {
      text-align: center;
      padding: 2.5rem 1rem;
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

    .alert-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .alert-danger {
      background: #fff1f2;
      color: #9f1239;
      border: 1px solid #fecdd3;
    }

    .alert-close {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: inherit;
    }
  `]
})
export class SpecialtiesComponent implements OnInit {
  private readonly specialtyService = inject(SpecialtyService);

  readonly specialties = signal<Specialty[]>([]);
  readonly filteredSpecialties = signal<Specialty[]>([]);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly showModal = signal(false);
  readonly isEditing = signal(false);
  readonly selectedDetail = signal<SpecialtyDetail | null>(null);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  searchKeyword = '';
  editingId: number | null = null;
  formData: SpecialtyRequest = {
    name: '',
    description: '',
    iconUrl: 'bi bi-heart-pulse-fill'
  };

  get totalDoctors(): () => number {
    return () => this.specialties().reduce((sum, item) => sum + item.doctorCount, 0);
  }

  ngOnInit(): void {
    this.loadSpecialties();
  }

  loadSpecialties(): void {
    this.loading.set(true);
    this.specialtyService.getAllSpecialties().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.specialties.set(res.data);
          this.filterSpecialties();
        }
        this.loading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải danh sách chuyên khoa', 'danger');
        this.loading.set(false);
      }
    });
  }

  filterSpecialties(): void {
    const kw = this.searchKeyword.trim().toLowerCase();
    if (!kw) {
      this.filteredSpecialties.set(this.specialties());
      return;
    }
    const filtered = this.specialties().filter(s =>
      s.name.toLowerCase().includes(kw) || (s.description && s.description.toLowerCase().includes(kw))
    );
    this.filteredSpecialties.set(filtered);
  }

  openAddModal(): void {
    this.isEditing.set(false);
    this.editingId = null;
    this.formData = {
      name: '',
      description: '',
      iconUrl: 'bi bi-heart-pulse-fill'
    };
    this.showModal.set(true);
  }

  openEditModal(item: Specialty): void {
    this.isEditing.set(true);
    this.editingId = item.id;
    this.formData = {
      name: item.name,
      description: item.description || '',
      iconUrl: item.iconUrl || 'bi bi-heart-pulse-fill'
    };
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveSpecialty(): void {
    if (!this.formData.name || !this.formData.name.trim()) {
      this.showAlert('Vui lòng nhập tên chuyên khoa!', 'danger');
      return;
    }

    this.submitting.set(true);
    if (this.isEditing() && this.editingId) {
      this.specialtyService.updateSpecialty(this.editingId, this.formData).subscribe({
        next: () => {
          this.showAlert('Đã cập nhật chuyên khoa thành công!', 'success');
          this.submitting.set(false);
          this.closeModal();
          this.loadSpecialties();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Lỗi khi cập nhật chuyên khoa', 'danger');
          this.submitting.set(false);
        }
      });
    } else {
      this.specialtyService.createSpecialty(this.formData).subscribe({
        next: () => {
          this.showAlert('Đã thêm chuyên khoa mới thành công!', 'success');
          this.submitting.set(false);
          this.closeModal();
          this.loadSpecialties();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Lỗi khi tạo chuyên khoa', 'danger');
          this.submitting.set(false);
        }
      });
    }
  }

  viewDoctors(item: Specialty): void {
    this.specialtyService.getSpecialtyById(item.id).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedDetail.set(res.data);
        }
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể xem thông tin chi tiết', 'danger');
      }
    });
  }

  confirmDelete(item: Specialty): void {
    if (confirm(`Bạn có chắc chắn muốn xóa chuyên khoa "${item.name}"?`)) {
      this.specialtyService.deleteSpecialty(item.id).subscribe({
        next: () => {
          this.showAlert(`Đã xóa chuyên khoa "${item.name}" thành công!`, 'success');
          this.loadSpecialties();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Không thể xóa chuyên khoa này.', 'danger');
        }
      });
    }
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
