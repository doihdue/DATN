import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MedicineService } from '../../services/medicine.service';
import { MedicineCategoryService } from '../../services/medicine-category.service';
import { Medicine, MedicineRequest } from '../../models/medicine.model';
import { MedicineCategory, MedicineCategoryRequest } from '../../models/medicine-category.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ activeTab() === 'categories' ? 'Nhóm thuốc' : (isAdmin() ? 'Danh mục thuốc' : 'Tra cứu thuốc') }}</h1>
          <p class="page-subtitle">
            @if (activeTab() === 'medicines') {
              {{ totalMedicines() }} thuốc, {{ totalCategories() }} nhóm dược lý
            } @else {
              {{ totalCategories() }} nhóm, {{ totalMedicines() }} thuốc
            }
          </p>
        </div>
        @if (isAdmin()) {
          <div class="page-actions">
            @if (activeTab() === 'medicines') {
              <button class="btn btn-primary" (click)="openAddMedicineModal()">
                <i class="bi bi-plus-lg"></i> Thêm thuốc
              </button>
            } @else {
              <button class="btn btn-primary" (click)="openAddCategoryModal()">
                <i class="bi bi-plus-lg"></i> Thêm nhóm thuốc
              </button>
            }
          </div>
        }
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Tổng số thuốc</span>
          <strong class="stat-value mono">{{ totalMedicines() }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Đang hoạt động</span>
          <strong class="stat-value mono">{{ activeMedicines() }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Tồn kho dưới 100</span>
          <strong class="stat-value mono" [class.is-warning]="lowStockMedicines() > 0">{{ lowStockMedicines() }}</strong>
        </div>
        <div class="stat-card">
          <span class="stat-label">Nhóm dược lý</span>
          <strong class="stat-value mono">{{ totalCategories() }}</strong>
        </div>
      </div>

      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
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

      <!-- Danh sách thuốc -->
      @if (activeTab() === 'medicines') {
        <div class="panel">
          <div class="toolbar">
            <div class="search-box">
              <i class="bi bi-search"></i>
              <input
                type="text"
                [ngModel]="medicineSearchKeyword()"
                (ngModelChange)="medicineSearchKeyword.set($event); onFilterChange()"
                placeholder="Tìm theo mã thuốc, tên biệt dược, hoạt chất"
                class="search-input"
              />
              @if (medicineSearchKeyword()) {
                <button type="button" class="btn-clear-search" (click)="medicineSearchKeyword.set(''); onFilterChange()" aria-label="Xóa từ khóa">
                  <i class="bi bi-x-lg"></i>
                </button>
              }
            </div>

            <select [ngModel]="selectedCategoryId()" (ngModelChange)="selectedCategoryId.set($event); onFilterChange()" class="filter-select" aria-label="Lọc theo nhóm thuốc">
              <option [ngValue]="null">Tất cả nhóm thuốc</option>
              @for (c of categories(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>

            <select [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event); onFilterChange()" class="filter-select" aria-label="Lọc theo trạng thái">
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Tạm ngừng</option>
            </select>

            @if (medicineSearchKeyword() || selectedCategoryId() !== null || statusFilter() !== 'ALL') {
              <button class="btn-reset-filters" (click)="resetMedicineFilters()" title="Đặt lại bộ lọc">
                Đặt lại
              </button>
            }
          </div>

          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Đang tải danh mục thuốc...</p>
            </div>
          } @else if (filteredMedicines().length === 0) {
            <div class="empty-state">
              <h3>Không có thuốc phù hợp</h3>
              <p>Thử đổi từ khóa hoặc bộ lọc.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 100px;">Mã</th>
                    <th style="min-width: 220px;">Tên biệt dược</th>
                    <th style="min-width: 200px;">Hoạt chất</th>
                    <th style="min-width: 170px;">Nhóm dược lý</th>
                    <th style="width: 80px;">Đơn vị</th>
                    <th style="width: 110px; text-align: right;">Đơn giá (đ)</th>
                    <th style="width: 90px; text-align: right;">Tồn kho</th>
                    <th style="width: 120px;">Trạng thái</th>
                    <th style="width: 80px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of paginatedMedicines(); track item.id) {
                    <tr>
                      <td class="mono text-muted code-cell">{{ item.code || 'MED-' + item.id }}</td>
                      <td>
                        <div class="name-cell">
                          <strong class="name-main">{{ item.name }}</strong>
                          <span class="name-sub">
                            {{ item.dosageForm || 'Chưa rõ dạng' }}@if (item.packaging) { · {{ item.packaging }} }
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="clamp-2" [title]="item.activeIngredient || ''">
                          {{ item.activeIngredient || '—' }}
                        </div>
                      </td>
                      <td>
                        @if (item.categoryName) {
                          {{ item.categoryName }}
                        } @else {
                          <span class="text-muted">Chưa phân loại</span>
                        }
                      </td>
                      <td>{{ item.unit || 'Viên' }}</td>
                      <td class="mono" style="text-align: right;">{{ (item.price || 0) | number:'1.0-0' }}</td>
                      <td class="mono" style="text-align: right;">
                        <span
                          class="stock-val"
                          [ngClass]="(item.stockQuantity || 0) < 100 ? 'stock-low' : 'stock-ok'"
                          [title]="(item.stockQuantity || 0) < 100 ? 'Tồn kho dưới 100 đơn vị' : 'Tồn kho khả dụng'"
                        >{{ item.stockQuantity || 0 }}</span>
                      </td>
                      <td>
                        <span class="status" [class.success]="item.isActive">
                          {{ item.isActive ? 'Hoạt động' : 'Tạm ngừng' }}
                        </span>
                      </td>
                      <td>
                        <div class="row-actions">
                          @if (isAdmin()) {
                            <button class="icon-btn" (click)="openEditMedicineModal(item)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                              <i class="bi bi-pencil"></i>
                            </button>
                            <button class="icon-btn danger" (click)="confirmDeleteMedicine(item)" title="Xóa" aria-label="Xóa">
                              <i class="bi bi-trash3"></i>
                            </button>
                          } @else {
                            <button class="icon-btn" (click)="openEditMedicineModal(item)" title="Xem chi tiết" aria-label="Xem chi tiết">
                              <i class="bi bi-eye"></i>
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
                <span>{{ startIndex() }}–{{ endIndex() }} / {{ filteredMedicines().length }}</span>
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
                <button class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Trang đầu">
                  <i class="bi bi-chevron-double-left"></i>
                </button>
                <button class="btn-page" [disabled]="currentPage() === 1" (click)="prevPage()" title="Trang trước">
                  <i class="bi bi-chevron-left"></i>
                </button>
                @for (p of pagesList(); track p) {
                  <button class="btn-page" [class.active]="currentPage() === p" (click)="goToPage(p)">{{ p }}</button>
                }
                <button class="btn-page" [disabled]="currentPage() === totalPages()" (click)="nextPage()" title="Trang sau">
                  <i class="bi bi-chevron-right"></i>
                </button>
                <button class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Trang cuối">
                  <i class="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Nhóm thuốc -->
      @if (activeTab() === 'categories') {
        <div class="panel">
          <div class="toolbar">
            <div class="search-box">
              <i class="bi bi-search"></i>
              <input
                type="text"
                [ngModel]="categorySearchKeyword()"
                (ngModelChange)="categorySearchKeyword.set($event); onCategoryFilterChange()"
                placeholder="Tìm theo mã nhóm, tên nhóm hoặc mô tả"
                class="search-input"
              />
              @if (categorySearchKeyword()) {
                <button type="button" class="btn-clear-search" (click)="categorySearchKeyword.set(''); onCategoryFilterChange()" title="Xóa từ khóa" aria-label="Xóa từ khóa">
                  <i class="bi bi-x-lg"></i>
                </button>
              }
            </div>

            <select
              [ngModel]="categoryStatusFilter()"
              (ngModelChange)="categoryStatusFilter.set($event); onCategoryFilterChange()"
              class="filter-select"
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Tạm ngừng</option>
            </select>

            @if (categorySearchKeyword() || categoryStatusFilter() !== 'ALL') {
              <button type="button" class="btn-reset-filters" (click)="resetCategoryFilters()" title="Đặt lại bộ lọc">
                Đặt lại
              </button>
            }
          </div>

          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Đang tải nhóm thuốc...</p>
            </div>
          } @else if (filteredCategories().length === 0) {
            <div class="empty-state">
              <h3>Không có nhóm thuốc phù hợp</h3>
              <p>Thử đổi từ khóa hoặc thêm nhóm thuốc mới.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 100px;">Mã</th>
                    <th style="min-width: 240px;">Tên nhóm thuốc</th>
                    <th style="min-width: 320px;">Mô tả</th>
                    <th style="width: 110px; text-align: right;">Số thuốc</th>
                    <th style="width: 80px; text-align: right;">Thứ tự</th>
                    <th style="width: 120px;">Trạng thái</th>
                    <th style="width: 80px;"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (cat of paginatedCategories(); track cat.id) {
                    <tr>
                      <td class="mono text-muted code-cell">{{ cat.code || 'CAT-' + cat.id }}</td>
                      <td><strong class="name-main">{{ cat.name }}</strong></td>
                      <td>
                        <p class="clamp-2 text-secondary" [title]="cat.description || ''">
                          {{ cat.description || '—' }}
                        </p>
                      </td>
                      <td style="text-align: right;">
                        <button class="link-btn mono" (click)="filterMedicinesByCategory(cat.id)" title="Xem các thuốc thuộc nhóm này">
                          {{ cat.medicineCount || 0 }} thuốc
                        </button>
                      </td>
                      <td class="mono text-muted" style="text-align: right;">{{ cat.displayOrder || 0 }}</td>
                      <td>
                        <span class="status" [class.success]="cat.isActive">
                          {{ cat.isActive ? 'Hoạt động' : 'Tạm ngừng' }}
                        </span>
                      </td>
                      <td>
                        <div class="row-actions">
                          <button class="icon-btn" (click)="openEditCategoryModal(cat)" title="Chỉnh sửa" aria-label="Chỉnh sửa">
                            <i class="bi bi-pencil"></i>
                          </button>
                          <button class="icon-btn danger" (click)="confirmDeleteCategory(cat)" title="Xóa" aria-label="Xóa">
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
                <span>{{ categoryStartIndex() }}–{{ categoryEndIndex() }} / {{ filteredCategories().length }}</span>
                <div class="page-size-selector">
                  <label for="catPageSizeSelect">Số dòng</label>
                  <select
                    id="catPageSizeSelect"
                    [ngModel]="categoryPageSize()"
                    (ngModelChange)="onCategoryPageSizeChange($event)"
                    class="form-select-sm"
                  >
                    @for (opt of categoryPageSizeOptions; track opt) {
                      <option [ngValue]="opt">{{ opt }}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="pagination-controls">
                <button class="btn-page" [disabled]="categoryCurrentPage() === 1" (click)="goToCategoryPage(1)" title="Trang đầu">
                  <i class="bi bi-chevron-double-left"></i>
                </button>
                <button class="btn-page" [disabled]="categoryCurrentPage() === 1" (click)="prevCategoryPage()" title="Trang trước">
                  <i class="bi bi-chevron-left"></i>
                </button>
                @for (p of categoryPagesList(); track p) {
                  <button class="btn-page" [class.active]="categoryCurrentPage() === p" (click)="goToCategoryPage(p)">{{ p }}</button>
                }
                <button class="btn-page" [disabled]="categoryCurrentPage() === categoryTotalPages()" (click)="nextCategoryPage()" title="Trang sau">
                  <i class="bi bi-chevron-right"></i>
                </button>
                <button class="btn-page" [disabled]="categoryCurrentPage() === categoryTotalPages()" (click)="goToCategoryPage(categoryTotalPages())" title="Trang cuối">
                  <i class="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal thêm / sửa thuốc -->
      @if (showMedicineModal()) {
        <div class="modal-backdrop" (click)="closeMedicineModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                {{ isEditingMedicine() ? (isAdmin() ? 'Sửa thông tin thuốc' : 'Thông tin thuốc') : 'Thêm thuốc' }}
              </h2>
              <button class="modal-close-btn" (click)="closeMedicineModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label required">Tên biệt dược</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.name"
                    placeholder="vd: Panadol Extra 500mg"
                    class="form-control"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Mã thuốc</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.code"
                    placeholder="vd: MED-001"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Nhóm dược lý</label>
                  <select [(ngModel)]="medicineFormData.categoryId" class="form-control">
                    <option [ngValue]="null">-- Chọn nhóm thuốc --</option>
                    @for (c of categories(); track c.id) {
                      <option [ngValue]="c.id">{{ c.name }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Hoạt chất, hàm lượng</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.activeIngredient"
                    placeholder="vd: Paracetamol 500mg + Caffeine 65mg"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Dạng bào chế</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.dosageForm"
                    placeholder="vd: Viên nén, Siro, Hỗn dịch"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label required">Đơn vị tính</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.unit"
                    placeholder="vd: Viên, Gói, Chai, Ống"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Đơn giá (đ)</label>
                  <input
                    type="number"
                    [(ngModel)]="medicineFormData.price"
                    placeholder="vd: 2500"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Tồn kho</label>
                  <input
                    type="number"
                    [(ngModel)]="medicineFormData.stockQuantity"
                    placeholder="vd: 500"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Đường dùng</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.routeOfAdministration"
                    placeholder="vd: Uống, Bôi ngoài da, Nhỏ mắt"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Quy cách đóng gói</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.packaging"
                    placeholder="vd: Hộp 10 vỉ x 10 viên"
                    class="form-control"
                  />
                </div>

                <div class="form-group form-group-full">
                  <label class="form-label">Hướng dẫn sử dụng mặc định</label>
                  <textarea
                    [(ngModel)]="medicineFormData.defaultUsageInstructions"
                    rows="2"
                    placeholder="vd: Uống 1 viên khi sốt trên 38,5°C, cách 4–6 giờ, sau ăn"
                    class="form-control"
                  ></textarea>
                </div>

                <div class="form-group form-group-full">
                  <label class="form-label">Chống chỉ định, cảnh báo</label>
                  <textarea
                    [(ngModel)]="medicineFormData.contraindications"
                    rows="2"
                    placeholder="vd: Mẫn cảm với Paracetamol, suy gan thận nặng"
                    class="form-control"
                  ></textarea>
                </div>

                <div class="form-group form-group-full">
                  <label class="checkbox-label">
                    <input type="checkbox" [(ngModel)]="medicineFormData.isActive" />
                    <span>Cho phép kê đơn</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeMedicineModal()">Hủy</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveMedicine()">
                {{ submitting() ? 'Đang lưu...' : (isEditingMedicine() ? 'Lưu thay đổi' : 'Thêm thuốc') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal thêm / sửa nhóm thuốc -->
      @if (showCategoryModal()) {
        <div class="modal-backdrop" (click)="closeCategoryModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ isEditingCategory() ? 'Sửa nhóm thuốc' : 'Thêm nhóm thuốc' }}</h2>
              <button class="modal-close-btn" (click)="closeCategoryModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Tên nhóm thuốc</label>
                <input
                  type="text"
                  [(ngModel)]="categoryFormData.name"
                  placeholder="vd: Kháng sinh & kháng khuẩn"
                  class="form-control"
                  required
                />
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Mã nhóm</label>
                  <input
                    type="text"
                    [(ngModel)]="categoryFormData.code"
                    placeholder="vd: KS, GD-HS"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Thứ tự hiển thị</label>
                  <input
                    type="number"
                    [(ngModel)]="categoryFormData.displayOrder"
                    class="form-control"
                  />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Mô tả</label>
                <textarea
                  [(ngModel)]="categoryFormData.description"
                  rows="3"
                  placeholder="Công dụng và lưu ý chung của nhóm thuốc"
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="categoryFormData.isActive" />
                  <span>Đang hoạt động</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeCategoryModal()">Hủy</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveCategory()">
                {{ submitting() ? 'Đang lưu...' : (isEditingCategory() ? 'Lưu thay đổi' : 'Thêm nhóm') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal xác nhận xóa -->
      @if (showDeleteConfirm()) {
        <div class="modal-backdrop" (click)="showDeleteConfirm.set(false)">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Xác nhận xóa</h2>
              <button class="modal-close-btn" (click)="showDeleteConfirm.set(false)" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="confirm-text">Xóa <strong>{{ deleteTarget()?.name }}</strong>?</p>
              <p class="confirm-note">Không thể hoàn tác thao tác này.</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="showDeleteConfirm.set(false)">Hủy</button>
              <button class="btn btn-danger" [disabled]="submitting()" (click)="executeDelete()">
                {{ submitting() ? 'Đang xóa...' : 'Xóa' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Thẻ thống kê */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .stat-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .stat-value {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.2;
    }

    .stat-value.is-warning { color: var(--warning-text); }

    /* Thanh lọc */
    .toolbar .search-box {
      position: relative;
      flex: 1 1 280px;
      max-width: 420px;
    }

    .search-box > i {
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
      padding: 0 30px 0 32px;
    }

    .filter-select {
      padding: 0 8px;
      min-width: 170px;
      max-width: 240px;
    }

    .search-input:focus,
    .filter-select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .btn-clear-search {
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

    .btn-clear-search:hover { color: var(--text-main); }

    .btn-reset-filters {
      height: 34px;
      padding: 0 8px;
      border: none;
      background: none;
      color: var(--primary-600);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-reset-filters:hover { text-decoration: underline; }

    /* Bảng */
    .table-responsive { overflow-x: auto; }

    .code-cell { font-size: 13px; white-space: nowrap; }
    td.text-muted { color: var(--text-muted); }

    .name-cell {
      display: flex;
      flex-direction: column;
      line-height: 1.35;
    }

    .name-main { font-weight: 500; }

    .name-sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    .clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin: 0;
      line-height: 1.45;
    }

    .text-secondary { color: var(--text-secondary); font-size: 13px; }

    .stock-low {
      color: var(--warning-text);
      font-weight: 600;
    }

    .link-btn {
      border: none;
      background: none;
      padding: 0;
      color: var(--primary-600);
      font: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .link-btn:hover { text-decoration: underline; }

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

    /* Modal */
    .modal-lg { max-width: 760px; width: 100%; }
    .modal-sm { max-width: 420px; }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-group-full { grid-column: 1 / -1; }

    textarea.form-control { resize: vertical; }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--text-main);
      cursor: pointer;
    }

    .checkbox-label input {
      width: 16px;
      height: 16px;
      accent-color: var(--primary-600);
    }

    .confirm-text {
      font-size: 14px;
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .confirm-note {
      font-size: 13px;
      color: var(--text-muted);
    }

    @media (max-width: 900px) {
      .stats-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MedicinesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly medicineService = inject(MedicineService);
  private readonly categoryService = inject(MedicineCategoryService);
  readonly authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  // Tab State: 'medicines' | 'categories'
  activeTab = signal<'medicines' | 'categories'>('medicines');

  // Data signals
  medicines = signal<Medicine[]>([]);
  categories = signal<MedicineCategory[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Filters for Medicines
  medicineSearchKeyword = signal<string>('');
  selectedCategoryId = signal<number | null>(null);
  statusFilter = signal<string>('ALL'); // ALL | ACTIVE | INACTIVE

  // Pagination for Medicines
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  readonly pageSizeOptions = [5, 10, 15, 20, 50];

  // Filters & Pagination for Categories
  categorySearchKeyword = signal<string>('');
  categoryStatusFilter = signal<string>('ALL'); // ALL | ACTIVE | INACTIVE
  categoryCurrentPage = signal<number>(1);
  categoryPageSize = signal<number>(6);
  readonly categoryPageSizeOptions = [6, 12, 24];

  // Toast Alerts
  alertMessage = signal<string | null>(null);
  alertType = signal<'success' | 'danger'>('success');

  // Modal: Medicine
  showMedicineModal = signal<boolean>(false);
  isEditingMedicine = signal<boolean>(false);
  editingMedicineId: number | null = null;
  medicineFormData: MedicineRequest = this.getEmptyMedicineRequest();

  // Modal: Category
  showCategoryModal = signal<boolean>(false);
  isEditingCategory = signal<boolean>(false);
  editingCategoryId: number | null = null;
  categoryFormData: MedicineCategoryRequest = this.getEmptyCategoryRequest();

  // Modal: Delete confirmation
  showDeleteConfirm = signal<boolean>(false);
  deleteTarget = signal<{ type: 'medicine' | 'category'; id: number; name: string } | null>(null);

  // Computed statistics
  totalMedicines = computed(() => this.medicines().length);
  activeMedicines = computed(() => this.medicines().filter(m => m.isActive).length);
  lowStockMedicines = computed(() => this.medicines().filter(m => (m.stockQuantity || 0) < 100).length);
  totalCategories = computed(() => this.categories().length);

  normalizeText(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .trim();
  }

  // Filtered lists
  filteredMedicines = computed(() => {
    let list = this.medicines();
    const rawKw = this.medicineSearchKeyword().trim().toLowerCase();
    const normKw = this.normalizeText(rawKw);
    if (rawKw) {
      list = list.filter(m => {
        const name = m.name || '';
        const code = m.code || '';
        const ing = m.activeIngredient || '';
        return (
          name.toLowerCase().includes(rawKw) ||
          code.toLowerCase().includes(rawKw) ||
          ing.toLowerCase().includes(rawKw) ||
          this.normalizeText(name).includes(normKw) ||
          this.normalizeText(code).includes(normKw) ||
          this.normalizeText(ing).includes(normKw)
        );
      });
    }
    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(m => m.categoryId === catId);
    }
    const status = this.statusFilter();
    if (status === 'ACTIVE') {
      list = list.filter(m => m.isActive === true);
    } else if (status === 'INACTIVE') {
      list = list.filter(m => m.isActive === false);
    }
    return list;
  });

  // Paginated Medicines list
  paginatedMedicines = computed(() => {
    const list = this.filteredMedicines();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  // Total pages
  totalPages = computed(() => {
    const total = this.filteredMedicines().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  // Display range for footer
  startIndex = computed(() => {
    const total = this.filteredMedicines().length;
    if (total === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  endIndex = computed(() => {
    const total = this.filteredMedicines().length;
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, total);
  });

  // Page numbers list for pagination buttons
  pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);

    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(total, start + 4);
      } else if (end === total) {
        start = Math.max(1, end - 4);
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  filteredCategories = computed(() => {
    let list = this.categories();
    const rawKw = this.categorySearchKeyword().trim().toLowerCase();
    const normKw = this.normalizeText(rawKw);
    if (rawKw) {
      list = list.filter(c => {
        const name = c.name || '';
        const code = c.code || '';
        const desc = c.description || '';
        return (
          name.toLowerCase().includes(rawKw) ||
          code.toLowerCase().includes(rawKw) ||
          desc.toLowerCase().includes(rawKw) ||
          this.normalizeText(name).includes(normKw) ||
          this.normalizeText(code).includes(normKw) ||
          this.normalizeText(desc).includes(normKw)
        );
      });
    }
    const status = this.categoryStatusFilter();
    if (status === 'ACTIVE') {
      list = list.filter(c => c.isActive === true);
    } else if (status === 'INACTIVE') {
      list = list.filter(c => c.isActive === false);
    }
    return list;
  });

  // Paginated Categories list
  paginatedCategories = computed(() => {
    const list = this.filteredCategories();
    const page = this.categoryCurrentPage();
    const size = this.categoryPageSize();
    const start = (page - 1) * size;
    return list.slice(start, start + size);
  });

  categoryTotalPages = computed(() => {
    const total = this.filteredCategories().length;
    return Math.max(1, Math.ceil(total / this.categoryPageSize()));
  });

  categoryStartIndex = computed(() => {
    const total = this.filteredCategories().length;
    if (total === 0) return 0;
    return (this.categoryCurrentPage() - 1) * this.categoryPageSize() + 1;
  });

  categoryEndIndex = computed(() => {
    const total = this.filteredCategories().length;
    const end = this.categoryCurrentPage() * this.categoryPageSize();
    return Math.min(end, total);
  });

  categoryPagesList = computed(() => {
    const total = this.categoryTotalPages();
    const current = this.categoryCurrentPage();
    const pages: number[] = [];
    let start = Math.max(1, current - 2);
    let end = Math.min(total, current + 2);
    if (end - start < 4) {
      if (start === 1) end = Math.min(total, start + 4);
      else if (end === total) start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  ngOnInit(): void {
    this.syncTabFromUrl(this.router.url);
    this.loadData();

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.syncTabFromUrl(e.urlAfterRedirects || e.url);
      });
  }

  private syncTabFromUrl(url: string): void {
    if (url.includes('/categories')) {
      if (this.activeTab() !== 'categories') {
        this.activeTab.set('categories');
        this.categoryCurrentPage.set(1);
      }
    } else {
      if (this.activeTab() !== 'medicines') {
        this.activeTab.set('medicines');
        this.currentPage.set(1);
      }
    }
  }

  switchTab(tab: 'medicines' | 'categories', navigate: boolean = true): void {
    this.activeTab.set(tab);
    if (tab === 'medicines') {
      this.currentPage.set(1);
    } else {
      this.categoryCurrentPage.set(1);
    }

    if (navigate && this.isAdmin()) {
      const targetPath = tab === 'categories' ? '/admin/medicines/categories' : '/admin/medicines/list';
      if (!this.router.url.includes(targetPath)) {
        this.router.navigateByUrl(targetPath);
      }
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  resetMedicineFilters(): void {
    this.medicineSearchKeyword.set('');
    this.selectedCategoryId.set(null);
    this.statusFilter.set('ALL');
    this.onFilterChange();
  }

  resetCategoryFilters(): void {
    this.categorySearchKeyword.set('');
    this.categoryStatusFilter.set('ALL');
    this.onCategoryFilterChange();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
  }

  onCategoryFilterChange(): void {
    this.categoryCurrentPage.set(1);
  }

  onCategoryPageSizeChange(newSize: number): void {
    this.categoryPageSize.set(newSize);
    this.categoryCurrentPage.set(1);
  }

  goToCategoryPage(page: number): void {
    if (page >= 1 && page <= this.categoryTotalPages()) {
      this.categoryCurrentPage.set(page);
    }
  }

  nextCategoryPage(): void {
    if (this.categoryCurrentPage() < this.categoryTotalPages()) {
      this.categoryCurrentPage.update(p => p + 1);
    }
  }

  prevCategoryPage(): void {
    if (this.categoryCurrentPage() > 1) {
      this.categoryCurrentPage.update(p => p - 1);
    }
  }

  filterMedicinesByCategory(categoryId: number): void {
    this.selectedCategoryId.set(categoryId);
    this.switchTab('medicines');
    this.onFilterChange();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  loadData(): void {
    this.loading.set(true);
    this.categoryService.getCategories(false).subscribe({
      next: catRes => {
        if (catRes.data) {
          this.categories.set(catRes.data);
        }
        this.medicineService.getMedicines().subscribe({
          next: medRes => {
            if (medRes.data) {
              this.medicines.set(medRes.data);
            }
            this.loading.set(false);
          },
          error: err => {
            this.showAlert('Không thể tải danh sách thuốc: ' + (err.error?.message || err.message), 'danger');
            this.loading.set(false);
          }
        });
      },
      error: err => {
        this.showAlert('Không thể tải danh mục nhóm thuốc: ' + (err.error?.message || err.message), 'danger');
        this.loading.set(false);
      }
    });
  }

  // --- MEDICINE CRUD ---
  openAddMedicineModal(): void {
    this.isEditingMedicine.set(false);
    this.editingMedicineId = null;
    this.medicineFormData = this.getEmptyMedicineRequest();
    this.showMedicineModal.set(true);
  }

  openEditMedicineModal(item: Medicine): void {
    this.isEditingMedicine.set(true);
    this.editingMedicineId = item.id;
    this.medicineFormData = {
      code: item.code || '',
      name: item.name,
      activeIngredient: item.activeIngredient || '',
      dosageForm: item.dosageForm || '',
      unit: item.unit || 'Viên',
      price: item.price || 0,
      packaging: item.packaging || '',
      routeOfAdministration: item.routeOfAdministration || 'Đường uống',
      stockQuantity: item.stockQuantity || 0,
      isActive: item.isActive !== undefined ? item.isActive : true,
      contraindications: item.contraindications || '',
      defaultUsageInstructions: item.defaultUsageInstructions || '',
      categoryId: item.categoryId
    };
    this.showMedicineModal.set(true);
  }

  closeMedicineModal(): void {
    this.showMedicineModal.set(false);
  }

  saveMedicine(): void {
    if (!this.medicineFormData.name || !this.medicineFormData.name.trim()) {
      this.showAlert('Vui lòng nhập tên biệt dược', 'danger');
      return;
    }
    if (!this.medicineFormData.unit || !this.medicineFormData.unit.trim()) {
      this.showAlert('Vui lòng nhập đơn vị tính', 'danger');
      return;
    }

    this.submitting.set(true);
    if (this.isEditingMedicine() && this.editingMedicineId) {
      this.medicineService.updateMedicine(this.editingMedicineId, this.medicineFormData).subscribe({
        next: res => {
          this.submitting.set(false);
          this.closeMedicineModal();
          this.showAlert(`Đã cập nhật thông tin thuốc "${res.data?.name}" thành công!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Có lỗi xảy ra khi cập nhật thuốc!', 'danger');
        }
      });
    } else {
      this.medicineService.createMedicine(this.medicineFormData).subscribe({
        next: res => {
          this.submitting.set(false);
          this.closeMedicineModal();
          this.showAlert(`Đã thêm mới thuốc "${res.data?.name}" vào danh mục!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Có lỗi xảy ra khi thêm mới thuốc!', 'danger');
        }
      });
    }
  }

  confirmDeleteMedicine(item: Medicine): void {
    this.deleteTarget.set({ type: 'medicine', id: item.id, name: item.name });
    this.showDeleteConfirm.set(true);
  }

  // --- CATEGORY CRUD ---
  openAddCategoryModal(): void {
    this.isEditingCategory.set(false);
    this.editingCategoryId = null;
    this.categoryFormData = this.getEmptyCategoryRequest();
    this.showCategoryModal.set(true);
  }

  openEditCategoryModal(cat: MedicineCategory): void {
    this.isEditingCategory.set(true);
    this.editingCategoryId = cat.id;
    this.categoryFormData = {
      code: cat.code || '',
      name: cat.name,
      description: cat.description || '',
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      displayOrder: cat.displayOrder || 0
    };
    this.showCategoryModal.set(true);
  }

  closeCategoryModal(): void {
    this.showCategoryModal.set(false);
  }

  saveCategory(): void {
    if (!this.categoryFormData.name || !this.categoryFormData.name.trim()) {
      this.showAlert('Vui lòng nhập tên nhóm thuốc', 'danger');
      return;
    }

    this.submitting.set(true);
    if (this.isEditingCategory() && this.editingCategoryId) {
      this.categoryService.updateCategory(this.editingCategoryId, this.categoryFormData).subscribe({
        next: res => {
          this.submitting.set(false);
          this.closeCategoryModal();
          this.showAlert(`Đã cập nhật nhóm thuốc "${res.data?.name}" thành công!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Có lỗi xảy ra khi cập nhật nhóm thuốc!', 'danger');
        }
      });
    } else {
      this.categoryService.createCategory(this.categoryFormData).subscribe({
        next: res => {
          this.submitting.set(false);
          this.closeCategoryModal();
          this.showAlert(`Đã tạo nhóm thuốc "${res.data?.name}" thành công!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Có lỗi xảy ra khi tạo nhóm thuốc!', 'danger');
        }
      });
    }
  }

  confirmDeleteCategory(cat: MedicineCategory): void {
    this.deleteTarget.set({ type: 'category', id: cat.id, name: cat.name });
    this.showDeleteConfirm.set(true);
  }

  // --- EXECUTE DELETE ---
  executeDelete(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.submitting.set(true);
    if (target.type === 'medicine') {
      this.medicineService.deleteMedicine(target.id).subscribe({
        next: () => {
          this.submitting.set(false);
          this.showDeleteConfirm.set(false);
          this.showAlert(`Đã xóa thuốc "${target.name}" khỏi danh mục!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Không thể xóa thuốc này!', 'danger');
        }
      });
    } else {
      this.categoryService.deleteCategory(target.id).subscribe({
        next: () => {
          this.submitting.set(false);
          this.showDeleteConfirm.set(false);
          this.showAlert(`Đã xóa nhóm thuốc "${target.name}" thành công!`, 'success');
          this.loadData();
        },
        error: err => {
          this.submitting.set(false);
          this.showAlert(err.error?.message || 'Không thể xóa nhóm thuốc này!', 'danger');
        }
      });
    }
  }

  showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => {
      if (this.alertMessage() === message) {
        this.alertMessage.set(null);
      }
    }, 4000);
  }

  private getEmptyMedicineRequest(): MedicineRequest {
    return {
      code: '',
      name: '',
      activeIngredient: '',
      dosageForm: 'Viên nén',
      unit: 'Viên',
      price: 0,
      packaging: '',
      routeOfAdministration: 'Đường uống',
      stockQuantity: 100,
      isActive: true,
      contraindications: '',
      defaultUsageInstructions: '',
      categoryId: undefined
    };
  }

  private getEmptyCategoryRequest(): MedicineCategoryRequest {
    return {
      code: '',
      name: '',
      description: '',
      isActive: true,
      displayOrder: 1
    };
  }
}
