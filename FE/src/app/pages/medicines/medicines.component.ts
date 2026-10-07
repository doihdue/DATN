import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicineService } from '../../services/medicine.service';
import { MedicineCategoryService } from '../../services/medicine-category.service';
import { Medicine, MedicineRequest } from '../../models/medicine.model';
import { MedicineCategory, MedicineCategoryRequest } from '../../models/medicine-category.model';

@Component({
  selector: 'app-medicines',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="medicines-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-capsule-pill"></i> Phân Hệ Quản Trị Dược Phẩm
          </div>
          <h1 class="page-title">Quản Lý Danh Mục Thuốc & Dược Phẩm</h1>
          <p class="page-subtitle">
            Cấu hình phân loại nhóm dược lý, tra cứu biệt dược, hoạt chất, quy cách, đơn giá và định mức tồn kho
          </p>
        </div>
        <div class="header-actions">
          @if (activeTab() === 'medicines') {
            <button class="btn btn-primary" (click)="openAddMedicineModal()">
              <i class="bi bi-plus-circle-fill"></i> Thêm Thuốc Mới
            </button>
          } @else {
            <button class="btn btn-primary" (click)="openAddCategoryModal()">
              <i class="bi bi-folder-plus"></i> Thêm Nhóm Thuốc
            </button>
          }
        </div>
      </div>

      <!-- Navigation Tabs & Stats Card -->
      <div class="tab-controls-card">
        <div class="nav-tabs-wrapper">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'medicines'"
            (click)="switchTab('medicines')"
          >
            <i class="bi bi-capsule"></i>
            Kho Thuốc & Biệt Dược
            <span class="tab-count-badge">{{ medicines().length }}</span>
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'categories'"
            (click)="switchTab('categories')"
          >
            <i class="bi bi-folder2-open"></i>
            Nhóm & Danh Mục Thuốc
            <span class="tab-count-badge">{{ categories().length }}</span>
          </button>
        </div>

        <!-- Quick Stats Overview -->
        <div class="stats-overview">
          <div class="stat-pill">
            <span class="stat-label">Tổng biệt dược:</span>
            <strong class="stat-value text-primary">{{ totalMedicines() }}</strong>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Đang hoạt động:</span>
            <strong class="stat-value text-success">{{ activeMedicines() }}</strong>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Cảnh báo tồn ít:</span>
            <strong class="stat-value text-warning">{{ lowStockMedicines() }}</strong>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Nhóm dược lý:</span>
            <strong class="stat-value text-info">{{ totalCategories() }}</strong>
          </div>
        </div>
      </div>

      <!-- Feedback Alerts (Toast Notification) -->
      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
            <div class="toast-icon">
              <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
            </div>
            <div class="toast-content">
              <div class="toast-title">{{ alertType() === 'success' ? 'Thành công' : 'Thông báo lỗi' }}</div>
              <div class="toast-message">{{ alertMessage() }}</div>
            </div>
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" title="Đóng thông báo">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <!-- ==================== TAB 1: KHO THUỐC & BIỆT DƯỢC ==================== -->
      @if (activeTab() === 'medicines') {
        <!-- Search & Filter Card -->
        <div class="filter-card">
          <div class="filter-inputs">
            <!-- Search Box -->
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                [(ngModel)]="medicineSearchKeyword"
                (ngModelChange)="onFilterChange()"
                placeholder="Tìm kiếm theo mã thuốc, tên biệt dược, hoạt chất..."
                class="search-input"
              />
              @if (medicineSearchKeyword) {
                <button class="btn-clear-search" (click)="medicineSearchKeyword = ''; onFilterChange()">
                  <i class="bi bi-x-circle-fill"></i>
                </button>
              }
            </div>

            <!-- Category Filter -->
            <div class="filter-select-group">
              <label class="filter-label"><i class="bi bi-funnel-fill text-primary"></i> Nhóm thuốc:</label>
              <select [(ngModel)]="selectedCategoryId" (ngModelChange)="onFilterChange()" class="form-select">
                <option [ngValue]="null">-- Tất cả nhóm thuốc --</option>
                @for (c of categories(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>

            <!-- Status Filter -->
            <div class="filter-select-group">
              <label class="filter-label"><i class="bi bi-activity text-primary"></i> Trạng thái:</label>
              <select [(ngModel)]="statusFilter" (ngModelChange)="onFilterChange()" class="form-select">
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Tạm ngừng sử dụng</option>
              </select>
            </div>

            @if (medicineSearchKeyword || selectedCategoryId !== null || statusFilter !== 'ALL') {
              <button class="btn-reset-filters" (click)="resetMedicineFilters()" title="Đặt lại toàn bộ bộ lọc">
                <i class="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
              </button>
            }
          </div>
        </div>

        <!-- Medicine Table & Pagination Container -->
        <div class="table-card">
          @if (loading()) {
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Đang tải dữ liệu danh mục thuốc...</p>
            </div>
          } @else if (filteredMedicines().length === 0) {
            <div class="empty-state">
              <i class="bi bi-capsule text-muted"></i>
              <h3>Không tìm thấy loại thuốc nào phù hợp</h3>
              <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc nhấn nút "Thêm Thuốc Mới" để tạo mới.</p>
            </div>
          } @else {
            <div class="table-responsive">
              <table class="clinical-table">
                <thead>
                  <tr>
                    <th style="width: 100px;">Mã thuốc</th>
                    <th style="min-width: 220px;">Tên biệt dược</th>
                    <th style="min-width: 200px;">Hoạt chất chính</th>
                    <th style="min-width: 170px;">Nhóm dược lý</th>
                    <th style="width: 90px; text-align: center;">Đơn vị</th>
                    <th style="width: 120px; text-align: right;">Đơn giá</th>
                    <th style="width: 100px; text-align: center;">Tồn kho</th>
                    <th style="width: 120px; text-align: center;">Trạng thái</th>
                    <th style="width: 110px; text-align: center;">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of paginatedMedicines(); track item.id) {
                    <tr class="table-row">
                      <td>
                        <span class="code-badge">{{ item.code || 'MED-' + item.id }}</span>
                      </td>
                      <td>
                        <div class="med-name-cell">
                          <strong class="med-title">{{ item.name }}</strong>
                          <span class="med-sub">
                            <i class="bi bi-box-seam"></i> {{ item.dosageForm || 'Chưa rõ dạng' }}
                            @if (item.packaging) {
                              • {{ item.packaging }}
                            }
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="med-ingredient" [title]="item.activeIngredient || ''">
                          {{ item.activeIngredient || '--' }}
                        </div>
                      </td>
                      <td>
                        @if (item.categoryName) {
                          <span class="category-badge">
                            <i class="bi bi-tag-fill"></i> {{ item.categoryName }}
                          </span>
                        } @else {
                          <span class="text-muted-tag">Chưa phân loại</span>
                        }
                      </td>
                      <td style="text-align: center;">
                        <span class="unit-badge">{{ item.unit || 'Viên' }}</span>
                      </td>
                      <td style="text-align: right;">
                        <span class="price-text">{{ (item.price || 0) | number:'1.0-0' }} đ</span>
                      </td>
                      <td style="text-align: center;">
                        <span
                          class="stock-badge"
                          [ngClass]="(item.stockQuantity || 0) < 100 ? 'stock-low' : 'stock-ok'"
                          [title]="(item.stockQuantity || 0) < 100 ? 'Cảnh báo: Tồn kho dưới 100 đơn vị' : 'Tồn kho khả dụng'"
                        >
                          <i class="bi" [ngClass]="(item.stockQuantity || 0) < 100 ? 'bi-exclamation-triangle-fill' : 'bi-check2'"></i>
                          {{ item.stockQuantity || 0 }}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <span class="status-pill" [class.status-active]="item.isActive" [class.status-inactive]="!item.isActive">
                          <span class="status-dot"></span>
                          {{ item.isActive ? 'Hoạt động' : 'Tạm ngừng' }}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <div class="action-buttons-cell">
                          <button class="btn-action btn-action-edit" (click)="openEditMedicineModal(item)" title="Chỉnh sửa thông tin">
                            <i class="bi bi-pencil-fill"></i>
                          </button>
                          <button class="btn-action btn-action-delete" (click)="confirmDeleteMedicine(item)" title="Xóa thuốc khỏi danh mục">
                            <i class="bi bi-trash3-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- CLEAR & POWERFUL PAGINATION BAR -->
            <div class="pagination-footer">
              <div class="pagination-info">
                <span>
                  Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ filteredMedicines().length }}</strong> loại thuốc
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

              <!-- Pagination Navigation Buttons -->
              <div class="pagination-controls">
                <button
                  class="btn-page btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="goToPage(1)"
                  title="Về trang đầu tiên"
                >
                  <i class="bi bi-chevron-double-left"></i>
                </button>

                <button
                  class="btn-page btn-page-nav"
                  [disabled]="currentPage() === 1"
                  (click)="prevPage()"
                  title="Trang trước"
                >
                  <i class="bi bi-chevron-left"></i> Trước
                </button>

                <!-- Page Number Pills -->
                <div class="page-numbers-group">
                  @for (p of pagesList(); track p) {
                    <button
                      class="btn-page btn-page-num"
                      [class.active]="currentPage() === p"
                      (click)="goToPage(p)"
                    >
                      {{ p }}
                    </button>
                  }
                </div>

                <button
                  class="btn-page btn-page-nav"
                  [disabled]="currentPage() === totalPages()"
                  (click)="nextPage()"
                  title="Trang sau"
                >
                  Sau <i class="bi bi-chevron-right"></i>
                </button>

                <button
                  class="btn-page btn-page-nav"
                  [disabled]="currentPage() === totalPages()"
                  (click)="goToPage(totalPages())"
                  title="Đến trang cuối cùng"
                >
                  <i class="bi bi-chevron-double-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- ==================== TAB 2: NHÓM & DANH MỤC THUỐC ==================== -->
      @if (activeTab() === 'categories') {
        <div class="filter-card">
          <div class="filter-inputs">
            <div class="search-box">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                [(ngModel)]="categorySearchKeyword"
                (ngModelChange)="onCategoryFilterChange()"
                placeholder="Tìm kiếm theo mã nhóm, tên nhóm thuốc hoặc công dụng điều trị..."
                class="search-input"
              />
              @if (categorySearchKeyword) {
                <button class="btn-clear-search" (click)="categorySearchKeyword = ''; onCategoryFilterChange()">
                  <i class="bi bi-x-circle-fill"></i>
                </button>
              }
            </div>
            @if (categorySearchKeyword) {
              <button class="btn-reset-filters" (click)="categorySearchKeyword = ''; onCategoryFilterChange()" title="Đặt lại tìm kiếm">
                <i class="bi bi-arrow-counterclockwise"></i> Đặt lại
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh mục nhóm thuốc...</p>
          </div>
        } @else if (filteredCategories().length === 0) {
          <div class="empty-state">
            <i class="bi bi-folder-x text-muted"></i>
            <h3>Không tìm thấy nhóm thuốc nào</h3>
            <p>Nhấn nút "Thêm Nhóm Thuốc" để tạo phân loại dược lý mới.</p>
          </div>
        } @else {
          <div class="categories-grid">
            @for (cat of paginatedCategories(); track cat.id) {
              <div class="category-card">
                <div class="cat-card-header">
                  <div class="cat-code-badge">
                    <i class="bi bi-folder-symlink-fill"></i> {{ cat.code || 'CAT' }}
                  </div>
                  <div class="cat-meta-right">
                    <button class="badge-count btn-link-badge" (click)="filterMedicinesByCategory(cat.id)" title="Bấm để lọc danh sách thuốc thuộc nhóm này">
                      <i class="bi bi-capsule"></i> {{ cat.medicineCount || 0 }} thuốc
                    </button>
                    <span class="status-pill" [class.status-active]="cat.isActive" [class.status-inactive]="!cat.isActive">
                      <span class="status-dot"></span>
                      {{ cat.isActive ? 'Hoạt động' : 'Tạm ngừng' }}
                    </span>
                  </div>
                </div>

                <h3 class="cat-title">{{ cat.name }}</h3>
                <p class="cat-desc">{{ cat.description || 'Chưa có thông tin mô tả chi tiết cho nhóm thuốc này.' }}</p>

                <div class="cat-card-footer">
                  <span class="order-info"><i class="bi bi-sort-numeric-down"></i> Thứ tự: <strong>{{ cat.displayOrder || 0 }}</strong></span>
                  <div class="cat-actions">
                    <button class="btn btn-sm btn-outline-primary" (click)="openEditCategoryModal(cat)" title="Chỉnh sửa nhóm">
                      <i class="bi bi-pencil-square"></i> Sửa
                    </button>
                    <button class="btn btn-sm btn-outline-danger" (click)="confirmDeleteCategory(cat)" title="Xóa nhóm thuốc">
                      <i class="bi bi-trash3"></i> Xóa
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Category Pagination Bar -->
          <div class="pagination-footer mt-4">
            <div class="pagination-info">
              <span>
                Hiển thị <strong>{{ categoryStartIndex() }} - {{ categoryEndIndex() }}</strong> trên tổng số <strong>{{ filteredCategories().length }}</strong> nhóm thuốc
              </span>
              <div class="page-size-selector">
                <label for="catPageSizeSelect">Số nhóm/trang:</label>
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

            <!-- Pagination Navigation Buttons -->
            <div class="pagination-controls">
              <button
                class="btn-page btn-page-nav"
                [disabled]="categoryCurrentPage() === 1"
                (click)="goToCategoryPage(1)"
                title="Về trang đầu tiên"
              >
                <i class="bi bi-chevron-double-left"></i>
              </button>

              <button
                class="btn-page btn-page-nav"
                [disabled]="categoryCurrentPage() === 1"
                (click)="prevCategoryPage()"
                title="Trang trước"
              >
                <i class="bi bi-chevron-left"></i> Trước
              </button>

              <!-- Page Number Pills -->
              <div class="page-numbers-group">
                @for (p of categoryPagesList(); track p) {
                  <button
                    class="btn-page btn-page-num"
                    [class.active]="categoryCurrentPage() === p"
                    (click)="goToCategoryPage(p)"
                  >
                    {{ p }}
                  </button>
                }
              </div>

              <button
                class="btn-page btn-page-nav"
                [disabled]="categoryCurrentPage() === categoryTotalPages()"
                (click)="nextCategoryPage()"
                title="Trang sau"
              >
                Sau <i class="bi bi-chevron-right"></i>
              </button>

              <button
                class="btn-page btn-page-nav"
                [disabled]="categoryCurrentPage() === categoryTotalPages()"
                (click)="goToCategoryPage(categoryTotalPages())"
                title="Đến trang cuối cùng"
              >
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      }

      <!-- ==================== MODAL: THÊM / CẬP NHẬT THUỐC ==================== -->
      @if (showMedicineModal()) {
        <div class="modal-backdrop" (click)="closeMedicineModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-capsule text-primary"></i>
                {{ isEditingMedicine() ? 'Cập Nhật Thông Tin Thuốc' : 'Thêm Mới Thuốc Vào Danh Mục' }}
              </h2>
              <button class="modal-close-btn" (click)="closeMedicineModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label required">Tên biệt dược</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.name"
                    placeholder="Ví dụ: Panadol Extra 500mg, Augmentin 1g..."
                    class="form-control"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Mã định danh thuốc</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.code"
                    placeholder="Ví dụ: MED-001, PARA500..."
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
                  <label class="form-label">Hoạt chất chính & Hàm lượng</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.activeIngredient"
                    placeholder="Ví dụ: Paracetamol 500mg + Caffeine 65mg"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Dạng bào chế</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.dosageForm"
                    placeholder="Ví dụ: Viên nén, Viên bao phim, Siro, Hỗn dịch..."
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label required">Đơn vị tính</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.unit"
                    placeholder="Ví dụ: Viên, Gói, Chai, Lọ, Ống, Tuýp..."
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Đơn giá kê đơn (VNĐ)</label>
                  <input
                    type="number"
                    [(ngModel)]="medicineFormData.price"
                    placeholder="Ví dụ: 2500"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Tồn kho khả dụng</label>
                  <input
                    type="number"
                    [(ngModel)]="medicineFormData.stockQuantity"
                    placeholder="Ví dụ: 500"
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Đường dùng</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.routeOfAdministration"
                    placeholder="Ví dụ: Đường uống, Bôi ngoài da, Nhỏ mắt..."
                    class="form-control"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">Quy cách đóng gói</label>
                  <input
                    type="text"
                    [(ngModel)]="medicineFormData.packaging"
                    placeholder="Ví dụ: Hộp 10 vỉ x 10 viên"
                    class="form-control"
                  />
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Hướng dẫn sử dụng mặc định</label>
                <textarea
                  [(ngModel)]="medicineFormData.defaultUsageInstructions"
                  rows="2"
                  placeholder="Ví dụ: Uống 1 viên khi sốt > 38.5 độ C, cách 4-6 giờ sau ăn"
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Chống chỉ định & Cảnh báo an toàn</label>
                <textarea
                  [(ngModel)]="medicineFormData.contraindications"
                  rows="2"
                  placeholder="Ví dụ: Người mẫn cảm với Paracetamol, bệnh nhân suy gan thận nặng..."
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group checkbox-group mt-3">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="medicineFormData.isActive" />
                  <span>Kích hoạt thuốc sẵn sàng kê đơn</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeMedicineModal()">Hủy bỏ</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveMedicine()">
                <i class="bi bi-check-circle-fill"></i>
                {{ submitting() ? 'Đang lưu...' : (isEditingMedicine() ? 'Lưu Thay Đổi' : 'Thêm Thuốc') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==================== MODAL: THÊM / CẬP NHẬT NHÓM THUỐC ==================== -->
      @if (showCategoryModal()) {
        <div class="modal-backdrop" (click)="closeCategoryModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-folder-fill text-primary"></i>
                {{ isEditingCategory() ? 'Cập Nhật Nhóm Thuốc' : 'Thêm Nhóm Thuốc Mới' }}
              </h2>
              <button class="modal-close-btn" (click)="closeCategoryModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Tên nhóm thuốc</label>
                <input
                  type="text"
                  [(ngModel)]="categoryFormData.name"
                  placeholder="Ví dụ: Nhóm Kháng Sinh & Kháng Khuẩn..."
                  class="form-control"
                  required
                />
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Mã nhóm thuốc</label>
                <input
                  type="text"
                  [(ngModel)]="categoryFormData.code"
                  placeholder="Ví dụ: KS, GD-HS, TH-DD..."
                  class="form-control"
                />
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Mô tả tác dụng điều trị</label>
                <textarea
                  [(ngModel)]="categoryFormData.description"
                  rows="3"
                  placeholder="Mô tả công dụng và các lưu ý chung của nhóm thuốc..."
                  class="form-control"
                ></textarea>
              </div>

              <div class="form-group mt-3">
                <label class="form-label">Thứ tự hiển thị ưu tiên</label>
                <input
                  type="number"
                  [(ngModel)]="categoryFormData.displayOrder"
                  class="form-control"
                />
              </div>

              <div class="form-group checkbox-group mt-3">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="categoryFormData.isActive" />
                  <span>Kích hoạt nhóm thuốc</span>
                </label>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeCategoryModal()">Hủy bỏ</button>
              <button class="btn btn-primary" [disabled]="submitting()" (click)="saveCategory()">
                <i class="bi bi-check-circle-fill"></i>
                {{ submitting() ? 'Đang lưu...' : (isEditingCategory() ? 'Lưu Thay Đổi' : 'Tạo Nhóm') }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ==================== MODAL: XÁC NHẬN XÓA ==================== -->
      @if (showDeleteConfirm()) {
        <div class="modal-backdrop" (click)="showDeleteConfirm.set(false)">
          <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
            <div class="modal-header danger-header">
              <h2 class="modal-title">
                <i class="bi bi-exclamation-triangle-fill text-danger"></i> Xác Nhận Xóa
              </h2>
              <button class="modal-close-btn" (click)="showDeleteConfirm.set(false)">×</button>
            </div>
            <div class="modal-body text-center py-4">
              <p class="mb-2">Bạn có chắc chắn muốn xóa:</p>
              <h4 class="text-danger font-weight-bold">{{ deleteTarget()?.name }}</h4>
              <p class="text-muted small mt-2">Hành động này không thể hoàn tác nếu không có ràng buộc dữ liệu bảo vệ.</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="showDeleteConfirm.set(false)">Hủy</button>
              <button class="btn btn-danger" [disabled]="submitting()" (click)="executeDelete()">
                {{ submitting() ? 'Đang xóa...' : 'Đồng Ý Xóa' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ==========================================================================
       Clinical Light Design System - High Legibility & Ergonomics
       ========================================================================== */
    .medicines-page {
      padding: 1.5rem 2rem 3rem;
      max-width: 1440px;
      margin: 0 auto;
      background-color: #f8fafc;
      color: #0f172a;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin-bottom: 0.4rem;
    }

    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
      margin: 0 0 0.3rem;
    }

    .page-subtitle {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0;
      max-width: 800px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: 10px;
      font-weight: 700;
      font-size: 0.9rem;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }

    .btn-primary:hover {
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.5);
      transform: translateY(-1px);
    }

    .btn-outline {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    .btn-outline:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-danger {
      background: #ef4444;
      color: #ffffff;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .btn-outline-primary {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }

    .btn-outline-primary:hover {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-outline-danger {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    .btn-outline-danger:hover {
      background: #dc2626;
      color: #ffffff;
    }

    /* Tab Controls Card */
    .tab-controls-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 0.75rem 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    .nav-tabs-wrapper {
      display: flex;
      gap: 0.5rem;
    }

    .tab-btn {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #64748b;
      padding: 0.65rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #0284c7;
      background: #f0f9ff;
      border-color: #bae6fd;
    }

    .tab-btn.active {
      color: #ffffff;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      border-color: #0284c7;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
    }

    .tab-count-badge {
      background: #ffffff;
      color: #0284c7;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }

    .tab-btn:not(.active) .tab-count-badge {
      background: #e2e8f0;
      color: #475569;
    }

    .stats-overview {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .stat-pill {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
    }

    .stat-label {
      color: #64748b;
    }

    .stat-value {
      font-weight: 800;
    }

    .text-primary { color: #0284c7 !important; }
    .text-success { color: #16a34a !important; }
    .text-warning { color: #d97706 !important; }
    .text-info { color: #0284c7 !important; }
    .text-danger { color: #dc2626 !important; }

    /* Filter Card */
    .filter-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
    }

    .filter-inputs {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 0.55rem 0.85rem;
      gap: 0.6rem;
      position: relative;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .search-box:focus-within {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .search-icon {
      color: #64748b;
      font-size: 1rem;
    }

    .search-input {
      background: transparent;
      border: none;
      color: #0f172a;
      outline: none;
      width: 100%;
      font-size: 0.92rem;
      font-weight: 500;
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .btn-clear-search {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      font-size: 1rem;
    }

    .btn-clear-search:hover { color: #ef4444; }

    .filter-select-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: #334155;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      white-space: nowrap;
    }

    .form-select, .form-select-sm, .form-control {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      color: #0f172a;
      padding: 0.55rem 0.85rem;
      font-size: 0.88rem;
      font-weight: 500;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-select:focus, .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .btn-reset-filters {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 0.55rem 0.95rem;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-reset-filters:hover {
      background: #e2e8f0;
      color: #0f172a;
      border-color: #94a3b8;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .clinical-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }

    .clinical-table thead th {
      background: #f8fafc;
      color: #475569;
      font-weight: 800;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.95rem 1rem;
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
      padding: 0.9rem 1rem;
      vertical-align: middle;
      color: #1e293b;
    }

    /* Badge & Cell Styles */
    .code-badge {
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 800;
      font-size: 0.8rem;
    }

    .med-name-cell {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .med-title {
      color: #0f172a;
      font-weight: 800;
      font-size: 0.95rem;
    }

    .med-sub {
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .med-ingredient {
      color: #334155;
      font-weight: 500;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .category-badge {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .text-muted-tag {
      color: #94a3b8;
      font-style: italic;
      font-size: 0.82rem;
    }

    .unit-badge {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .price-text {
      color: #059669;
      font-weight: 800;
      font-size: 0.95rem;
      font-variant-numeric: tabular-nums;
    }

    .stock-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.22rem 0.65rem;
      border-radius: 999px;
      font-weight: 800;
      font-size: 0.82rem;
      font-variant-numeric: tabular-nums;
    }

    .stock-ok {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .stock-low {
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
    }

    .status-active {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
    }

    .status-inactive {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .status-active .status-dot { background: #16a34a; }
    .status-inactive .status-dot { background: #94a3b8; }

    .action-buttons-cell {
      display: flex;
      justify-content: center;
      gap: 0.45rem;
    }

    .btn-action {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
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
      padding: 0.9rem 1.25rem;
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
      padding: 0.3rem 0.65rem;
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

    /* Categories Grid */
    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .category-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }

    .category-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
      border-color: #bae6fd;
    }

    .cat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .cat-code-badge {
      font-family: monospace;
      font-weight: 800;
      color: #0284c7;
      background: #e0f2fe;
      border: 1px solid #bae6fd;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-size: 0.85rem;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .cat-meta-right {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .badge-count {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #e2e8f0;
      padding: 0.25rem 0.6rem;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .btn-link-badge {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-link-badge:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
      transform: translateY(-1px);
    }

    .mt-4 {
      margin-top: 1.5rem !important;
    }

    .cat-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .cat-desc {
      font-size: 0.88rem;
      color: #64748b;
      margin: 0;
      flex: 1;
      line-height: 1.5;
    }

    .cat-card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 0.75rem;
      font-size: 0.82rem;
      color: #64748b;
    }

    .cat-actions {
      display: flex;
      gap: 0.4rem;
    }

    /* Modal Backdrop & Dialog (Clean Light Styling) */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
      width: 100%;
      max-width: 550px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      animation: modalFadeIn 0.2s ease-out;
      border: 1px solid #e2e8f0;
    }

    .modal-lg { max-width: 780px; }
    .modal-sm { max-width: 420px; }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .danger-header .modal-title { color: #dc2626; }

    .modal-close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
    }

    .modal-close-btn:hover { color: #0f172a; }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
      border-bottom-left-radius: 16px;
      border-bottom-right-radius: 16px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .form-grid-2 { grid-template-columns: 1fr; }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.88rem;
      font-weight: 700;
      color: #334155;
    }

    .form-label.required::after {
      content: ' *';
      color: #ef4444;
    }

    .checkbox-group { margin-top: 0.5rem; }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }

    /* Floating Toast Alerts */
    .toast-floating-container {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 2000;
      animation: slideInRight 0.3s ease-out;
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .toast-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.9rem 1.25rem;
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 15px 35px rgba(15, 23, 42, 0.15);
      border: 1px solid transparent;
      min-width: 320px;
    }

    .toast-success {
      border-color: #a7f3d0;
      background: #f0fdf4;
    }

    .toast-danger {
      border-color: #fecaca;
      background: #fef2f2;
    }

    .toast-icon { font-size: 1.4rem; }
    .toast-success .toast-icon { color: #16a34a; }
    .toast-danger .toast-icon { color: #dc2626; }

    .toast-content { flex: 1; }

    .toast-title {
      font-weight: 800;
      font-size: 0.92rem;
      color: #0f172a;
    }

    .toast-message {
      font-size: 0.84rem;
      color: #475569;
    }

    .btn-close-toast {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
    }

    .btn-close-toast:hover { color: #0f172a; }

    /* Empty & Loading States */
    .loading-state, .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: #64748b;
    }

    .empty-state i {
      font-size: 3.5rem;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
      display: inline-block;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0.5rem 0 0.25rem;
    }

    .spinner {
      width: 44px;
      height: 44px;
      border: 3.5px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class MedicinesComponent implements OnInit {
  private readonly medicineService = inject(MedicineService);
  private readonly categoryService = inject(MedicineCategoryService);

  // Tab State: 'medicines' | 'categories'
  activeTab = signal<'medicines' | 'categories'>('medicines');

  // Data signals
  medicines = signal<Medicine[]>([]);
  categories = signal<MedicineCategory[]>([]);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);

  // Filters for Medicines
  medicineSearchKeyword = '';
  selectedCategoryId: number | null = null;
  statusFilter = 'ALL'; // ALL | ACTIVE | INACTIVE

  // Pagination for Medicines
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  readonly pageSizeOptions = [5, 10, 15, 20, 50];

  // Filters & Pagination for Categories
  categorySearchKeyword = '';
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

  // Filtered lists
  filteredMedicines = computed(() => {
    let list = this.medicines();
    const kw = this.medicineSearchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(m =>
        m.name.toLowerCase().includes(kw) ||
        (m.code && m.code.toLowerCase().includes(kw)) ||
        (m.activeIngredient && m.activeIngredient.toLowerCase().includes(kw))
      );
    }
    if (this.selectedCategoryId) {
      list = list.filter(m => m.categoryId === this.selectedCategoryId);
    }
    if (this.statusFilter === 'ACTIVE') {
      list = list.filter(m => m.isActive === true);
    } else if (this.statusFilter === 'INACTIVE') {
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
    const kw = this.categorySearchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(kw) ||
        (c.code && c.code.toLowerCase().includes(kw)) ||
        (c.description && c.description.toLowerCase().includes(kw))
      );
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
    this.loadData();
  }

  switchTab(tab: 'medicines' | 'categories'): void {
    this.activeTab.set(tab);
    if (tab === 'medicines') {
      this.currentPage.set(1);
    } else {
      this.categoryCurrentPage.set(1);
    }
  }

  onFilterChange(): void {
    this.currentPage.set(1);
  }

  resetMedicineFilters(): void {
    this.medicineSearchKeyword = '';
    this.selectedCategoryId = null;
    this.statusFilter = 'ALL';
    this.onFilterChange();
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
    this.selectedCategoryId = categoryId;
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
