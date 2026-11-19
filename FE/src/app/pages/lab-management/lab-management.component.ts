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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Chỉ định cận lâm sàng</h1>
          <p class="page-subtitle">{{ departmentLabel() }} · {{ orders().length }} chỉ định {{ workDate() === todayIso ? 'hôm nay' : 'ngày ' + (workDate() | date:'dd/MM/yyyy') }}</p>
        </div>

        <div class="page-actions">
          <input type="date" class="filter-control date-picker" [max]="todayIso"
                 [ngModel]="workDate()" (ngModelChange)="onWorkDateChange($event)" title="Ngày làm việc" aria-label="Ngày làm việc" />
          <button type="button" class="btn btn-secondary" (click)="loadOrders(true)" title="Tải lại danh sách">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Tải lại
          </button>
        </div>
      </div>

      <!-- Số liệu nhanh -->
      <div class="metrics-grid">
        <button type="button" class="metric-card" [class.active]="activeTab() === 'PENDING'" (click)="selectTab('PENDING')">
          <span class="metric-lbl">Chờ lấy mẫu / đo</span>
          <span class="metric-val mono">{{ countPending() }}</span>
        </button>
        <button type="button" class="metric-card" [class.active]="activeTab() === 'PROCESSING'" (click)="selectTab('PROCESSING')">
          <span class="metric-lbl">Đang đo / xử lý</span>
          <span class="metric-val mono">{{ countProcessing() }}</span>
        </button>
        <button type="button" class="metric-card" [class.active]="activeTab() === 'COMPLETED'" (click)="selectTab('COMPLETED')">
          <span class="metric-lbl">Đã có kết quả</span>
          <span class="metric-val mono">{{ countCompleted() }}</span>
        </button>
        <button type="button" class="metric-card" [class.active]="activeTab() === 'ALL'" (click)="selectTab('ALL')">
          <span class="metric-lbl">Tổng chỉ định</span>
          <span class="metric-val mono">{{ orders().length }}</span>
        </button>
      </div>

      <!-- Floating Toast Notification -->
      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
            <div class="toast-icon">
              <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
            </div>
            <div class="toast-content">
              <div class="toast-title">{{ alertType() === 'success' ? 'Thành công' : 'Lỗi' }}</div>
              <div class="toast-message">{{ alertMessage() }}</div>
            </div>
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" title="Đóng thông báo" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <div class="panel main-table-card">
        <div class="tabs-row">
          <button class="tab-btn" [class.active]="activeTab() === 'ALL'" (click)="selectTab('ALL')">
            Tất cả <span class="tab-count mono">{{ orders().length }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'PENDING'" (click)="selectTab('PENDING')">
            Chờ làm <span class="tab-count mono">{{ countPending() }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'PROCESSING'" (click)="selectTab('PROCESSING')">
            Đang đo <span class="tab-count mono">{{ countProcessing() }}</span>
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'COMPLETED'" (click)="selectTab('COMPLETED')">
            Hoàn thành <span class="tab-count mono">{{ countCompleted() }}</span>
          </button>
        </div>

        <div class="toolbar">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              [ngModel]="searchKeyword()"
              (ngModelChange)="onSearchChange($event)"
              placeholder="Số phiếu, tên bệnh nhân, mã xét nghiệm"
              class="filter-control search-input"
            />
            @if (searchKeyword()) {
              <button class="btn-clear" (click)="onSearchChange('')" aria-label="Xoá từ khoá" title="Xoá từ khoá">×</button>
            }
          </div>
          <select class="filter-control room-filter" [ngModel]="roomFilter()" (ngModelChange)="onRoomFilterChange($event)"
                  title="Lọc theo phòng khám ra chỉ định" aria-label="Phòng chỉ định">
            <option value="">Tất cả phòng chỉ định</option>
            @for (room of rooms(); track room) {
              <option [value]="room">Chỉ định từ {{ room }}</option>
            }
          </select>
        </div>

        @if (loadError()) {
          <div class="empty-state">
            <p>{{ loadError() }}</p>
            <button type="button" class="btn btn-secondary btn-sm" (click)="loadOrders(true)">Thử lại</button>
          </div>
        } @else if (loading() && orders().length === 0) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách chỉ định...</p>
          </div>
        } @else if (filteredOrders().length === 0) {
          <div class="empty-state">
            <p>{{ searchKeyword() ? 'Không có chỉ định khớp từ khoá' : 'Không có chỉ định trong mục này' }}</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table lab-orders-table">
              <thead>
                <tr>
                  <th style="width: 200px;">Bệnh nhân</th>
                  <th>Dịch vụ</th>
                  <th style="width: 190px;">Kết quả</th>
                  <th style="width: 160px;">Tham chiếu</th>
                  <th style="width: 120px;">Trạng thái</th>
                  <th style="width: 170px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (order of pagedOrders(); track order.id) {
                  <tr [class.row-abnormal]="order.isAbnormal">
                    <td>
                      <div class="patient-cell">
                        <span class="ticket-tag mono">{{ order.ticketNumber || '—' }}</span>
                        <span class="patient-name">{{ order.patientName || 'Chưa rõ tên' }}</span>
                        <span class="sub">
                          {{ order.patientGender || '—' }}@if (order.patientYearOfBirth) { · {{ order.patientYearOfBirth }} }
                          @if (order.roomNumber) {
                            · <span title="Phòng khám của bác sĩ ra chỉ định">từ {{ order.roomNumber }}</span>
                          }
                        </span>
                      </div>
                    </td>

                    <td>
                      <div class="service-name">{{ order.serviceName }}</div>
                      <div class="sub">
                        <span class="mono">{{ order.serviceCode }}</span> · {{ order.category || 'Xét nghiệm' }} ·
                        chỉ định <span class="mono">{{ formatDateTime(order.orderTime) }}</span>
                      </div>
                      @if (order.conclusion) {
                        <div class="sub order-conclusion">Nhận xét: {{ order.conclusion }}</div>
                      }
                      @if (order.notes) {
                        <div class="sub">Ghi chú: {{ order.notes }}</div>
                      }
                    </td>

                    <td>
                      @if (order.status === 'COMPLETED') {
                        <div class="result-val-display" [class.val-danger]="order.isAbnormal">
                          <span class="val-num mono">{{ order.resultValue }}</span>
                          <span class="unit-sub">{{ order.unit || '' }}</span>
                        </div>
                        @if (order.isAbnormal) {
                          <span class="status danger">Ngoài ngưỡng</span>
                        }
                        <div class="sub">{{ order.performerName || 'KTV' }} · <span class="mono">{{ formatDateTime(order.performedTime) }}</span></div>
                        @if (order.shiftLabel) {
                          <div class="sub">{{ order.shiftLabel }}{{ order.labRoomNumber ? ' · ' + order.labRoomNumber : '' }}</div>
                        }
                      } @else if (order.status === 'PROCESSING') {
                        <span class="text-muted">Chưa có kết quả</span>
                        @if (order.performerName) {
                          <div class="sub">Tiếp nhận: {{ order.performerName }}</div>
                          @if (order.shiftLabel) {
                            <div class="sub">{{ order.shiftLabel }}{{ order.labRoomNumber ? ' · ' + order.labRoomNumber : '' }}</div>
                          }
                        }
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>

                    <td>
                      <div class="ref-range">{{ order.referenceRange || 'Chưa thiết lập' }}</div>
                      @if (order.unit) {
                        <div class="sub">Đơn vị: {{ order.unit }}</div>
                      }
                    </td>

                    <td>
                      @if (order.status === 'COMPLETED') {
                        <span class="status success">Hoàn thành</span>
                      } @else if (order.status === 'PROCESSING') {
                        <span class="status info">Đang đo</span>
                      } @else if (order.status === 'CANCELLED') {
                        <span class="status danger">Đã hủy</span>
                      } @else {
                        <span class="status warning">Chờ làm</span>
                      }
                    </td>

                    <td>
                      <div class="action-btn-group">
                        @if (order.status === 'PENDING') {
                          <button class="btn btn-sm btn-secondary" [disabled]="startingId() === order.id"
                                  (click)="startProcessing(order)" title="Tiếp nhận mẫu bệnh phẩm">
                            Tiếp nhận
                          </button>
                        }
                        @if (order.status === 'PENDING' || order.status === 'PROCESSING') {
                          <button class="btn btn-sm btn-primary" (click)="openResultModal(order)" title="Nhập kết quả">
                            Nhập KQ
                          </button>
                        } @else if (order.status === 'COMPLETED') {
                          <button class="icon-btn" (click)="openResultModal(order)" title="Sửa kết quả" aria-label="Sửa kết quả">
                            <i class="bi bi-pencil"></i>
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-container">
            <div class="pagination-info">
              <span>{{ startOrderIndex() }}–{{ endOrderIndex() }} / {{ totalOrders() }}</span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng</label>
                <select id="pageSizeSelect" class="page-size-select" [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)">
                  @for (opt of pageSizeOptions; track opt) {
                    <option [ngValue]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pagination-controls">
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Trang đầu">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(currentPage() - 1)" title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>

              <div class="page-numbers">
                @for (p of pagesList(); track $index) {
                  @if (p === '...') {
                    <span class="page-ellipsis">…</span>
                  } @else {
                    <button type="button" class="btn-page" [class.active]="currentPage() === p" (click)="goToPage(+p)">
                      {{ p }}
                    </button>
                  }
                }
              </div>

              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(currentPage() + 1)" title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button type="button" class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Trang cuối">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Modal nhập kết quả -->
      @if (showResultModal() && activeOrder()) {
        <div class="modal-backdrop" (click)="closeResultModal()">
          <div class="modal-dialog modal-result-custom" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h3 class="modal-title">{{ activeOrder()?.status === 'COMPLETED' ? 'Sửa kết quả' : 'Nhập kết quả' }}</h3>
                <span class="modal-sub mono">LAB-{{ activeOrder()?.id }} · phiếu {{ activeOrder()?.ticketNumber }}</span>
              </div>
              <button class="modal-close-btn" (click)="closeResultModal()" aria-label="Đóng">×</button>
            </div>

            <div class="modal-body">
              <dl class="order-summary-box">
                <dt>Bệnh nhân</dt>
                <dd>{{ activeOrder()?.patientName }}</dd>
                <dt>Dịch vụ</dt>
                <dd>{{ activeOrder()?.serviceName }}</dd>
                <dt>Tham chiếu</dt>
                <dd>{{ activeOrder()?.referenceRange || 'Chưa thiết lập' }} ({{ activeOrder()?.unit || '—' }})</dd>
              </dl>

              <div class="form-group">
                <label class="form-label required">Kết quả</label>
                <div class="input-with-unit-group">
                  <input
                    type="text"
                    [(ngModel)]="resultValueInput"
                    (input)="autoCheckAbnormal()"
                    placeholder="Ví dụ: 11.2, âm tính"
                    class="form-control"
                  />
                  @if (activeOrder()?.unit) {
                    <span class="input-unit">{{ activeOrder()?.unit }}</span>
                  }
                </div>
              </div>

              <div class="abnormal-toggle-box" [class.is-abnormal]="isAbnormalInput">
                <input
                  type="checkbox"
                  id="abnormalCheck"
                  [(ngModel)]="isAbnormalInput"
                  class="form-check-input"
                />
                <label for="abnormalCheck" class="form-check-label">
                  <strong>Ngoài ngưỡng tham chiếu</strong>
                  <span>Tự đánh dấu khi kết quả số nằm ngoài ngưỡng. Bác sĩ sẽ thấy cảnh báo.</span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label">Nhận xét / kết luận</label>
                <textarea
                  [(ngModel)]="conclusionInput"
                  rows="2"
                  class="form-control"
                  placeholder="Ví dụ: bạch cầu tăng, gợi ý nhiễm trùng cấp"
                ></textarea>
              </div>

              <div class="form-group mb-0">
                <label class="form-label">Ghi chú mẫu bệnh phẩm</label>
                <input
                  type="text"
                  [(ngModel)]="notesInput"
                  class="form-control"
                  placeholder="Ví dụ: mẫu trong, không tán huyết"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeResultModal()">Hủy</button>
              <button
                type="button"
                class="btn btn-primary btn-submit-result"
                [disabled]="submittingResult() || !resultValueInput.trim()"
                (click)="confirmSaveResult()"
              >
                @if (submittingResult()) {
                  <span class="spinner-sm"></span> Đang lưu...
                } @else {
                  Lưu kết quả
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .date-picker { min-width: 150px; }

    .filter-control {
      height: 34px;
      padding: 0 8px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
    }

    .filter-control:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .spin-active {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Số liệu */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      font: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.12s ease;
    }

    .metric-card:hover { border-color: var(--border-strong); }
    .metric-card.active { border-color: var(--primary-600); }

    .metric-lbl {
      font-size: 13px;
      color: var(--text-muted);
    }

    .metric-val {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.3;
    }

    /* Tabs + toolbar */
    .tabs-row {
      display: flex;
      gap: 4px;
      padding: 0 12px;
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 8px 10px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      font: inherit;
      font-size: 14px;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.12s ease, border-color 0.12s ease;
    }

    .tab-btn:hover { color: var(--text-main); }

    .tab-btn.active {
      color: var(--primary-600);
      border-bottom-color: var(--primary-600);
      font-weight: 500;
    }

    .tab-count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: var(--radius-full);
      background: var(--bg-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      line-height: 18px;
      text-align: center;
    }

    .tab-btn.active .tab-count {
      background: var(--primary-50);
      color: var(--primary-700);
    }

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
      padding: 0 28px 0 32px;
    }

    .btn-clear {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    .room-filter { min-width: 200px; }

    /* Bảng */
    .table-responsive { overflow-x: auto; }
    .lab-orders-table { min-width: 1000px; }
    .lab-orders-table td { vertical-align: top; }

    .lab-orders-table tbody tr.row-abnormal { box-shadow: inset 3px 0 0 var(--danger-solid); }

    .patient-cell {
      display: flex;
      flex-direction: column;
      line-height: 1.4;
    }

    .ticket-tag {
      font-size: 12px;
      color: var(--text-muted);
    }

    .patient-name { font-weight: 500; color: var(--text-main); }

    .service-name { font-weight: 500; color: var(--text-main); }

    .sub {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .order-conclusion { color: var(--text-secondary); }

    .result-val-display {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .val-num {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }

    .val-danger .val-num { color: var(--danger-text); }

    .unit-sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    .result-val-display + .status { margin-top: 4px; }

    .ref-range {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .action-btn-group {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 6px;
    }

    .empty-state p { margin-bottom: 12px; }

    /* Phân trang */
    .pagination-container {
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
    .page-numbers {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination-info { gap: 16px; }
    .pagination-controls,
    .page-numbers { gap: 4px; }

    .page-size-select {
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 13px;
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

    .page-ellipsis { padding: 0 4px; }

    /* Modal */
    .modal-result-custom { max-width: 560px; width: 100%; }

    .modal-sub {
      display: block;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .order-summary-box {
      display: grid;
      grid-template-columns: 100px 1fr;
      gap: 6px 12px;
      margin: 0 0 16px;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      font-size: 14px;
    }

    .order-summary-box dt { color: var(--text-muted); font-size: 13px; }
    .order-summary-box dd { margin: 0; color: var(--text-main); }

    .input-with-unit-group {
      display: flex;
      align-items: stretch;
    }

    .input-with-unit-group .form-control { flex: 1; }

    .input-with-unit-group .form-control:not(:last-child) {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
    }

    .input-unit {
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      border: 1px solid var(--border-strong);
      border-left: none;
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
      background: var(--bg-subtle);
      color: var(--text-muted);
      font-size: 13px;
    }

    .abnormal-toggle-box {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 1.15rem;
      padding: 10px 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .abnormal-toggle-box.is-abnormal {
      border-color: var(--danger-border);
      background: var(--danger-bg);
    }

    .form-check-input {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--danger-solid);
      cursor: pointer;
    }

    .form-check-label {
      display: flex;
      flex-direction: column;
      font-size: 14px;
      cursor: pointer;
    }

    .form-check-label strong { font-weight: 500; color: var(--text-main); }
    .is-abnormal .form-check-label strong { color: var(--danger-text); }

    .form-check-label span {
      font-size: 12px;
      color: var(--text-muted);
    }

    .mb-0 { margin-bottom: 0; }

    @media (max-width: 900px) {
      .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
    }
  `]})
export class LabManagementComponent implements OnInit, OnDestroy {
  private readonly labService = inject(ClinicalLabService);
  private readonly authService = inject(AuthService);

  // Khoa của KTV đang đăng nhập (backend đã lọc danh sách theo khoa này)
  readonly departmentLabel = computed(() => {
    switch (this.authService.currentUser()?.department) {
      case 'XET_NGHIEM': return 'Khoa xét nghiệm';
      case 'CHAN_DOAN_HINH_ANH': return 'Khoa chẩn đoán hình ảnh';
      default: return 'Xét nghiệm & chẩn đoán hình ảnh';
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
