import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClinicalLabService } from '../../services/lab.service';
import { AuthService } from '../../services/auth.service';
import { LabOrder, UpdateLabOrderResultRequest } from '../../models/lab.model';
import { toIsoDate } from '../../utils/date.utils';

@Component({
  selector: 'app-lab-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="lab-workspace-page">
      <!-- Header -->
      <div class="lab-header">
        <div class="header-left">
          <div class="lab-badge">
            <span class="live-dot"></span> {{ departmentLabel() }}
          </div>
          <h1 class="page-title">Bàn Làm Việc Kỹ Thuật Viên</h1>
          <p class="page-subtitle">
            Tiếp nhận chỉ định từ bác sĩ phòng khám, ghi nhận kết quả đo lường và ký duyệt kết quả tự động đồng bộ về ca khám
          </p>
        </div>

        <div class="header-right">
          <input type="date" class="form-control date-picker" [max]="todayIso"
                 [ngModel]="workDate()" (ngModelChange)="onWorkDateChange($event)" title="Ngày làm việc" />
          <button type="button" class="btn btn-outline" (click)="loadOrders(true)" title="Làm mới danh sách">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Làm mới dữ liệu
          </button>
        </div>
      </div>

      <!-- Quick Metrics Counters -->
      <div class="metrics-grid">
        <div class="metric-card card-pending" (click)="selectTab('PENDING')">
          <div class="metric-icon"><i class="bi bi-hourglass-split"></i></div>
          <div class="metric-info">
            <span class="metric-val">{{ countPending() }}</span>
            <span class="metric-lbl">Chờ Lấy Mẫu / Đo</span>
          </div>
        </div>
        <div class="metric-card card-processing" (click)="selectTab('PROCESSING')">
          <div class="metric-icon"><i class="bi bi-gear-wide-connected"></i></div>
          <div class="metric-info">
            <span class="metric-val">{{ countProcessing() }}</span>
            <span class="metric-lbl">Đang Đo / Xử Lý</span>
          </div>
        </div>
        <div class="metric-card card-completed" (click)="selectTab('COMPLETED')">
          <div class="metric-icon"><i class="bi bi-check-circle-fill"></i></div>
          <div class="metric-info">
            <span class="metric-val">{{ countCompleted() }}</span>
            <span class="metric-lbl">Đã Ký Duyệt Kết Quả</span>
          </div>
        </div>
        <div class="metric-card card-total" (click)="selectTab('ALL')">
          <div class="metric-icon"><i class="bi bi-collection-fill"></i></div>
          <div class="metric-info">
            <span class="metric-val">{{ orders().length }}</span>
            <span class="metric-lbl">{{ workDate() === todayIso ? 'Tổng Chỉ Định Hôm Nay' : 'Tổng Chỉ Định Trong Ngày' }}</span>
          </div>
        </div>
      </div>

      <!-- Floating Toast Notification -->
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
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" title="Đóng thông báo" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <!-- Main Workspace Card -->
      <div class="card main-table-card">
        <!-- Control Bar (Tabs & Search) -->
        <div class="control-bar">
          <div class="tabs-group">
            <button class="tab-btn" [class.active]="activeTab() === 'ALL'" (click)="selectTab('ALL')">
              Tất Cả ({{ orders().length }})
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'PENDING'" (click)="selectTab('PENDING')">
              <span class="dot-pending"></span> Chờ Làm ({{ countPending() }})
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'PROCESSING'" (click)="selectTab('PROCESSING')">
              <span class="dot-processing"></span> Đang Đo ({{ countProcessing() }})
            </button>
            <button class="tab-btn" [class.active]="activeTab() === 'COMPLETED'" (click)="selectTab('COMPLETED')">
              <span class="dot-completed"></span> Đã Hoàn Thành ({{ countCompleted() }})
            </button>
          </div>

          <select class="form-select room-filter" [ngModel]="roomFilter()" (ngModelChange)="onRoomFilterChange($event)"
                  title="Lọc theo phòng khám ra chỉ định">
            <option value="">Mọi phòng chỉ định</option>
            @for (room of rooms(); track room) {
              <option [value]="room">Chỉ định từ {{ room }}</option>
            }
          </select>

          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              [ngModel]="searchKeyword()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Tìm theo số vé (#101), tên người bệnh, mã xét nghiệm..."
              class="form-control-sm"
            />
            @if (searchKeyword()) {
              <button class="btn-clear" (click)="onSearchChange('')" aria-label="Xoá từ khoá">×</button>
            }
          </div>
        </div>

        <!-- Orders Table -->
        @if (loadError()) {
          <div class="empty-state">
            <i class="bi bi-wifi-off text-danger"></i>
            <p>{{ loadError() }}</p>
            <button type="button" class="btn btn-outline" (click)="loadOrders(true)">Thử lại</button>
          </div>
        } @else if (loading() && orders().length === 0) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách chỉ định xét nghiệm...</p>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="empty-state">
            <i class="bi bi-inbox text-muted"></i>
            <p>{{ searchKeyword() ? 'Không tìm thấy chỉ định xét nghiệm nào khớp với từ khóa' : 'Không có chỉ định xét nghiệm nào trong mục này' }}</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="table lab-orders-table">
              <thead>
                <tr>
                  <th style="width: 12%;">Vé khám &amp; Bệnh nhân</th>
                  <th style="width: 14%;">Mã &amp; Nhóm DV</th>
                  <th style="width: 26%;">Tên dịch vụ xét nghiệm</th>
                  <th style="width: 16%; text-align: center;">Chỉ số đo được</th>
                  <th style="width: 14%; text-align: center;">Trị số tham chiếu</th>
                  <th style="width: 8%; text-align: center;">Trạng thái</th>
                  <th style="width: 10%; text-align: center;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (order of pagedOrders(); track order.id) {
                  <tr [class.row-abnormal]="order.isAbnormal">
                    <!-- Vé khám & Bệnh nhân -->
                    <td>
                      <div class="patient-cell">
                        <span class="ticket-tag">#{{ order.ticketNumber || 'N/A' }}</span>
                        <strong class="patient-name">{{ order.patientName || 'Chưa rõ tên' }}</strong>
                        @if (order.roomNumber) {
                          <span class="patient-sub text-muted small" title="Phòng khám của bác sĩ ra chỉ định">Chỉ định từ {{ order.roomNumber }}</span>
                        }
                        <span class="patient-sub text-muted small">
                          {{ order.patientGender || '---' }}
                          @if (order.patientYearOfBirth) {
                            • {{ order.patientYearOfBirth }}
                          }
                        </span>
                      </div>
                    </td>

                    <!-- Mã & Nhóm DV -->
                    <td>
                      <span class="code-badge">{{ order.serviceCode }}</span>
                      <div class="cat-text text-muted small mt-1">{{ order.category || 'Xét nghiệm' }}</div>
                    </td>

                    <!-- Tên dịch vụ xét nghiệm -->
                    <td>
                      <div class="service-name font-weight-bold">{{ order.serviceName }}</div>
                      <div class="order-time text-muted small">
                        <i class="bi bi-clock"></i> Chỉ định lúc: {{ formatDateTime(order.orderTime) }}
                      </div>
                      @if (order.conclusion) {
                        <div class="order-conclusion small text-success mt-1">
                          <i class="bi bi-check2"></i> <strong>Nhận xét:</strong> {{ order.conclusion }}
                        </div>
                      }
                      @if (order.notes) {
                        <div class="order-notes small text-muted">Ghi chú: {{ order.notes }}</div>
                      }
                    </td>

                    <!-- Kết quả đo được -->
                    <td style="text-align: center;">
                      @if (order.status === 'COMPLETED') {
                        <div class="result-val-display" [class.val-danger]="order.isAbnormal">
                          <span class="val-num">{{ order.resultValue }}</span>
                          <span class="unit-sub text-muted">{{ order.unit || '' }}</span>
                          @if (order.isAbnormal) {
                            <span class="badge badge-abnormal"><i class="bi bi-exclamation-triangle-fill"></i> Vượt ngưỡng</span>
                          }
                        </div>
                        <div class="signed-by text-muted small">
                          {{ order.performerName || 'KTV' }} · {{ formatDateTime(order.performedTime) }}
                        </div>
                      } @else if (order.status === 'PROCESSING') {
                        <span class="badge badge-waiting">Đang đo</span>
                        @if (order.performerName) {
                          <div class="signed-by text-muted small">Tiếp nhận: {{ order.performerName }}</div>
                        }
                      } @else {
                        <span class="badge badge-waiting">Chưa có kết quả</span>
                      }
                    </td>

                    <!-- Trị số tham chiếu -->
                    <td style="text-align: center;">
                      <div class="ref-range font-weight-bold text-secondary">{{ order.referenceRange || 'Chưa thiết lập' }}</div>
                      @if (order.unit) {
                        <span class="unit-tag text-muted small">Đơn vị: {{ order.unit }}</span>
                      }
                    </td>

                    <!-- Trạng thái -->
                    <td style="text-align: center;">
                      @if (order.status === 'COMPLETED') {
                        <span class="badge badge-success"><i class="bi bi-check-circle-fill"></i> Hoàn thành</span>
                      } @else if (order.status === 'PROCESSING') {
                        <span class="badge badge-warning"><i class="bi bi-gear-fill spin-icon"></i> Đang đo</span>
                      } @else if (order.status === 'CANCELLED') {
                        <span class="badge badge-danger">Đã hủy</span>
                      } @else {
                        <span class="badge badge-secondary"><i class="bi bi-hourglass-split"></i> Chờ làm</span>
                      }
                    </td>

                    <!-- Thao tác -->
                    <td style="text-align: center;">
                      <div class="action-btn-group">
                        @if (order.status === 'PENDING') {
                          <button class="btn btn-sm btn-outline-primary" [disabled]="startingId() === order.id"
                                  (click)="startProcessing(order)" title="Tiếp nhận mẫu bệnh phẩm">
                            <i class="bi bi-play-circle"></i> Tiếp nhận
                          </button>
                        }
                        @if (order.status === 'PENDING' || order.status === 'PROCESSING') {
                          <button class="btn btn-sm btn-primary" (click)="openResultModal(order)" title="Nhập kết quả & Ký duyệt">
                            <i class="bi bi-pencil-square"></i> Nhập KQ
                          </button>
                        } @else if (order.status === 'COMPLETED') {
                          <button class="btn btn-sm btn-outline-secondary" (click)="openResultModal(order)" title="Sửa lại kết quả">
                            <i class="bi bi-pencil"></i> Sửa KQ
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
                Hiển thị <strong>{{ startOrderIndex() }}</strong> – <strong>{{ endOrderIndex() }}</strong>
                trên tổng số <strong>{{ totalOrders() }}</strong> ca xét nghiệm
              </span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số ca/trang:</label>
                <select id="pageSizeSelect" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
                  @for (opt of pageSizeOptions; track opt) {
                    <option [ngValue]="opt">{{ opt }} ca</option>
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
                (click)="goToPage(currentPage() - 1)"
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
                (click)="goToPage(currentPage() + 1)"
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

      <!-- MODAL: Nhập Kết Quả Xét Nghiệm & Ký Duyệt -->
      @if (showResultModal() && activeOrder()) {
        <div class="modal-backdrop" (click)="closeResultModal()">
          <div class="modal-dialog modal-result-custom" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-box">
                <i class="bi bi-file-earmark-medical-fill text-primary"></i>
                <div>
                  <h3 class="modal-title">{{ activeOrder()?.status === 'COMPLETED' ? 'Sửa Kết Quả Xét Nghiệm' : 'Nhập Kết Quả Xét Nghiệm &amp; Ký Duyệt' }}</h3>
                  <span class="modal-sub">Mã chỉ định: #LAB-{{ activeOrder()?.id }} • Số phiếu: #{{ activeOrder()?.ticketNumber }}</span>
                </div>
              </div>
              <button class="btn-close-modal" (click)="closeResultModal()">×</button>
            </div>

            <div class="modal-body">
              <!-- Thông tin người bệnh & Dịch vụ -->
              <div class="order-summary-box">
                <div class="summary-col">
                  <span class="lbl">Người bệnh:</span>
                  <strong class="val">{{ activeOrder()?.patientName }}</strong>
                </div>
                <div class="summary-col">
                  <span class="lbl">Dịch vụ xét nghiệm:</span>
                  <strong class="val text-primary">{{ activeOrder()?.serviceName }}</strong>
                </div>
                <div class="summary-col">
                  <span class="lbl">Khoảng tham chiếu chuẩn:</span>
                  <strong class="val text-secondary">{{ activeOrder()?.referenceRange || 'Chưa thiết lập' }} ({{ activeOrder()?.unit || '---' }})</strong>
                </div>
              </div>

              <!-- Form nhập liệu kết quả -->
              <div class="form-group mb-3">
                <label class="form-label required">Chỉ số đo được thực tế (Result Value):</label>
                <div class="input-with-unit-group">
                  <input
                    type="text"
                    [(ngModel)]="resultValueInput"
                    (input)="autoCheckAbnormal()"
                    placeholder="VD: 11.2 hoặc Âm tính, Bình thường..."
                    class="form-control form-control-lg font-weight-bold"
                  />
                  @if (activeOrder()?.unit) {
                    <span class="input-unit">{{ activeOrder()?.unit }}</span>
                  }
                </div>
              </div>

              <!-- Cảnh báo / Đánh dấu bất thường -->
              <div class="form-check abnormal-toggle-box mb-3" [class.is-abnormal]="isAbnormalInput">
                <input
                  type="checkbox"
                  id="abnormalCheck"
                  [(ngModel)]="isAbnormalInput"
                  class="form-check-input"
                />
                <label for="abnormalCheck" class="form-check-label font-weight-bold cursor-pointer">
                  <i class="bi bi-exclamation-triangle-fill text-danger me-1"></i>
                  Đánh dấu chỉ số BẤT THƯỜNG / VƯỢT NGƯỠNG THAM CHIẾU (tự đánh dấu khi kết quả số nằm ngoài ngưỡng, bác sĩ sẽ thấy cảnh báo đỏ)
                </label>
              </div>

              <!-- Nhận xét / Kết luận -->
              <div class="form-group mb-3">
                <label class="form-label">Nhận xét / Kết luận của Kỹ thuật viên / Bác sĩ phòng Lab:</label>
                <textarea
                  [(ngModel)]="conclusionInput"
                  rows="2"
                  class="form-control"
                  placeholder="VD: Bạch cầu tăng cao, gợi ý tình trạng nhiễm trùng cấp..."
                ></textarea>
              </div>

              <!-- Ghi chú mẫu bệnh phẩm -->
              <div class="form-group mb-0">
                <label class="form-label">Ghi chú thêm về mẫu bệnh phẩm (nếu có):</label>
                <input
                  type="text"
                  [(ngModel)]="notesInput"
                  class="form-control"
                  placeholder="VD: Mẫu trong, không tán huyết..."
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeResultModal()">Hủy Bỏ</button>
              <button
                type="button"
                class="btn btn-success btn-submit-result"
                [disabled]="submittingResult() || !resultValueInput.trim()"
                (click)="confirmSaveResult()"
              >
                @if (submittingResult()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  <i class="bi bi-check2-circle"></i> LƯU KẾT QUẢ &amp; KÝ DUYỆT
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .date-picker {
      width: auto;
      min-width: 150px;
    }

    .signed-by {
      margin-top: 0.3rem;
      font-size: 0.75rem;
    }

    .lab-workspace-page {
      padding: 1.5rem 1.5rem 3.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .lab-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .lab-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background-color: #ecfdf5;
      color: #065f46;
      font-size: 0.775rem;
      font-weight: 800;
      border-radius: 9999px;
      margin-bottom: 0.35rem;
      border: 1px solid #a7f3d0;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      animation: pulseGlow 2s infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }

    .page-subtitle {
      color: #64748b;
      margin: 0;
      font-size: 0.925rem;
    }

    .header-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .metric-icon {
        width: 48px;
        height: 48px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
      }

      .metric-info {
        display: flex;
        flex-direction: column;

        .metric-val {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.1;
        }

        .metric-lbl {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 600;
          margin-top: 0.2rem;
        }
      }

      &.card-pending {
        border-left: 4px solid #f59e0b;
        .metric-icon { background: #fef3c7; color: #b45309; }
      }

      &.card-processing {
        border-left: 4px solid #3b82f6;
        .metric-icon { background: #eff6ff; color: #1d4ed8; }
      }

      &.card-completed {
        border-left: 4px solid #10b981;
        .metric-icon { background: #ecfdf5; color: #047857; }
      }

      &.card-total {
        border-left: 4px solid #8b5cf6;
        .metric-icon { background: #f5f3ff; color: #6d28d9; }
      }
    }

    /* Main Table Card */
    .main-table-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }

    .control-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 0.75rem;

      .tabs-group {
        display: flex;
        gap: 0.35rem;

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 8px;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #e2e8f0;
            color: #1e293b;
          }

          &.active {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          }
        }

        .dot-pending { width: 7px; height: 7px; background: #f59e0b; border-radius: 50%; }
        .dot-processing { width: 7px; height: 7px; background: #3b82f6; border-radius: 50%; }
        .dot-completed { width: 7px; height: 7px; background: #10b981; border-radius: 50%; }
      }

      .room-filter {
        width: 180px;
        height: 36px;
        margin-left: auto;
        margin-right: 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.85rem;
      }

      .search-box {
        position: relative;
        width: 380px;

        i {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        input {
          padding-left: 2.2rem;
          padding-right: 1.8rem;
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 0.85rem;
          height: 36px;
        }

        .btn-clear {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1.1rem;
          cursor: pointer;
        }
      }
    }

    .lab-orders-table {
      width: 100%;
      margin: 0;

      thead th {
        background: #f8fafc;
        color: #475569;
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid #e2e8f0;
      }

      tbody tr {
        border-bottom: 1px solid #f1f5f9;

        &:hover {
          background: #f8fafc;
        }

        &.row-abnormal {
          background: #fff1f2;
          &:hover { background: #fee2e2; }
        }

        td {
          padding: 0.85rem 1rem;
          vertical-align: middle;
        }
      }
    }

    .patient-cell {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;

      .ticket-tag {
        display: inline-block;
        width: fit-content;
        background: #eff6ff;
        color: #1d4ed8;
        font-weight: 800;
        font-size: 0.75rem;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        border: 1px solid #bfdbfe;
      }

      .patient-name {
        color: #0f172a;
        font-size: 0.925rem;
      }
    }

    .code-badge {
      display: inline-block;
      padding: 0.2rem 0.5rem;
      background: #f1f5f9;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: 4px;
      font-family: monospace;
      border: 1px solid #e2e8f0;
    }

    .result-val-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;

      .val-num {
        font-weight: 800;
        font-size: 1.1rem;
        color: #0f172a;
      }

      &.val-danger .val-num {
        color: #dc2626 !important;
        font-size: 1.2rem;
      }

      .badge-abnormal {
        background: #dc2626;
        color: #ffffff;
        font-size: 0.65rem;
        font-weight: 800;
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
      }
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.55rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;

      &.badge-success { background: #dcfce7; color: #15803d; }
      &.badge-warning { background: #fef3c7; color: #b45309; }
      &.badge-secondary { background: #f1f5f9; color: #475569; }
      &.badge-danger { background: #fee2e2; color: #991b1b; }
      &.badge-waiting { background: #f1f5f9; color: #94a3b8; font-weight: 500; font-style: italic; }
    }

    .spin-icon {
      animation: spin 2s infinite linear;
    }

    .spin-active {
      animation: spin 1s infinite linear;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .action-btn-group {
      display: flex;
      justify-content: center;
      gap: 0.4rem;
    }

    /* Modal Styling */
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

    .modal-result-custom {
      background: #ffffff;
      border-radius: 12px;
      width: 100%;
      max-width: 580px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;

      .modal-title-box {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        i { font-size: 1.5rem; }

        .modal-title {
          font-size: 1.15rem;
          font-weight: 800;
          margin: 0;
          color: #0f172a;
        }

        .modal-sub {
          font-size: 0.8rem;
          color: #64748b;
        }
      }

      .btn-close-modal {
        background: transparent;
        border: none;
        font-size: 1.4rem;
        color: #94a3b8;
        cursor: pointer;
      }
    }

    .modal-body {
      padding: 1.25rem;

      .order-summary-box {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.85rem;
        margin-bottom: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;

        .summary-col {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;

          .lbl { color: #64748b; }
        }
      }

      .input-with-unit-group {
        position: relative;

        input {
          padding-right: 4rem;
        }

        .input-unit {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 700;
          color: #64748b;
        }
      }

      .abnormal-toggle-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.75rem 1rem;

        &.is-abnormal {
          background: #fef2f2;
          border-color: #fecaca;
        }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 0.85rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;

      .btn-submit-result {
        background: #10b981;
        border-color: #059669;
        color: #ffffff;
        font-weight: 700;
      }
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
      border-radius: 0 0 12px 12px;
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

    .empty-state, .loading-state {
      text-align: center;
      padding: 3.5rem 1rem;
      color: #94a3b8;

      i { font-size: 2.5rem; margin-bottom: 0.5rem; display: block; }
    }
  `]
})
export class LabManagementComponent implements OnInit, OnDestroy {
  private readonly labService = inject(ClinicalLabService);
  private readonly authService = inject(AuthService);

  // Khoa của KTV đang đăng nhập (backend đã lọc danh sách theo khoa này)
  readonly departmentLabel = computed(() => {
    switch (this.authService.currentUser()?.department) {
      case 'XET_NGHIEM': return 'KHOA XÉT NGHIỆM';
      case 'CHAN_DOAN_HINH_ANH': return 'KHOA CHẨN ĐOÁN HÌNH ẢNH';
      default: return 'XÉT NGHIỆM & CHẨN ĐOÁN HÌNH ẢNH';
    }
  });

  readonly orders = signal<LabOrder[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly activeTab = signal<'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED'>('ALL');
  readonly searchKeyword = signal('');
  readonly roomFilter = signal('');
  readonly todayIso = toIsoDate(new Date());
  readonly workDate = signal(this.todayIso);
  // Chỉ định đang được gửi tiếp nhận, tránh bấm 2 lần
  readonly startingId = signal<number | null>(null);

  // Phân trang
  readonly currentPage = signal(1);
  readonly pageSize = signal(8);
  readonly pageSizeOptions = [6, 8, 10, 15, 20];

  // Modal nhập kết quả
  readonly showResultModal = signal(false);
  readonly activeOrder = signal<LabOrder | null>(null);
  readonly submittingResult = signal(false);
  resultValueInput = '';
  conclusionInput = '';
  notesInput = '';
  isAbnormalInput = false;

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  private timer: ReturnType<typeof setInterval> | null = null;
  private alertTimer: ReturnType<typeof setTimeout> | null = null;

  // Các phòng khám có chỉ định trong danh sách, dùng cho ô lọc phòng
  readonly rooms = computed(() =>
    [...new Set(this.orders().map(o => o.roomNumber).filter((r): r is string => !!r))].sort());

  readonly countPending = computed(() => this.orders().filter(o => o.status === 'PENDING').length);
  readonly countProcessing = computed(() => this.orders().filter(o => o.status === 'PROCESSING').length);
  readonly countCompleted = computed(() => this.orders().filter(o => o.status === 'COMPLETED').length);

  // Việc cần làm lên trước (chờ làm / đang đo theo giờ chỉ định), đã xong / đã huỷ xếp sau, mới nhất trước
  readonly filteredOrders = computed(() => {
    const tab = this.activeTab();
    const kw = this.searchKeyword().trim().toLowerCase();
    const room = this.roomFilter();
    const rank = (o: LabOrder) => (o.status === 'PENDING' || o.status === 'PROCESSING' ? 0 : 1);
    return this.orders()
      .filter(o => tab === 'ALL' || o.status === tab)
      .filter(o => !room || o.roomNumber === room)
      .filter(o => !kw
        || o.ticketNumber?.toLowerCase().includes(kw)
        || o.patientName?.toLowerCase().includes(kw)
        || o.serviceName?.toLowerCase().includes(kw)
        || o.serviceCode?.toLowerCase().includes(kw))
      .sort((a, b) => rank(a) - rank(b) || (rank(a) === 0
        ? a.orderTime.localeCompare(b.orderTime)
        : (b.performedTime ?? b.orderTime).localeCompare(a.performedTime ?? a.orderTime)));
  });

  readonly totalOrders = computed(() => this.filteredOrders().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalOrders() / this.pageSize())));
  readonly startOrderIndex = computed(() =>
    this.totalOrders() === 0 ? 0 : (this.currentPage() - 1) * this.pageSize() + 1
  );
  readonly endOrderIndex = computed(() => Math.min(this.totalOrders(), this.currentPage() * this.pageSize()));
  readonly pagedOrders = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredOrders().slice(start, start + this.pageSize());
  });

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    this.loadOrders(true);
    // Tự làm mới để nhận chỉ định mới từ bác sĩ
    this.timer = setInterval(() => this.loadOrders(false), 15000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.alertTimer) clearTimeout(this.alertTimer);
  }

  loadOrders(showSpinner: boolean): void {
    if (showSpinner) this.loading.set(true);
    this.labService.getWorklist(this.workDate()).subscribe({
      next: res => {
        this.orders.set(res.data || []);
        this.loadError.set(null);
        // Danh sách ngắn lại (đã làm xong) thì không để trang hiện tại vượt quá số trang
        if (this.currentPage() > this.totalPages()) this.currentPage.set(this.totalPages());
        this.loading.set(false);
      },
      error: err => {
        this.loadError.set(err.error?.message || 'Không tải được danh sách chỉ định xét nghiệm. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  onWorkDateChange(date: string): void {
    this.workDate.set(date || this.todayIso);
    this.currentPage.set(1);
    this.loadOrders(true);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())} ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }

  selectTab(tab: 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED'): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onRoomFilterChange(room: string): void {
    this.roomFilter.set(room);
    this.currentPage.set(1);
  }

  onSearchChange(keyword: string): void {
    this.searchKeyword.set(keyword);
    this.currentPage.set(1);
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

  startProcessing(order: LabOrder): void {
    this.startingId.set(order.id);
    this.labService.startProcessing(order.id).subscribe({
      next: res => {
        this.startingId.set(null);
        this.replaceOrder(res.data);
        this.showAlert(`Đã tiếp nhận mẫu ${order.serviceName} của bệnh nhân ${order.patientName}`, 'success');
      },
      error: err => {
        this.startingId.set(null);
        this.showAlert(err.error?.message || 'Không thể tiếp nhận mẫu xét nghiệm', 'danger');
        this.loadOrders(false);
      }
    });
  }

  openResultModal(order: LabOrder): void {
    this.activeOrder.set(order);
    this.resultValueInput = order.status === 'COMPLETED' ? order.resultValue || '' : '';
    this.conclusionInput = order.conclusion || '';
    this.notesInput = order.notes || '';
    this.isAbnormalInput = order.isAbnormal || false;
    this.showResultModal.set(true);
  }

  closeResultModal(): void {
    this.showResultModal.set(false);
    this.activeOrder.set(null);
  }

  // Kết quả dạng số: tự đánh dấu bất thường khi ngoài ngưỡng tham chiếu (KTV vẫn sửa được)
  autoCheckAbnormal(): void {
    const order = this.activeOrder();
    const num = parseFloat(this.resultValueInput.trim().replace(',', '.').replace(/[^0-9.\-]/g, ' ').trim().split(/\s+/)[0]);
    if (!order || isNaN(num)) return;
    this.isAbnormalInput = (order.lowerLimit != null && num < order.lowerLimit)
      || (order.upperLimit != null && num > order.upperLimit);
  }

  confirmSaveResult(): void {
    const order = this.activeOrder();
    if (!order || !this.resultValueInput.trim()) return;

    const req: UpdateLabOrderResultRequest = {
      resultValue: this.resultValueInput.trim(),
      conclusion: this.conclusionInput.trim() || undefined,
      notes: this.notesInput.trim() || undefined,
      isAbnormal: this.isAbnormalInput
    };

    this.submittingResult.set(true);
    this.labService.updateOrderResult(order.id, req).subscribe({
      next: res => {
        this.submittingResult.set(false);
        this.replaceOrder(res.data);
        this.showAlert(`Đã lưu kết quả & ký duyệt: ${order.serviceName}`, 'success');
        this.closeResultModal();
      },
      error: err => {
        this.submittingResult.set(false);
        this.showAlert(err.error?.message || 'Không thể lưu kết quả xét nghiệm', 'danger');
      }
    });
  }

  private replaceOrder(updated: LabOrder | undefined): void {
    if (!updated) {
      this.loadOrders(false);
      return;
    }
    this.orders.update(list => list.map(o => o.id === updated.id ? updated : o));
  }

  showAlert(msg: string, type: 'success' | 'danger'): void {
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertMessage.set(msg);
    this.alertType.set(type);
    this.alertTimer = setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
