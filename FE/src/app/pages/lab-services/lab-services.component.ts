import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalLabService } from '../../services/lab.service';
import { AuthService } from '../../services/auth.service';
import { LabService, LabCategory, LabDepartment, LabServiceRequest } from '../../models/lab.model';
import { ApiResponse } from '../../models/auth.models';

@Component({
  selector: 'app-lab-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      @if (toastMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="toastType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
            <div class="toast-content">
              <div class="toast-title">{{ toastType() === 'success' ? 'Thành công' : 'Thông báo' }}</div>
              <div class="toast-message">{{ toastMessage() }}</div>
            </div>
            <button type="button" class="btn-close-toast" (click)="toastMessage.set(null)" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <div class="page-header">
        <div>
          <h1 class="page-title">Dịch vụ xét nghiệm</h1>
          <p class="page-subtitle">{{ services().length }} dịch vụ, {{ categories().length }} loại</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" (click)="loadServices()">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Làm mới
          </button>
          @if (isAdmin()) {
            <button type="button" class="btn btn-primary" (click)="openCreateModal()">
              <i class="bi bi-plus-lg"></i> Thêm dịch vụ
            </button>
          }
        </div>
      </div>

      <div class="panel">
        <div class="toolbar">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              class="search-input"
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Tìm theo mã, tên dịch vụ hoặc khoảng tham chiếu"
            />
            @if (searchQuery()) {
              <button type="button" class="btn-clear" (click)="onSearchChange('')" aria-label="Xoá từ khoá">
                <i class="bi bi-x-lg"></i>
              </button>
            }
          </div>
          <div class="category-pills" role="tablist" aria-label="Lọc theo loại xét nghiệm">
            <button
              type="button"
              class="pill-btn"
              [class.active]="selectedCategory() === 'ALL'"
              (click)="selectCategory('ALL')">
              Tất cả <span class="pill-count">{{ services().length }}</span>
            </button>
            @for (cat of categories(); track cat) {
              <button
                type="button"
                class="pill-btn"
                [class.active]="selectedCategory() === cat"
                (click)="selectCategory(cat)">
                {{ cat }} <span class="pill-count">{{ getCategoryCount(cat) }}</span>
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh mục xét nghiệm...</p>
          </div>
        } @else if (filteredServices().length === 0) {
          <div class="empty-state">
            <h3>Không có dịch vụ phù hợp</h3>
            <p>Thử đổi từ khoá hoặc chọn loại xét nghiệm khác.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Mã</th>
                  <th style="min-width: 240px;">Tên dịch vụ</th>
                  <th style="width: 150px;">Loại</th>
                  <th style="width: 200px;">Khoảng tham chiếu</th>
                  <th style="width: 90px;">Đơn vị</th>
                  <th style="width: 120px; text-align: right;">Đơn giá (đ)</th>
                  <th style="min-width: 200px;">Mô tả</th>
                  <th [style.width]="isAdmin() ? '110px' : '50px'"></th>
                </tr>
              </thead>
              <tbody>
                @for (svc of pagedServices(); track svc.id) {
                  <tr>
                    <td class="mono text-muted code-cell">{{ svc.serviceCode }}</td>
                    <td><span class="name-text">{{ svc.serviceName }}</span></td>
                    <td>{{ svc.category || 'Xét nghiệm chung' }}</td>
                    <td>
                      @if (svc.referenceRange) {
                        <span>{{ svc.referenceRange }}</span>
                      } @else {
                        <span class="text-muted">Chưa quy định</span>
                      }
                      @if (svc.lowerLimit !== undefined || svc.upperLimit !== undefined) {
                        <div class="limits-mini mono">
                          Ngưỡng {{ svc.lowerLimit ?? 0 }} – {{ svc.upperLimit ?? '∞' }}
                        </div>
                      }
                    </td>
                    <td class="text-muted">{{ svc.unit || '—' }}</td>
                    <td class="mono" style="text-align: right;">{{ (svc.price || 0) | number:'1.0-0' }}</td>
                    <td>
                      <div class="desc-text" [title]="svc.description || ''">
                        {{ svc.description || '—' }}
                      </div>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="icon-btn" (click)="selectedServiceDetail.set(svc)" title="Xem chi tiết" aria-label="Xem chi tiết">
                          <i class="bi bi-eye"></i>
                        </button>
                        @if (isAdmin()) {
                          <button type="button" class="icon-btn" (click)="openEditModal(svc)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button type="button" class="icon-btn danger" (click)="openDeleteConfirm(svc)" title="Xóa" aria-label="Xóa">
                            <i class="bi bi-trash3"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-footer">
            <div class="pagination-info">
              <span>{{ startItemIndex() }}–{{ endItemIndex() }} / {{ totalItems() }}</span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng</label>
                <select
                  id="pageSizeSelect"
                  class="form-select-sm"
                  [value]="pageSize()"
                  (change)="onPageSizeChange($event)">
                  @for (opt of pageSizeOptions; track opt) {
                    <option [value]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pagination-controls">
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Trang đầu">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="prevPage()" title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of pagesList(); track $index) {
                @if (p === '...') {
                  <span class="page-ellipsis">…</span>
                } @else {
                  <button type="button" class="btn-page" [class.active]="currentPage() === p" (click)="goToPage(+p)">
                    {{ p }}
                  </button>
                }
              }
              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="nextPage()" title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Trang cuối">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Chi tiết dịch vụ -->
      @if (selectedServiceDetail()) {
        <div class="modal-backdrop" (click)="selectedServiceDetail.set(null)">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">{{ selectedServiceDetail()?.serviceName }}</h2>
                <span class="mono text-muted modal-code">{{ selectedServiceDetail()?.serviceCode }}</span>
              </div>
              <button type="button" class="modal-close-btn" (click)="selectedServiceDetail.set(null)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <dl class="detail-grid">
                <dt>Loại xét nghiệm</dt><dd>{{ selectedServiceDetail()?.category || '—' }}</dd>
                <dt>Khoa thực hiện</dt><dd>{{ departmentLabel(selectedServiceDetail()?.department) }}</dd>
                <dt>Đơn giá</dt><dd class="mono">{{ (selectedServiceDetail()?.price || 0) | number:'1.0-0' }} đ</dd>
                <dt>Đơn vị đo</dt><dd>{{ selectedServiceDetail()?.unit || '—' }}</dd>
                <dt>Khoảng tham chiếu</dt><dd>{{ selectedServiceDetail()?.referenceRange || 'Bình thường' }}</dd>
                <dt>Ngưỡng dưới (min)</dt><dd class="mono">{{ selectedServiceDetail()?.lowerLimit ?? 'Không quy định' }}</dd>
                <dt>Ngưỡng trên (max)</dt><dd class="mono">{{ selectedServiceDetail()?.upperLimit ?? 'Không quy định' }}</dd>
              </dl>
              <div class="detail-desc">
                <strong>Mô tả, hướng dẫn lấy mẫu</strong>
                <p>{{ selectedServiceDetail()?.description || 'Tiến hành theo quy trình kỹ thuật chuẩn của Bộ Y Tế.' }}</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="selectedServiceDetail.set(null)">Đóng</button>
            </div>
          </div>
        </div>
      }

      <!-- Thêm / sửa dịch vụ (Admin) -->
      @if (showFormModal()) {
        <div class="modal-backdrop" (click)="closeFormModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditMode() ? 'Sửa dịch vụ xét nghiệm' : 'Thêm dịch vụ xét nghiệm' }}</h2>
              <button type="button" class="modal-close-btn" (click)="closeFormModal()" aria-label="Đóng">×</button>
            </div>

            <form (ngSubmit)="saveService()">
              <div class="modal-body">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label required">Mã dịch vụ</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.serviceCode"
                      name="serviceCode"
                      placeholder="vd: XN-HEM-02"
                      required
                      [disabled]="isEditMode()"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Loại xét nghiệm</label>
                    <select class="form-control" [(ngModel)]="formData.categoryId" name="categoryId" required>
                      <option [ngValue]="null" disabled>-- Chọn loại xét nghiệm --</option>
                      @for (c of labCategories(); track c.id) {
                        <option [ngValue]="c.id">{{ c.name }} ({{ departmentLabel(c.department) }})</option>
                      }
                    </select>
                    <button type="button" class="btn-link-add" (click)="toggleNewCategory()">
                      {{ showNewCategory() ? 'Đóng' : '+ Thêm loại mới' }}
                    </button>
                  </div>

                  @if (showNewCategory()) {
                    <div class="form-group full-width new-category-box">
                      <label class="form-label">Loại xét nghiệm mới</label>
                      <div class="new-category-row">
                        <input type="text" class="form-control" [(ngModel)]="newCategory.name"
                               name="newCategoryName" placeholder="vd: Vi sinh" />
                        <select class="form-control" [(ngModel)]="newCategory.department" name="newCategoryDept">
                          <option value="XET_NGHIEM">Khoa Xét nghiệm</option>
                          <option value="CHAN_DOAN_HINH_ANH">Khoa Chẩn đoán hình ảnh</option>
                        </select>
                        <button type="button" class="btn btn-secondary" [disabled]="savingCategory()" (click)="saveNewCategory()">
                          {{ savingCategory() ? 'Đang lưu...' : 'Lưu loại' }}
                        </button>
                      </div>
                    </div>
                  }

                  <div class="form-group full-width">
                    <label class="form-label required">Tên dịch vụ</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.serviceName"
                      name="serviceName"
                      placeholder="vd: Định lượng Ferritin huyết thanh"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Đơn giá (đ)</label>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="formData.price"
                      name="price"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Đơn vị đo</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.unit"
                      name="unit"
                      placeholder="vd: G/L, mmol/L, U/L, ng/mL"
                    />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Khoảng tham chiếu</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.referenceRange"
                      name="referenceRange"
                      placeholder="vd: 30 - 400 ng/mL hoặc Âm tính"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Ngưỡng dưới (min)</label>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="formData.lowerLimit"
                      name="lowerLimit"
                      step="0.01"
                      placeholder="Bỏ trống nếu không áp dụng"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Ngưỡng trên (max)</label>
                    <input
                      type="number"
                      class="form-control"
                      [(ngModel)]="formData.upperLimit"
                      name="upperLimit"
                      step="0.01"
                      placeholder="Bỏ trống nếu không áp dụng"
                    />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Mô tả, hướng dẫn lấy mẫu</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      [(ngModel)]="formData.description"
                      name="description"
                      placeholder="Quy trình thực hiện, lưu ý khi lấy mẫu"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" (click)="closeFormModal()">Hủy</button>
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  @if (submitting()) {
                    <span class="spinner-sm"></span> Đang lưu...
                  } @else {
                    {{ isEditMode() ? 'Lưu thay đổi' : 'Thêm dịch vụ' }}
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Xác nhận xóa -->
      @if (showDeleteModal()) {
        <div class="modal-backdrop" (click)="closeDeleteModal()">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Xóa dịch vụ</h2>
              <button type="button" class="modal-close-btn" (click)="closeDeleteModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="confirm-desc">
                Xóa dịch vụ <strong>{{ serviceToDelete()?.serviceName }}</strong>
                (<span class="mono">{{ serviceToDelete()?.serviceCode }}</span>)?
              </p>
              <p class="confirm-subnote">
                Dịch vụ sẽ chuyển sang ngừng hoạt động và không còn hiển thị khi bác sĩ chỉ định.
              </p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeDeleteModal()">Hủy</button>
              <button type="button" class="btn btn-danger" [disabled]="deleting()" (click)="confirmDelete()">
                @if (deleting()) {
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
      max-width: 380px;
    }

    .search-box > i {
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
      padding: 0 30px 0 32px;
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

    .btn-clear {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: none;
      color: var(--text-light);
      cursor: pointer;
      font-size: 12px;
      padding: 4px;
    }

    .btn-clear:hover { color: var(--text-main); }

    .spin-active { animation: spin 0.8s linear infinite; display: inline-block; }

    /* Bộ lọc theo loại */
    .category-pills {
      display: flex;
      flex: 1 1 100%;
      gap: 4px;
      flex-wrap: wrap;
    }

    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 30px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: #ffffff;
      color: var(--text-secondary);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .pill-btn:hover { background: var(--bg-hover); }

    .pill-btn.active {
      background: var(--primary-50);
      border-color: var(--primary-200);
      color: var(--primary-700);
      font-weight: 500;
    }

    .pill-count {
      font-size: 12px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .pill-btn.active .pill-count { color: var(--primary-700); }

    .table-responsive { overflow-x: auto; }

    .code-cell { font-size: 13px; white-space: nowrap; }
    td.text-muted { color: var(--text-muted); }
    .name-text { font-weight: 500; }

    .limits-mini {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .desc-text {
      max-width: 260px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-muted);
      font-size: 13px;
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

    /* Phân trang */
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
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination-info { gap: 16px; }
    .pagination-controls { gap: 4px; }

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

    .page-ellipsis { padding: 0 4px; color: var(--text-light); }

    /* Modal */
    .modal-lg { max-width: 720px; }
    .modal-sm { max-width: 460px; }

    .modal-code { font-size: 13px; }

    .detail-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 8px 16px;
      font-size: 14px;
      margin: 0;
    }

    .detail-grid dt { color: var(--text-muted); }
    .detail-grid dd { margin: 0; }

    .detail-desc {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color);
      font-size: 14px;
    }

    .detail-desc p {
      margin-top: 4px;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-group.full-width { grid-column: 1 / -1; }

    .form-control:disabled {
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    textarea.form-control { resize: vertical; min-height: 72px; }

    .btn-link-add {
      align-self: flex-start;
      margin-top: 6px;
      padding: 0;
      border: none;
      background: none;
      color: var(--primary-600);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-link-add:hover { text-decoration: underline; }

    .new-category-box {
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
    }

    .new-category-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .new-category-row .form-control { flex: 1 1 180px; }

    .confirm-desc {
      font-size: 14px;
      color: var(--text-main);
      line-height: 1.5;
      margin-bottom: 6px;
    }

    .confirm-subnote {
      font-size: 13px;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
      .detail-grid { grid-template-columns: 120px 1fr; }
    }
  `]
})
export class LabServicesComponent implements OnInit {
  private readonly labService = inject(ClinicalLabService);
  readonly authService = inject(AuthService);

  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  readonly services = signal<LabService[]>([]);
  readonly loading = signal(false);

  readonly selectedCategory = signal<string>('ALL');
  readonly searchQuery = signal('');

  readonly selectedServiceDetail = signal<LabService | null>(null);

  // Modal CRUD Admin
  readonly showFormModal = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingServiceId = signal<number | null>(null);
  readonly submitting = signal<boolean>(false);

  readonly showDeleteModal = signal<boolean>(false);
  readonly serviceToDelete = signal<LabService | null>(null);
  readonly deleting = signal<boolean>(false);

  // Toast
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'error'>('success');
  private toastTimer: any = null;

  // Loại xét nghiệm
  readonly labCategories = signal<LabCategory[]>([]);
  readonly showNewCategory = signal<boolean>(false);
  readonly savingCategory = signal<boolean>(false);
  newCategory = { name: '', department: 'XET_NGHIEM' as LabDepartment };

  // Form Model
  formData = {
    serviceCode: '',
    serviceName: '',
    categoryId: null as number | null,
    price: 50000,
    unit: '',
    referenceRange: '',
    lowerLimit: null as number | null,
    upperLimit: null as number | null,
    description: ''
  };

  // Phân trang (Pagination)
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(8);
  readonly pageSizeOptions = [6, 8, 12, 20];

  readonly categories = computed(() => {
    const cats = this.services()
      .map(s => s.category)
      .filter((c): c is string => !!c);
    return Array.from(new Set(cats));
  });

  readonly filteredServices = computed(() => {
    const list = this.services();
    const cat = this.selectedCategory();
    const q = this.searchQuery().trim().toLowerCase();

    return list.filter(s => {
      const matchCat = cat === 'ALL' || s.category === cat;
      const matchQuery =
        !q ||
        s.serviceCode.toLowerCase().includes(q) ||
        s.serviceName.toLowerCase().includes(q) ||
        (s.referenceRange && s.referenceRange.toLowerCase().includes(q)) ||
        (s.category && s.category.toLowerCase().includes(q));

      return matchCat && matchQuery;
    });
  });

  readonly totalItems = computed(() => this.filteredServices().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));

  readonly startItemIndex = computed(() =>
    this.totalItems() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly endItemIndex = computed(() =>
    Math.min(this.totalItems(), this.currentPage() * this.pageSize())
  );

  readonly pagedServices = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredServices().slice(start, start + this.pageSize());
  });

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
    this.currentPage.set(1);
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    if (!isNaN(newSize)) {
      this.pageSize.set(newSize);
      this.currentPage.set(1);
    }
  }

  showToast(message: string, type: 'success' | 'error' = 'success'): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }

  // --- ADMIN CRUD ACTIONS ---

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingServiceId.set(null);
    this.formData = {
      serviceCode: 'XN-',
      serviceName: '',
      categoryId: this.labCategories()[0]?.id ?? null,
      price: 50000,
      unit: '',
      referenceRange: '',
      lowerLimit: null,
      upperLimit: null,
      description: ''
    };
    this.showFormModal.set(true);
  }

  openEditModal(svc: LabService): void {
    this.isEditMode.set(true);
    this.editingServiceId.set(svc.id);
    this.formData = {
      serviceCode: svc.serviceCode,
      serviceName: svc.serviceName,
      categoryId: svc.categoryId ?? null,
      price: svc.price || 0,
      unit: svc.unit || '',
      referenceRange: svc.referenceRange || '',
      lowerLimit: svc.lowerLimit ?? null,
      upperLimit: svc.upperLimit ?? null,
      description: svc.description || ''
    };
    this.showNewCategory.set(false);
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  saveService(): void {
    if (!this.formData.serviceCode.trim() || !this.formData.serviceName.trim()) {
      this.showToast('Vui lòng nhập đầy đủ mã và tên dịch vụ!', 'error');
      return;
    }
    if (this.formData.categoryId === null) {
      this.showToast('Vui lòng chọn loại xét nghiệm!', 'error');
      return;
    }

    const toNumber = (v: number | null) => v !== null && !isNaN(Number(v)) ? Number(v) : undefined;
    const payload: LabServiceRequest = {
      serviceCode: this.formData.serviceCode.trim().toUpperCase(),
      serviceName: this.formData.serviceName.trim(),
      categoryId: this.formData.categoryId,
      price: Number(this.formData.price) || 0,
      unit: this.formData.unit.trim(),
      referenceRange: this.formData.referenceRange.trim(),
      lowerLimit: toNumber(this.formData.lowerLimit),
      upperLimit: toNumber(this.formData.upperLimit),
      description: this.formData.description.trim()
    };

    const editingId = this.isEditMode() ? this.editingServiceId() : null;
    const request$ = editingId
      ? this.labService.updateLabService(editingId, payload)
      : this.labService.createLabService(payload);

    this.submitting.set(true);
    request$.subscribe({
      next: res => {
        this.submitting.set(false);
        this.closeFormModal();
        if (res.data) {
          const saved = res.data;
          this.services.update(list => editingId
            ? list.map(s => s.id === editingId ? saved : s)
            : [saved, ...list]);
        }
        this.showToast(editingId ? 'Cập nhật kỹ thuật xét nghiệm thành công!' : 'Thêm mới kỹ thuật xét nghiệm thành công!', 'success');
      },
      error: err => {
        this.submitting.set(false);
        this.showToast(err.error?.message || 'Không thể lưu kỹ thuật xét nghiệm', 'error');
      }
    });
  }

  openDeleteConfirm(svc: LabService): void {
    this.serviceToDelete.set(svc);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.serviceToDelete.set(null);
  }

  confirmDelete(): void {
    const target = this.serviceToDelete();
    if (!target) return;

    this.deleting.set(true);
    this.labService.deleteLabService(target.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.services.update(list => list.filter(s => s.id !== target.id));
        this.showToast(`Đã ngừng sử dụng dịch vụ ${target.serviceCode}!`, 'success');
      },
      error: err => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.showToast(err.error?.message || 'Không thể xoá dịch vụ xét nghiệm', 'error');
      }
    });
  }

  ngOnInit(): void {
    this.loadServices();
    this.loadCategories();
  }

  loadCategories(): void {
    this.labService.getLabCategories().subscribe({
      next: res => this.labCategories.set(res.data || []),
      error: () => this.labCategories.set([])
    });
  }

  departmentLabel(department?: LabDepartment | null): string {
    if (!department) return '---';
    return department === 'CHAN_DOAN_HINH_ANH' ? 'Khoa Chẩn đoán hình ảnh' : 'Khoa Xét nghiệm';
  }

  toggleNewCategory(): void {
    this.newCategory = { name: '', department: 'XET_NGHIEM' };
    this.showNewCategory.update(v => !v);
  }

  saveNewCategory(): void {
    const name = this.newCategory.name.trim();
    if (!name) {
      this.showToast('Vui lòng nhập tên loại xét nghiệm!', 'error');
      return;
    }
    this.savingCategory.set(true);
    this.labService.createLabCategory({ name, department: this.newCategory.department }).subscribe({
      next: res => {
        this.savingCategory.set(false);
        if (res.data) {
          const created = res.data;
          this.labCategories.update(list => [...list, created]);
          this.formData.categoryId = created.id;
        }
        this.showNewCategory.set(false);
        this.showToast(`Đã thêm loại xét nghiệm "${name}"`, 'success');
      },
      error: err => {
        this.savingCategory.set(false);
        this.showToast(err.error?.message || 'Không thể thêm loại xét nghiệm', 'error');
      }
    });
  }

  loadServices(): void {
    this.loading.set(true);
    this.labService.getLabServices().subscribe({
      next: (res: ApiResponse<LabService[]>) => {
        this.loading.set(false);
        this.services.set(res.data || []);
      },
      error: err => {
        this.loading.set(false);
        this.showToast(err.error?.message || 'Không tải được danh mục xét nghiệm', 'error');
      }
    });
  }

  getCategoryCount(cat: string): number {
    return this.services().filter(s => s.category === cat).length;
  }

  getCategoryIcon(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('huyết học') || c.includes('máu')) return 'bi-droplet-fill';
    if (c.includes('sinh hóa')) return 'bi-virus';
    if (c.includes('gan')) return 'bi-activity';
    if (c.includes('hình ảnh') || c.includes('quang')) return 'bi-aspect-ratio-fill';
    if (c.includes('tim') || c.includes('ecg')) return 'bi-heart-pulse-fill';
    return 'bi-tag-fill';
  }

  getCategoryBadgeClass(cat?: string): string {
    if (!cat) return '';
    const c = cat.toLowerCase();
    if (c.includes('huyết học')) return 'tag-blood';
    if (c.includes('sinh hóa')) return 'tag-bio';
    if (c.includes('gan')) return 'tag-liver';
    if (c.includes('hình ảnh')) return 'tag-image';
    if (c.includes('tim') || c.includes('ecg')) return 'tag-ecg';
    return '';
  }
}
