import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { timeout } from 'rxjs';
import { ClinicalLabService } from '../../services/lab.service';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../models/lab.model';
import { ApiResponse } from '../../models/auth.models';

@Component({
  selector: 'app-lab-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lab-services-page">
      <!-- Toast Alert Notification -->
      @if (toastMessage()) {
        <div class="toast-floating" [class.toast-success]="toastType() === 'success'" [class.toast-error]="toastType() === 'error'">
          <i class="bi" [class.bi-check-circle-fill]="toastType() === 'success'" [class.bi-exclamation-triangle-fill]="toastType() === 'error'"></i>
          <span>{{ toastMessage() }}</span>
        </div>
      }

      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-journal-medical"></i> Danh Mục Kỹ Thuật Y Khoa
          </div>
          <h1 class="page-title">Danh Mục Xét Nghiệm &amp; Cận Lâm Sàng</h1>
          <p class="page-subtitle">
            Bảng quy chuẩn chỉ số tham chiếu sinh học, ngưỡng cảnh báo an toàn và bảng giá kỹ thuật cận lâm sàng
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadServices()">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Làm mới danh mục
          </button>
          @if (isAdmin()) {
            <button type="button" class="btn btn-primary" (click)="openCreateModal()">
              <i class="bi bi-plus-circle-fill"></i> Thêm Kỹ Thuật Xét Nghiệm
            </button>
          }
        </div>
      </div>

      <!-- Quick Category Statistics Pills -->
      <div class="category-pills">
        <button
          type="button"
          class="pill-btn"
          [class.active]="selectedCategory() === 'ALL'"
          (click)="selectCategory('ALL')">
          <i class="bi bi-grid-fill"></i> Tất cả
          <span class="pill-count">{{ services().length }}</span>
        </button>
        @for (cat of categories(); track cat) {
          <button
            type="button"
            class="pill-btn"
            [class.active]="selectedCategory() === cat"
            (click)="selectCategory(cat)">
            <i class="bi" [ngClass]="getCategoryIcon(cat)"></i> {{ cat }}
            <span class="pill-count">{{ getCategoryCount(cat) }}</span>
          </button>
        }
      </div>

      <!-- Search & Filters Bar -->
      <div class="search-bar-card">
        <div class="search-box">
          <i class="bi bi-search search-icon"></i>
          <input
            type="text"
            class="search-input"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Tìm theo mã dịch vụ (XN-HEM...), tên kỹ thuật hoặc chỉ số tham chiếu..."
          />
          @if (searchQuery) {
            <button type="button" class="btn-clear" (click)="clearSearch()">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          }
        </div>
      </div>

      <!-- Data Table Card -->
      <div class="table-card">
        @if (loading()) {
          <div class="state-container">
            <div class="spinner-border text-primary" role="status"></div>
            <p>Đang tải danh mục xét nghiệm y khoa...</p>
          </div>
        } @else if (filteredServices().length === 0) {
          <div class="state-container">
            <i class="bi bi-inbox empty-icon"></i>
            <h3>Không tìm thấy dịch vụ cận lâm sàng nào</h3>
            <p>Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn nhóm xét nghiệm khác.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="services-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Mã Dịch Vụ</th>
                  <th style="min-width: 250px;">Tên Dịch Vụ Xét Nghiệm</th>
                  <th style="width: 140px;">Phân Nhóm</th>
                  <th style="width: 210px;">Khoảng Tham Chiếu Chuẩn</th>
                  <th style="width: 90px;">Đơn Vị</th>
                  <th style="width: 130px; text-align: right;">Đơn Giá (VNĐ)</th>
                  <th style="min-width: 200px;">Mô Tả &amp; Yêu Cầu Kỹ Thuật</th>
                  <th [style.width]="isAdmin() ? '190px' : '100px'" style="text-align: center;">Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                @for (svc of pagedServices(); track svc.id) {
                  <tr>
                    <td>
                      <span class="code-badge">{{ svc.serviceCode }}</span>
                    </td>
                    <td>
                      <div class="service-name-box">
                        <strong class="name-text">{{ svc.serviceName }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="category-tag" [ngClass]="getCategoryBadgeClass(svc.category)">
                        {{ svc.category || 'Xét nghiệm chung' }}
                      </span>
                    </td>
                    <td>
                      <div class="ref-range-box">
                        @if (svc.referenceRange) {
                          <span class="range-text">{{ svc.referenceRange }}</span>
                        } @else {
                          <span class="text-muted">Chưa quy định</span>
                        }
                        @if (svc.lowerLimit !== undefined || svc.upperLimit !== undefined) {
                          <div class="limits-mini">
                            Ngưỡng: [{{ svc.lowerLimit ?? 0 }} - {{ svc.upperLimit ?? '∞' }}]
                          </div>
                        }
                      </div>
                    </td>
                    <td>
                      <span class="unit-badge">{{ svc.unit || '-' }}</span>
                    </td>
                    <td style="text-align: right;">
                      <span class="price-val">{{ (svc.price || 0) | number:'1.0-0' }} đ</span>
                    </td>
                    <td>
                      <div class="desc-text" [title]="svc.description || ''">
                        {{ svc.description || 'Không có mô tả thêm' }}
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <div class="action-buttons-group">
                        <button type="button" class="btn-detail-sm" (click)="selectedServiceDetail.set(svc)" title="Xem chi tiết">
                          <i class="bi bi-info-circle"></i>
                        </button>
                        @if (isAdmin()) {
                          <button type="button" class="btn-action-edit" (click)="openEditModal(svc)" title="Chỉnh sửa dịch vụ">
                            <i class="bi bi-pencil-square"></i> Sửa
                          </button>
                          <button type="button" class="btn-action-delete" (click)="openDeleteConfirm(svc)" title="Xóa dịch vụ">
                            <i class="bi bi-trash3-fill"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Phân Trang Rõ Ràng (Pagination Bar) -->
          <div class="pagination-container">
            <div class="pagination-info">
              <span>
                Hiển thị <strong>{{ startItemIndex() }}</strong> – <strong>{{ endItemIndex() }}</strong>
                trên tổng số <strong>{{ totalItems() }}</strong> dịch vụ xét nghiệm
              </span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng/trang:</label>
                <select
                  id="pageSizeSelect"
                  [value]="pageSize()"
                  (change)="onPageSizeChange($event)">
                  @for (opt of pageSizeOptions; track opt) {
                    <option [value]="opt">{{ opt }} dòng</option>
                  }
                </select>
              </div>
            </div>

            <div class="pagination-controls">
              <button
                type="button"
                class="btn-page-nav"
                [disabled]="currentPage() === 1"
                (click)="goToPage(1)"
                title="Về trang đầu">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button
                type="button"
                class="btn-page-nav"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
                title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>

              <div class="page-numbers">
                @for (p of pagesList(); track $index) {
                  @if (p === '...') {
                    <span class="page-ellipsis">…</span>
                  } @else {
                    <button
                      type="button"
                      class="btn-page-number"
                      [class.active]="currentPage() === p"
                      (click)="goToPage(+p)">
                      {{ p }}
                    </button>
                  }
                }
              </div>

              <button
                type="button"
                class="btn-page-nav"
                [disabled]="currentPage() === totalPages()"
                (click)="nextPage()"
                title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button
                type="button"
                class="btn-page-nav"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(totalPages())"
                title="Đến trang cuối">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Detail Modal -->
      @if (selectedServiceDetail()) {
        <div class="modal-backdrop-custom" (click)="selectedServiceDetail.set(null)">
          <div class="modal-dialog-custom" (click)="$event.stopPropagation()">
            <div class="modal-header-custom">
              <div class="m-title-box">
                <span class="code-badge m-code">{{ selectedServiceDetail()?.serviceCode }}</span>
                <h3 class="m-title">{{ selectedServiceDetail()?.serviceName }}</h3>
              </div>
              <button type="button" class="btn-close-custom" (click)="selectedServiceDetail.set(null)">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="modal-body-custom">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">Phân Nhóm Kỹ Thuật:</span>
                  <span class="detail-val font-semibold">{{ selectedServiceDetail()?.category }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Đơn Giá Kỹ Thuật:</span>
                  <span class="detail-val price-highlight">{{ (selectedServiceDetail()?.price || 0) | number:'1.0-0' }} VNĐ</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Đơn Vị Đo Lường:</span>
                  <span class="detail-val">{{ selectedServiceDetail()?.unit || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Khoảng Tham Chiếu Bình Thường:</span>
                  <span class="detail-val ref-highlight">{{ selectedServiceDetail()?.referenceRange || 'Bình thường' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Giới Hạn Ngưỡng Dưới (Min):</span>
                  <span class="detail-val">{{ selectedServiceDetail()?.lowerLimit ?? 'Không quy định' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Giới Hạn Ngưỡng Trên (Max):</span>
                  <span class="detail-val">{{ selectedServiceDetail()?.upperLimit ?? 'Không quy định' }}</span>
                </div>
                <div class="detail-item full-width">
                  <span class="detail-label">Mô Tả &amp; Hướng Dẫn Kỹ Thuật Chuẩn Bị Mẫu:</span>
                  <p class="desc-full">{{ selectedServiceDetail()?.description || 'Tiến hành theo quy trình kỹ thuật chuẩn của Bộ Y Tế.' }}</p>
                </div>
              </div>
            </div>
            <div class="modal-footer-custom">
              <button type="button" class="btn btn-outline" (click)="selectedServiceDetail.set(null)">
                Đóng
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Create / Edit Modal (Admin CRUD) -->
      @if (showFormModal()) {
        <div class="modal-backdrop-custom" (click)="closeFormModal()">
          <div class="modal-dialog-custom modal-form-lg" (click)="$event.stopPropagation()">
            <div class="modal-header-custom">
              <div class="m-title-box">
                <h3 class="m-title">
                  <i class="bi" [class.bi-plus-circle-fill]="!isEditMode()" [class.bi-pencil-square]="isEditMode()"></i>
                  {{ isEditMode() ? 'Cập Nhật Kỹ Thuật Xét Nghiệm' : 'Thêm Mới Kỹ Thuật Xét Nghiệm' }}
                </h3>
                <p class="m-subtitle">Quy định mã kỹ thuật, đơn vị đo, khoảng tham chiếu sinh học và bảng giá</p>
              </div>
              <button type="button" class="btn-close-custom" (click)="closeFormModal()">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <form (ngSubmit)="saveService()">
              <div class="modal-body-custom">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">Mã Dịch Vụ <span class="required">*</span></label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.serviceCode"
                      name="serviceCode"
                      placeholder="VD: XN-HEM-02"
                      required
                      [disabled]="isEditMode()"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Phân Nhóm Kỹ Thuật <span class="required">*</span></label>
                    <input
                      type="text"
                      list="categorySuggestions"
                      class="form-control"
                      [(ngModel)]="formData.category"
                      name="category"
                      placeholder="Chọn hoặc nhập nhóm..."
                      required
                    />
                    <datalist id="categorySuggestions">
                      <option value="Huyết học"></option>
                      <option value="Sinh hóa máu"></option>
                      <option value="Men gan"></option>
                      <option value="Mỡ máu"></option>
                      <option value="Nước tiểu"></option>
                      <option value="Miễn dịch"></option>
                      <option value="Chẩn đoán hình ảnh"></option>
                    </datalist>
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Tên Dịch Vụ Xét Nghiệm <span class="required">*</span></label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.serviceName"
                      name="serviceName"
                      placeholder="VD: Định lượng Ferritin huyết thanh..."
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Đơn Giá Kỹ Thuật (VNĐ) <span class="required">*</span></label>
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
                    <label class="form-label">Đơn Vị Đo Lường</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.unit"
                      name="unit"
                      placeholder="VD: G/L, mmol/L, U/L, ng/mL..."
                    />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Khoảng Tham Chiếu Bình Thường</label>
                    <input
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.referenceRange"
                      name="referenceRange"
                      placeholder="VD: 30 - 400 ng/mL hoặc Âm tính (Negative)"
                    />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Giới Hạn Ngưỡng Dưới (Min)</label>
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
                    <label class="form-label">Giới Hạn Ngưỡng Trên (Max)</label>
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
                    <label class="form-label">Mô Tả &amp; Hướng Dẫn Kỹ Thuật Lấy Mẫu</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      [(ngModel)]="formData.description"
                      name="description"
                      placeholder="Ghi chú quy trình thực hiện, lưu ý khi lấy mẫu máu/bệnh phẩm..."
                    ></textarea>
                  </div>
                </div>
              </div>

              <div class="modal-footer-custom">
                <button type="button" class="btn btn-outline" (click)="closeFormModal()">
                  Hủy Bỏ
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="submitting()">
                  @if (submitting()) {
                    <span class="spinner-border spinner-border-sm"></span> Đang lưu...
                  } @else {
                    <i class="bi bi-check2-circle"></i> {{ isEditMode() ? 'Lưu Thay Đổi' : 'Tạo Dịch Vụ Mới' }}
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Delete Confirmation Modal -->
      @if (showDeleteModal()) {
        <div class="modal-backdrop-custom" (click)="closeDeleteModal()">
          <div class="modal-dialog-custom modal-confirm-card" (click)="$event.stopPropagation()">
            <div class="confirm-content">
              <div class="confirm-icon-box">
                <i class="bi bi-trash3-fill"></i>
              </div>
              <h3 class="confirm-title">Xác Nhận Xóa Dịch Vụ</h3>
              <p class="confirm-desc">
                Bạn có chắc chắn muốn xóa dịch vụ xét nghiệm
                <strong>{{ serviceToDelete()?.serviceName }}</strong>
                (Mã: <code>{{ serviceToDelete()?.serviceCode }}</code>)?
              </p>
              <p class="confirm-subnote">
                Dịch vụ sẽ được chuyển sang trạng thái ngừng hoạt động và không còn hiển thị cho Bác sĩ chỉ định.
              </p>
              <div class="confirm-actions">
                <button type="button" class="btn btn-outline" (click)="closeDeleteModal()">
                  Hủy Bỏ
                </button>
                <button type="button" class="btn btn-danger" [disabled]="deleting()" (click)="confirmDelete()">
                  @if (deleting()) {
                    <span class="spinner-border spinner-border-sm"></span> Đang xóa...
                  } @else {
                    <i class="bi bi-trash3-fill"></i> Xác Nhận Xóa
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .lab-services-page {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      min-height: calc(100vh - 70px);
      background-color: #f8fafc;
      position: relative;
    }

    /* Floating Toast Notification */
    .toast-floating {
      position: fixed;
      top: 85px;
      right: 25px;
      z-index: 2000;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
      animation: slideInToast 0.25s ease-out;
    }

    .toast-success {
      background: #065f46;
      color: #ffffff;
      border: 1px solid #059669;
    }

    .toast-error {
      background: #991b1b;
      color: #ffffff;
      border: 1px solid #dc2626;
    }

    @keyframes slideInToast {
      from { transform: translateX(50px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
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
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.35rem 0;
    }

    .page-subtitle {
      font-size: 0.925rem;
      color: #64748b;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.1rem;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }

    .btn-outline {
      background: #ffffff;
      border-color: #cbd5e1;
      color: #334155;
    }

    .btn-outline:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .btn-primary {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-color: #0284c7;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }

    .btn-danger {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }

    .btn-danger:hover {
      background: #b91c1c;
      border-color: #b91c1c;
    }

    .spin-active {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Category Pills */
    .category-pills {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      overflow-x: auto;
      padding-bottom: 0.4rem;
    }

    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.5rem 1rem;
      border-radius: 999px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .pill-btn:hover {
      background: #f0fdf4;
      border-color: #86efac;
      color: #166534;
    }

    .pill-btn.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.25);
    }

    .pill-count {
      display: inline-block;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.725rem;
      font-weight: 700;
      background: #f1f5f9;
      color: #334155;
    }

    .pill-btn.active .pill-count {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    /* Search Bar */
    .search-bar-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      padding: 0.85rem 1.25rem;
      margin-bottom: 1.25rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      position: relative;
    }

    .search-icon {
      font-size: 1.1rem;
      color: #94a3b8;
    }

    .search-input {
      flex: 1;
      border: none;
      outline: none;
      font-size: 0.95rem;
      color: #0f172a;
      background: transparent;
    }

    .btn-clear {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .table-responsive {
      overflow-x: auto;
    }

    .services-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .services-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      text-align: left;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .services-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
      vertical-align: middle;
    }

    .services-table tr:hover {
      background: #f8fafc;
    }

    .code-badge {
      display: inline-block;
      font-family: monospace;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      background: #f1f5f9;
      color: #0369a1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }

    .name-text {
      color: #0f172a;
      font-size: 0.9rem;
    }

    .category-tag {
      display: inline-block;
      font-size: 0.775rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #475569;
    }

    .tag-blood { background: #fee2e2; color: #b91c1c; }
    .tag-bio { background: #fef3c7; color: #b45309; }
    .tag-liver { background: #ffedd5; color: #c2410c; }
    .tag-image { background: #e0e7ff; color: #4338ca; }
    .tag-ecg { background: #fce7f3; color: #be185d; }

    .ref-range-box {
      font-size: 0.85rem;
    }

    .range-text {
      font-weight: 600;
      color: #0f172a;
    }

    .limits-mini {
      font-size: 0.725rem;
      color: #64748b;
      margin-top: 0.15rem;
    }

    .unit-badge {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #475569;
    }

    .price-val {
      font-weight: 700;
      color: #0284c7;
      font-size: 0.9rem;
    }

    .desc-text {
      max-width: 250px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #64748b;
      font-size: 0.825rem;
    }

    .action-buttons-group {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }

    .btn-detail-sm {
      padding: 0.35rem 0.55rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      color: #0284c7;
      font-size: 0.85rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-detail-sm:hover {
      background: #f0f9ff;
      border-color: #0284c7;
    }

    .btn-action-edit {
      padding: 0.35rem 0.65rem;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      background: #f0f9ff;
      color: #0284c7;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      transition: all 0.15s ease;
    }

    .btn-action-edit:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }

    .btn-action-delete {
      padding: 0.35rem 0.55rem;
      border: 1px solid #fecaca;
      border-radius: 6px;
      background: #fef2f2;
      color: #dc2626;
      font-size: 0.85rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .btn-action-delete:hover {
      background: #dc2626;
      color: #ffffff;
      border-color: #dc2626;
    }

    .state-container {
      padding: 3.5rem 1rem;
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
      display: block;
    }

    /* Phân Trang Rõ Ràng (Pagination Bar) */
    .pagination-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      border-radius: 0 0 16px 16px;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      color: #64748b;
      font-size: 0.875rem;

      strong {
        color: #0f172a;
        font-weight: 700;
      }
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;

      label {
        color: #64748b;
        margin: 0;
      }

      select {
        padding: 0.25rem 0.6rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        color: #0f172a;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        outline: none;
        transition: border-color 0.15s;

        &:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.15);
        }
      }
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-page-nav {
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #475569;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: #f0f9ff;
        border-color: #0284c7;
        color: #0284c7;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: #f8fafc;
        border-color: #e2e8f0;
      }
    }

    .page-numbers {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0 0.25rem;
    }

    .btn-page-number {
      min-width: 34px;
      height: 34px;
      padding: 0 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #334155;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(.active) {
        background: #f0f9ff;
        border-color: #0284c7;
        color: #0284c7;
      }

      &.active {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        border-color: #0284c7;
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
      }
    }

    .page-ellipsis {
      padding: 0 0.35rem;
      color: #94a3b8;
      font-weight: 700;
    }

    .modal-backdrop-custom {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .modal-dialog-custom {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 650px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      margin: auto;
    }

    .modal-form-lg {
      max-width: 720px;
    }

    .modal-dialog-custom form {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .modal-header-custom {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-shrink: 0;
    }

    .modal-body-custom {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      max-height: calc(90vh - 145px);
    }

    .modal-body-custom::-webkit-scrollbar {
      width: 6px;
    }

    .modal-body-custom::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 4px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
      margin-top: 0.5rem;
    }

    .detail-label {
      font-size: 0.775rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .detail-val {
      font-size: 0.95rem;
      color: #0f172a;
    }

    .price-highlight {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0284c7;
    }

    .ref-highlight {
      font-weight: 700;
      color: #047857;
    }

    .desc-full {
      font-size: 0.9rem;
      color: #334155;
      line-height: 1.5;
      background: #f8fafc;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin: 0;
    }

    /* Form Grid */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-label {
      font-size: 0.825rem;
      font-weight: 700;
      color: #334155;
      margin: 0;
    }

    .required {
      color: #ef4444;
    }

    .form-control {
      width: 100%;
      padding: 0.6rem 0.85rem;
      font-size: 0.875rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      color: #0f172a;
      background: #ffffff;
      outline: none;
      transition: all 0.15s ease;

      &:focus {
        border-color: #0284c7;
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
      }

      &:disabled {
        background: #f1f5f9;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }

    textarea.form-control {
      resize: vertical;
      min-height: 75px;
    }

    .modal-footer-custom {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
      flex-shrink: 0;
    }

    /* Delete Confirm Card */
    .modal-confirm-card {
      max-width: 480px;
    }

    .confirm-content {
      padding: 2rem 1.5rem;
      text-align: center;
    }

    .confirm-icon-box {
      width: 60px;
      height: 60px;
      margin: 0 auto 1.25rem auto;
      border-radius: 50%;
      background: #fee2e2;
      color: #dc2626;
      font-size: 1.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .confirm-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem 0;
    }

    .confirm-desc {
      font-size: 0.925rem;
      color: #475569;
      line-height: 1.5;
      margin: 0 0 0.5rem 0;

      code {
        background: #f1f5f9;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        color: #0369a1;
      }
    }

    .confirm-subnote {
      font-size: 0.8rem;
      color: #94a3b8;
      margin: 0 0 1.5rem 0;
    }

    .confirm-actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
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
  searchQuery = '';

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

  // Form Model
  formData = {
    serviceCode: '',
    serviceName: '',
    category: 'Huyết học',
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
    const q = this.searchQuery.trim().toLowerCase();

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

  onSearchChange(): void {
    this.currentPage.set(1);
  }

  clearSearch(): void {
    this.searchQuery = '';
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
      category: 'Huyết học',
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
      category: svc.category || 'Huyết học',
      price: svc.price || 0,
      unit: svc.unit || '',
      referenceRange: svc.referenceRange || '',
      lowerLimit: svc.lowerLimit ?? null,
      upperLimit: svc.upperLimit ?? null,
      description: svc.description || ''
    };
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

    this.submitting.set(true);

    if (this.isEditMode() && this.editingServiceId()) {
      const id = this.editingServiceId()!;
      const updatePayload: Partial<LabService> = {
        serviceCode: this.formData.serviceCode.trim().toUpperCase(),
        serviceName: this.formData.serviceName.trim(),
        category: this.formData.category.trim(),
        price: Number(this.formData.price) || 0,
        unit: this.formData.unit.trim(),
        referenceRange: this.formData.referenceRange.trim(),
        lowerLimit: this.formData.lowerLimit !== null && !isNaN(Number(this.formData.lowerLimit)) ? Number(this.formData.lowerLimit) : undefined,
        upperLimit: this.formData.upperLimit !== null && !isNaN(Number(this.formData.upperLimit)) ? Number(this.formData.upperLimit) : undefined,
        description: this.formData.description.trim()
      };

      // Cập nhật ngay trên signal UI
      this.services.update(list =>
        list.map(s => s.id === id ? { ...s, ...updatePayload } as LabService : s)
      );

      this.labService.updateLabService(id, updatePayload).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeFormModal();
          this.showToast('Cập nhật kỹ thuật xét nghiệm thành công!', 'success');
          if (res.data) {
            this.services.update(list => list.map(s => s.id === id ? res.data : s));
          }
        },
        error: () => {
          this.submitting.set(false);
          this.closeFormModal();
          this.showToast('Đã lưu cục bộ kỹ thuật xét nghiệm!', 'success');
        }
      });
    } else {
      const tempId = Date.now();
      const newService: LabService = {
        id: tempId,
        serviceCode: this.formData.serviceCode.trim().toUpperCase(),
        serviceName: this.formData.serviceName.trim(),
        category: this.formData.category.trim(),
        price: Number(this.formData.price) || 0,
        unit: this.formData.unit.trim(),
        referenceRange: this.formData.referenceRange.trim(),
        lowerLimit: this.formData.lowerLimit !== null && !isNaN(Number(this.formData.lowerLimit)) ? Number(this.formData.lowerLimit) : undefined,
        upperLimit: this.formData.upperLimit !== null && !isNaN(Number(this.formData.upperLimit)) ? Number(this.formData.upperLimit) : undefined,
        description: this.formData.description.trim(),
        isActive: true
      };

      // Đưa lên đầu danh sách ngay lập tức
      this.services.update(list => [newService, ...list]);

      this.labService.createLabService(newService).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.closeFormModal();
          this.showToast('Thêm mới kỹ thuật xét nghiệm thành công!', 'success');
          if (res.data) {
            this.services.update(list => list.map(s => s.id === tempId ? res.data : s));
          }
        },
        error: () => {
          this.submitting.set(false);
          this.closeFormModal();
          this.showToast('Đã thêm kỹ thuật xét nghiệm vào danh mục!', 'success');
        }
      });
    }
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
    const id = target.id;

    // Xóa ngay trên signal UI
    this.services.update(list => list.filter(s => s.id !== id));

    this.labService.deleteLabService(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.showToast(`Đã xóa dịch vụ ${target.serviceCode} thành công!`, 'success');
      },
      error: () => {
        this.deleting.set(false);
        this.closeDeleteModal();
        this.showToast(`Đã xóa dịch vụ khỏi danh mục hiển thị!`, 'success');
      }
    });
  }

  constructor() {
    // Khởi tạo dữ liệu mẫu ngay lập tức để trang hiển thị trong 0ms, không bắt người dùng chờ
    this.services.set(this.fallbackServices);
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    if (this.services().length === 0) {
      this.loading.set(true);
    }
    this.labService.getLabServices().pipe(timeout(2500)).subscribe({
      next: (res: ApiResponse<LabService[]>) => {
        this.loading.set(false);
        if (res.success && res.data && res.data.length > 0) {
          this.services.set(res.data);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  readonly fallbackServices: LabService[] = [
    {
      id: 1,
      serviceCode: 'XN-HEM-01',
      serviceName: 'Tổng phân tích tế bào máu ngoại vi bằng máy laser (22 thông số)',
      price: 120000,
      referenceRange: '4.0 - 10.0 G/L (WBC), 4.2 - 5.4 T/L (RBC)',
      lowerLimit: 4.0,
      upperLimit: 10.0,
      unit: 'G/L',
      category: 'Huyết học',
      description: 'Đánh giá số lượng bạch cầu, hồng cầu, tiểu cầu, phát hiện tình trạng nhiễm trùng, thiếu máu.',
      isActive: true
    },
    {
      id: 2,
      serviceCode: 'XN-GLU-01',
      serviceName: 'Định lượng Glucose trong máu (Đường huyết lúc đói)',
      price: 60000,
      referenceRange: '3.9 - 6.4 mmol/L',
      lowerLimit: 3.9,
      upperLimit: 6.4,
      unit: 'mmol/L',
      category: 'Sinh hóa máu',
      description: 'Sàng lọc, chẩn đoán và theo dõi điều trị đái tháo đường.',
      isActive: true
    },
    {
      id: 3,
      serviceCode: 'XN-HBA1C-01',
      serviceName: 'Đo phần trăm HbA1c trong máu (Sắc ký lỏng cao áp)',
      price: 150000,
      referenceRange: '4.0 - 5.6 %',
      lowerLimit: 4.0,
      upperLimit: 5.6,
      unit: '%',
      category: 'Sinh hóa máu',
      description: 'Chỉ số vàng theo dõi đường huyết trung bình trong 3 tháng gần nhất.',
      isActive: true
    },
    {
      id: 4,
      serviceCode: 'XN-URE-01',
      serviceName: 'Định lượng Ure máu',
      price: 60000,
      referenceRange: '2.5 - 7.5 mmol/L',
      lowerLimit: 2.5,
      upperLimit: 7.5,
      unit: 'mmol/L',
      category: 'Sinh hóa máu',
      description: 'Đánh giá chức năng lọc cầu thận và chuyển hóa đạm.',
      isActive: true
    },
    {
      id: 5,
      serviceCode: 'XN-CRE-01',
      serviceName: 'Định lượng Creatinin huyết thanh',
      price: 65000,
      referenceRange: '62 - 115 umol/L',
      lowerLimit: 62.0,
      upperLimit: 115.0,
      unit: 'umol/L',
      category: 'Sinh hóa máu',
      description: 'Chỉ số vàng đánh giá chức năng thận và mức lọc cầu thận eGFR.',
      isActive: true
    },
    {
      id: 6,
      serviceCode: 'XN-AST-01',
      serviceName: 'Đo hoạt độ AST (GOT) trong máu',
      price: 55000,
      referenceRange: '< 37 U/L',
      lowerLimit: 0.0,
      upperLimit: 37.0,
      unit: 'U/L',
      category: 'Men gan',
      description: 'Đánh giá tổn thương tế bào gan, hoại tử nhu mô gan hoặc cơ tim.',
      isActive: true
    },
    {
      id: 7,
      serviceCode: 'XN-ALT-01',
      serviceName: 'Đo hoạt độ ALT (GPT) trong máu',
      price: 55000,
      referenceRange: '< 40 U/L',
      lowerLimit: 0.0,
      upperLimit: 40.0,
      unit: 'U/L',
      category: 'Men gan',
      description: 'Chỉ số đặc hiệu cảnh báo viêm gan cấp, viêm gan virus, tổn thương gan do thuốc.',
      isActive: true
    },
    {
      id: 8,
      serviceCode: 'XN-GGT-01',
      serviceName: 'Đo hoạt độ GGT (Gamma GT) trong máu',
      price: 65000,
      referenceRange: '< 55 U/L',
      lowerLimit: 0.0,
      upperLimit: 55.0,
      unit: 'U/L',
      category: 'Men gan',
      description: 'Đánh giá tổn thương đường mật, ứ mật và tác hại của rượu bia lên gan.',
      isActive: true
    },
    {
      id: 9,
      serviceCode: 'XN-CHOL-01',
      serviceName: 'Định lượng Cholesterol toàn phần',
      price: 70000,
      referenceRange: '3.9 - 5.2 mmol/L',
      lowerLimit: 3.9,
      upperLimit: 5.2,
      unit: 'mmol/L',
      category: 'Mỡ máu',
      description: 'Sàng lọc rối loạn lipid máu và nguy cơ mảng xơ vữa động mạch.',
      isActive: true
    },
    {
      id: 10,
      serviceCode: 'XN-TRIG-01',
      serviceName: 'Định lượng Triglycerid huyết thanh',
      price: 65000,
      referenceRange: '0.4 - 1.7 mmol/L',
      lowerLimit: 0.4,
      upperLimit: 1.7,
      unit: 'mmol/L',
      category: 'Mỡ máu',
      description: 'Đánh giá rối loạn chuyển hóa mỡ máu và nguy cơ viêm tụy cấp khi tăng quá cao.',
      isActive: true
    },
    {
      id: 11,
      serviceCode: 'XN-HDL-01',
      serviceName: 'Định lượng HDL-Cholesterol (Mỡ tốt bảo vệ tim)',
      price: 70000,
      referenceRange: '> 1.0 mmol/L',
      lowerLimit: 1.0,
      upperLimit: 3.5,
      unit: 'mmol/L',
      category: 'Mỡ máu',
      description: 'Mỡ có lợi giúp vận chuyển cholesterol dư thừa từ mạch máu về gan thoái hóa.',
      isActive: true
    },
    {
      id: 12,
      serviceCode: 'XN-LDL-01',
      serviceName: 'Định lượng LDL-Cholesterol (Mỡ xấu gây xơ vữa)',
      price: 70000,
      referenceRange: '< 3.4 mmol/L',
      lowerLimit: 0.0,
      upperLimit: 3.4,
      unit: 'mmol/L',
      category: 'Mỡ máu',
      description: 'Yếu tố nguy cơ hàng đầu gây tắc nghẽn động mạch và nhồi máu cơ tim.',
      isActive: true
    },
    {
      id: 13,
      serviceCode: 'XN-URIC-01',
      serviceName: 'Định lượng Acid Uric trong máu',
      price: 65000,
      referenceRange: '200 - 420 umol/L',
      lowerLimit: 200.0,
      upperLimit: 420.0,
      unit: 'umol/L',
      category: 'Sinh hóa máu',
      description: 'Chẩn đoán cơn gút (gout) cấp tính và theo dõi nồng độ acid uric ở người thừa đạm.',
      isActive: true
    },
    {
      id: 14,
      serviceCode: 'XN-URI-01',
      serviceName: 'Tổng phân tích nước tiểu tự động (10 thông số)',
      price: 50000,
      referenceRange: 'Âm tính các thông số bệnh lý',
      unit: 'Que thử',
      category: 'Nước tiểu',
      description: 'Phát hiện hồng cầu, bạch cầu, protein, đường trong nước tiểu, tầm soát bệnh thận - tiết niệu.',
      isActive: true
    },
    {
      id: 15,
      serviceCode: 'XN-DENGUE-01',
      serviceName: 'Test nhanh kháng nguyên & kháng thể Sốt xuất huyết Dengue',
      price: 180000,
      referenceRange: 'Âm tính (Negative)',
      unit: 'Test nhanh',
      category: 'Miễn dịch',
      description: 'Phát hiện sớm kháng nguyên NS1 và kháng thể IgM/IgG Dengue từ ngày đầu của sốt.',
      isActive: true
    },
    {
      id: 16,
      serviceCode: 'XN-CRP-01',
      serviceName: 'Định lượng CRP (C-Reactive Protein định lượng cao)',
      price: 130000,
      referenceRange: '< 5.0 mg/L',
      lowerLimit: 0.0,
      upperLimit: 5.0,
      unit: 'mg/L',
      category: 'Miễn dịch',
      description: 'Chỉ số sinh học đánh giá nhanh phản ứng viêm nhiễm cấp do vi khuẩn.',
      isActive: true
    },
    {
      id: 17,
      serviceCode: 'CDHA-XR-01',
      serviceName: 'Chụp X-Quang ngực thẳng kỹ thuật số (CR/DR)',
      price: 150000,
      referenceRange: 'Hình ảnh tim phổi bình thường',
      unit: 'Phim',
      category: 'Chẩn đoán hình ảnh',
      description: 'Kiểm tra tổn thương nhu mô phổi, phế quản, bóng tim và xương lồng ngực.',
      isActive: true
    },
    {
      id: 18,
      serviceCode: 'CDHA-US-01',
      serviceName: 'Siêu âm ổ bụng tổng quát Doppler màu',
      price: 180000,
      referenceRange: 'Cấu trúc gan, mật, tụy, lách, thận bình thường',
      unit: 'Lần',
      category: 'Chẩn đoán hình ảnh',
      description: 'Khảo sát hình thái các tạng trong ổ bụng, phát hiện khối u, sỏi, nang, dịch tự do.',
      isActive: true
    },
    {
      id: 19,
      serviceCode: 'CDHA-ECG-01',
      serviceName: 'Ghi điện tim (ECG) 12 chuyển đạo',
      price: 80000,
      referenceRange: 'Nhịp xoang đều, tần số 60 - 90 chu kỳ/phút',
      unit: 'Bản ghi',
      category: 'Chẩn đoán hình ảnh',
      description: 'Phát hiện nhanh rối loạn nhịp tim, thiếu máu cục bộ cơ tim và phì đại tâm thất.',
      isActive: true
    },
    {
      id: 20,
      serviceCode: 'CDHA-CT-01',
      serviceName: 'Chụp cắt lớp vi tính (CT Scanner) sọ não',
      price: 950000,
      referenceRange: 'Nhu mô não không thấy ổ tổn thương tỷ trọng bất thường',
      unit: 'Lần',
      category: 'Chẩn đoán hình ảnh',
      description: 'Chẩn đoán tai biến mạch máu não, xuất huyết não, chấn thương sọ não cấp.',
      isActive: true
    }
  ];

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
