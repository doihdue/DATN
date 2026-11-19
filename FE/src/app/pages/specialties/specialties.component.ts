import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpecialtyService } from '../../services/specialty.service';
import { Specialty, SpecialtyDetail, SpecialtyRequest } from '../../models/specialty.model';

@Component({
  selector: 'app-specialties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Chuyên khoa</h1>
          <p class="page-subtitle">{{ specialties().length }} chuyên khoa, {{ totalDoctors() }} bác sĩ</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-lg"></i> Thêm chuyên khoa
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

      <div class="panel">
        <div class="toolbar">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              [(ngModel)]="searchKeyword"
              (ngModelChange)="filterSpecialties()"
              placeholder="Tìm theo tên hoặc mô tả"
              class="search-input"
            />
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách chuyên khoa...</p>
          </div>
        } @else if (filteredSpecialties().length === 0) {
          <div class="empty-state">
            <h3>Không có chuyên khoa phù hợp</h3>
            <p>Thử đổi từ khoá tìm kiếm.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 90px;">Mã</th>
                  <th style="min-width: 220px;">Tên chuyên khoa</th>
                  <th style="min-width: 320px;">Mô tả</th>
                  <th style="width: 120px; text-align: right;">Bác sĩ</th>
                  <th style="width: 90px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedSpecialties(); track item.id) {
                  <tr>
                    <td class="mono text-muted">CK-{{ item.id < 10 ? '0' + item.id : item.id }}</td>
                    <td>
                      <div class="specialty-cell">
                        <i class="specialty-icon" [class]="item.iconUrl || 'bi bi-heart-pulse'"></i>
                        <strong class="specialty-name">{{ item.name }}</strong>
                      </div>
                    </td>
                    <td>
                      @if (item.description) {
                        <p class="specialty-desc" [title]="item.description">{{ item.description }}</p>
                      } @else {
                        <span class="text-muted">Chưa có mô tả</span>
                      }
                    </td>
                    <td style="text-align: right;">
                      <button class="link-btn mono" (click)="viewDoctors(item)" title="Xem danh sách bác sĩ thuộc khoa">
                        {{ item.doctorCount }} bác sĩ
                      </button>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button class="icon-btn" (click)="openEditModal(item)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                          <i class="bi bi-pencil"></i>
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

          <div class="pagination-footer">
            <div class="pagination-info">
              <span>{{ startIndex() }}–{{ endIndex() }} / {{ filteredSpecialties().length }}</span>
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
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === 1" (click)="prevPage()" title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>
              <div class="page-numbers-group">
                @for (p of pagesList(); track p) {
                  <button class="btn-page btn-page-num" [class.active]="currentPage() === p" (click)="goToPage(p)">
                    {{ p }}
                  </button>
                }
              </div>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="nextPage()" title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn-page btn-page-nav" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Đến trang cuối cùng">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal thêm / sửa chuyên khoa -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditing() ? 'Sửa chuyên khoa' : 'Thêm chuyên khoa' }}</h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Tên chuyên khoa</label>
                <input
                  type="text"
                  [(ngModel)]="formData.name"
                  placeholder="vd: Tim mạch"
                  class="form-control"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Biểu tượng (Bootstrap Icons)</label>
                <div class="input-with-icon">
                  <input
                    type="text"
                    [(ngModel)]="formData.iconUrl"
                    placeholder="bi bi-heart-pulse"
                    class="form-control"
                  />
                  <div class="icon-preview" title="Xem trước">
                    <i [class]="formData.iconUrl || 'bi bi-heart-pulse-fill'"></i>
                  </div>
                </div>
                <small class="form-hint">vd: bi bi-heart-pulse, bi bi-capsule, bi bi-hospital, bi bi-eye, bi bi-activity</small>
              </div>

              <div class="form-group">
                <label class="form-label">Mô tả</label>
                <textarea
                  [(ngModel)]="formData.description"
                  rows="4"
                  placeholder="Phạm vi khám, đối tượng điều trị"
                  class="form-control"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
              <button class="btn btn-primary" [disabled]="submitting() || !formData.name.trim()" (click)="saveSpecialty()">
                @if (submitting()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  {{ isEditing() ? 'Lưu thay đổi' : 'Thêm chuyên khoa' }}
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal danh sách bác sĩ của khoa -->
      @if (selectedDetail()) {
        <div class="modal-backdrop" (click)="selectedDetail.set(null)">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Bác sĩ khoa {{ selectedDetail()?.name }}</h2>
              <button class="modal-close-btn" (click)="selectedDetail.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              @if (selectedDetail()!.doctors.length === 0) {
                <div class="empty-state-sm">
                  <p>Chưa có bác sĩ nào thuộc chuyên khoa này.</p>
                </div>
              } @else {
                <div class="doctor-list-table-wrapper">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Họ và tên</th>
                        <th>Học hàm / học vị</th>
                        <th style="text-align: right;">Kinh nghiệm</th>
                        <th style="text-align: right;">Thời gian khám TB</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (doc of selectedDetail()!.doctors; track doc.id) {
                        <tr>
                          <td class="mono text-muted">{{ doc.employeeCode || ('DOC' + doc.id) }}</td>
                          <td><strong class="specialty-name">{{ doc.fullName }}</strong></td>
                          <td>{{ doc.academicTitle || 'Bác sĩ chuyên khoa' }}</td>
                          <td class="mono" style="text-align: right;">{{ doc.yearsOfExperience || 0 }} năm</td>
                          <td class="mono" style="text-align: right;">{{ doc.averageConsultationTime || 15 }} phút/lượt</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="selectedDetail.set(null)">Đóng</button>
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

    .search-input {
      width: 100%;
      height: 34px;
      padding: 0 10px 0 32px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
    }

    .search-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .table-responsive { overflow-x: auto; }
    .data-table td.text-muted { color: var(--text-muted); }
    .data-table td.mono { white-space: nowrap; }

    .specialty-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .specialty-icon {
      color: var(--text-muted);
      font-size: 15px;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }

    .specialty-name { font-weight: 500; }

    .specialty-desc {
      margin: 0;
      color: var(--text-secondary);
      font-size: 13px;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .link-btn {
      border: none;
      background: none;
      padding: 0;
      font: inherit;
      color: var(--primary-600);
      cursor: pointer;
    }

    .link-btn:hover {
      color: var(--primary-800);
      text-decoration: underline;
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

    .empty-state-sm {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-muted);
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
    .modal-dialog { max-width: 540px; }
    .modal-lg { max-width: 780px; }

    .input-with-icon {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .icon-preview {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .doctor-list-table-wrapper {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      overflow: hidden;
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

  // Pagination for Specialties
  readonly currentPage = signal(1);
  readonly pageSize = signal(5);
  readonly pageSizeOptions = [5, 10, 15, 20];

  readonly totalPages = computed(() => {
    const total = this.filteredSpecialties().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  readonly paginatedSpecialties = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredSpecialties().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    if (this.filteredSpecialties().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.filteredSpecialties().length);
  });

  readonly pagesList = computed(() => {
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

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

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
    } else {
      const filtered = this.specialties().filter(s =>
        s.name.toLowerCase().includes(kw) || (s.description && s.description.toLowerCase().includes(kw))
      );
      this.filteredSpecialties.set(filtered);
    }
    this.currentPage.set(1);
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
