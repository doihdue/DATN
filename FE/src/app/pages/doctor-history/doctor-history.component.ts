import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MedicalRecordService } from '../../services/medical-record.service';
import { AuthService } from '../../services/auth.service';
import { MedicalRecordResponse } from '../../models/medical-record.model';

@Component({
  selector: 'app-doctor-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="doctor-history-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi bi-clock-history"></i> Hồ Sơ Y Khoa &amp; Quản Lý Ca Khám
          </div>
          <h1 class="page-title">Lịch Sử Ca Khám Bệnh</h1>
          <p class="page-subtitle">
            Tra cứu các ca bệnh đã khám, xem lại bệnh án, kết quả xét nghiệm, đơn thuốc và in ấn phiếu khám y khoa
          </p>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="loadRecords()">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Làm mới
          </button>
          <a routerLink="/doctor/examination" class="btn btn-primary">
            <i class="bi bi-clipboard2-pulse"></i> Bàn khám bệnh
          </a>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-box icon-blue">
            <i class="bi bi-journal-medical"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">Tổng ca đã khám</span>
            <span class="metric-value">{{ records().length }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box icon-green">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">Khám hôm nay</span>
            <span class="metric-value">{{ todayCount() }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box icon-purple">
            <i class="bi bi-eyedropper"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">Có xét nghiệm CLS</span>
            <span class="metric-value">{{ withLabCount() }}</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-box icon-teal">
            <i class="bi bi-capsule"></i>
          </div>
          <div class="metric-info">
            <span class="metric-label">Đã kê đơn thuốc</span>
            <span class="metric-value">{{ withPrescriptionCount() }}</span>
          </div>
        </div>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="search-bar-card">
        <div class="search-box">
          <i class="bi bi-search search-icon"></i>
          <input
            type="text"
            class="search-input"
            placeholder="Tìm theo tên bệnh nhân, số vé khám, SĐT, chẩn đoán, mã ICD..."
            [(ngModel)]="searchQuery"
          />
          @if (searchQuery) {
            <button class="clear-btn" (click)="searchQuery = ''" title="Xóa tìm kiếm">
              <i class="bi bi-x-circle-fill"></i>
            </button>
          }
        </div>

        <div class="filter-group">
          <!-- Time Filter -->
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-calendar3"></i> Khoảng thời gian</label>
            <select [(ngModel)]="timeFilter" class="form-select">
              <option value="ALL">Tất cả thời gian</option>
              <option value="TODAY">Hôm nay</option>
              <option value="7DAYS">7 ngày gần nhất</option>
              <option value="30DAYS">30 ngày qua</option>
            </select>
          </div>

          <!-- Type Filter -->
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-funnel"></i> Loại ca bệnh</label>
            <select [(ngModel)]="typeFilter" class="form-select">
              <option value="ALL">Tất cả loại ca</option>
              <option value="WITH_LAB">Có chỉ định xét nghiệm</option>
              <option value="WITH_PRESCRIPTION">Có đơn thuốc</option>
              <option value="REVISIT">Có hẹn tái khám</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      @if (loading()) {
        <div class="state-card loading-state">
          <div class="spinner"></div>
          <p class="state-text">Đang tải lịch sử các ca khám bệnh...</p>
        </div>
      } @else if (filteredRecords().length === 0) {
        <div class="state-card empty-state">
          <div class="empty-icon-wrap">
            <i class="bi bi-inbox"></i>
          </div>
          <h3 class="empty-title">Không tìm thấy ca khám nào</h3>
          <p class="empty-desc">
            @if (searchQuery || timeFilter !== 'ALL' || typeFilter !== 'ALL') {
              Không có ca khám nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại.
            } @else {
              Bác sĩ chưa có ca khám bệnh nào được ghi nhận trong hệ thống.
            }
          </p>
          @if (searchQuery || timeFilter !== 'ALL' || typeFilter !== 'ALL') {
            <button class="btn btn-sm btn-outline mt-3" (click)="resetFilters()">
              <i class="bi bi-arrow-repeat"></i> Đặt lại bộ lọc
            </button>
          }
        </div>
      } @else {
        <!-- Records Table Card -->
        <div class="table-card">
          <div class="table-responsive">
            <table class="modern-table">
              <thead>
                <tr>
                  <th style="width: 130px;">Thời gian</th>
                  <th style="width: 110px;">Số vé</th>
                  <th style="min-width: 170px;">Bệnh nhân</th>
                  <th style="width: 140px;">Sinh hiệu</th>
                  <th style="min-width: 200px;">Chẩn đoán lâm sàng</th>
                  <th style="width: 130px;">Cận lâm sàng</th>
                  <th style="width: 130px;">Đơn thuốc</th>
                  <th style="width: 140px; text-align: right;">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                @for (record of paginatedRecords(); track record.id) {
                  <tr class="table-row">
                    <!-- Thời gian -->
                    <td>
                      <div class="date-badge">
                        <span class="date-part">{{ record.createdAt | date: 'dd/MM/yyyy' }}</span>
                        <span class="time-part">{{ record.createdAt | date: 'HH:mm' }}</span>
                      </div>
                    </td>

                    <!-- Vé khám -->
                    <td>
                      <span class="ticket-tag">
                        <i class="bi bi-ticket-perforated"></i> {{ record.ticketNumber || ('# ' + record.queueTicketId) }}
                      </span>
                    </td>

                    <!-- Bệnh nhân -->
                    <td>
                      <div class="patient-cell">
                        <div class="patient-name">
                          <i class="bi" [ngClass]="record.patientGender === 'MALE' ? 'bi-gender-male text-male' : 'bi-gender-female text-female'"></i>
                          {{ record.patientName }}
                        </div>
                        <div class="patient-sub">
                          @if (record.patientDob) {
                            <span>{{ calculateAge(record.patientDob) }} tuổi</span>
                            <span class="dot-divider">•</span>
                          }
                          @if (record.patientPhone) {
                            <span>{{ record.patientPhone }}</span>
                          }
                        </div>
                      </div>
                    </td>

                    <!-- Sinh hiệu -->
                    <td>
                      <div class="vital-pills">
                        @if (record.bloodPressure) {
                          <span class="vital-pill" title="Huyết áp">
                            <i class="bi bi-heart-pulse"></i> {{ record.bloodPressure }}
                          </span>
                        }
                        @if (record.heartRate) {
                          <span class="vital-pill" title="Nhịp tim">
                            <i class="bi bi-activity"></i> {{ record.heartRate }} bpm
                          </span>
                        }
                        @if (!record.bloodPressure && !record.heartRate) {
                          <span class="text-muted small">--</span>
                        }
                      </div>
                    </td>

                    <!-- Chẩn đoán -->
                    <td>
                      <div class="diagnosis-cell">
                        <div class="final-diag" [title]="record.finalDiagnosis || record.preliminaryDiagnosis || ''">
                          {{ record.finalDiagnosis || record.preliminaryDiagnosis || 'Chưa ghi rõ' }}
                        </div>
                        @if (record.icd10Code) {
                          <span class="icd-badge">
                            ICD-10: <strong>{{ record.icd10Code }}</strong>
                          </span>
                        }
                      </div>
                    </td>

                    <!-- Xét nghiệm CLS -->
                    <td>
                      @if (record.labOrders && record.labOrders.length > 0) {
                        <span class="lab-count-badge" [class.badge-completed]="isAllLabCompleted(record)">
                          <i class="bi bi-eyedropper"></i> {{ record.labOrders.length }} chỉ định
                        </span>
                      } @else {
                        <span class="text-muted small">Không chỉ định</span>
                      }
                    </td>

                    <!-- Đơn thuốc -->
                    <td>
                      @if (record.prescription && record.prescription.items && record.prescription.items.length > 0) {
                        <span class="rx-badge" title="Đã kê đơn">
                          <i class="bi bi-capsule"></i> {{ record.prescription.items.length }} loại thuốc
                        </span>
                      } @else {
                        <span class="text-muted small">Không kê đơn</span>
                      }
                    </td>

                    <!-- Thao tác -->
                    <td class="text-right">
                      <div class="action-buttons">
                        <button
                          type="button"
                          class="btn-icon-action btn-view"
                          title="Xem chi tiết bệnh án"
                          (click)="openDetailModal(record)"
                        >
                          <i class="bi bi-eye"></i>
                        </button>
                        <button
                          type="button"
                          class="btn-icon-action btn-pdf"
                          title="Tải / In PDF Phiếu khám & Đơn thuốc"
                          (click)="printMedicalRecordPdf(record.id)"
                        >
                          <i class="bi bi-file-earmark-pdf"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          @if (filteredRecords().length > pageSize) {
            <div class="pagination-bar">
              <span class="pagination-info">
                Hiển thị <strong>{{ paginationStartIndex() }}</strong> - <strong>{{ paginationEndIndex() }}</strong> trong tổng số <strong>{{ filteredRecords().length }}</strong> ca
              </span>
              <div class="pagination-controls">
                <button
                  type="button"
                  class="page-btn"
                  [disabled]="currentPage === 1"
                  (click)="currentPage = currentPage - 1"
                >
                  <i class="bi bi-chevron-left"></i>
                </button>
                <span class="page-indicator">Trang {{ currentPage }} / {{ totalPages() }}</span>
                <button
                  type="button"
                  class="page-btn"
                  [disabled]="currentPage >= totalPages()"
                  (click)="currentPage = currentPage + 1"
                >
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Xem Chi Tiết Bệnh Án -->
      @if (selectedRecord(); as rec) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog-large" (click)="$event.stopPropagation()">
            <!-- Modal Header -->
            <div class="modal-header">
              <div class="modal-header-info">
                <div class="header-pretitle">
                  <span class="ticket-pill">Vé: {{ rec.ticketNumber || ('# ' + rec.queueTicketId) }}</span>
                  <span class="time-stamp">Khám lúc: {{ rec.createdAt | date: 'HH:mm - dd/MM/yyyy' }}</span>
                </div>
                <h2 class="modal-title">Hồ Sơ Bệnh Án: {{ rec.patientName }}</h2>
              </div>
              <button type="button" class="close-modal-btn" (click)="closeDetailModal()">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <!-- Section 1: Thông tin bệnh nhân & Sinh hiệu -->
              <div class="detail-section">
                <h4 class="section-title"><i class="bi bi-person-badge"></i> 1. Thông Tin Bệnh Nhân &amp; Sinh Hiệu</h4>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Họ và tên:</span>
                    <span class="info-val font-semibold">{{ rec.patientName }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Giới tính / Tuổi:</span>
                    <span class="info-val">
                      {{ rec.patientGender === 'MALE' ? 'Nam' : 'Nữ' }}
                      @if (rec.patientDob) {
                        - {{ calculateAge(rec.patientDob) }} tuổi
                      }
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Số điện thoại:</span>
                    <span class="info-val">{{ rec.patientPhone || 'Chưa cập nhật' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Nhóm máu:</span>
                    <span class="info-val font-semibold text-danger">{{ rec.bloodGroup || 'Chưa rõ' }}</span>
                  </div>
                  <div class="info-item full-width">
                    <span class="info-label">Tiền sử dị ứng:</span>
                    <span class="info-val text-warning">{{ rec.allergies || 'Không có dị ứng ghi nhận' }}</span>
                  </div>
                </div>

                <!-- Sinh hiệu Box -->
                <div class="vitals-strip">
                  <div class="vital-box">
                    <span class="vital-name">Huyết áp</span>
                    <span class="vital-number">{{ rec.bloodPressure || '--' }}</span>
                    <span class="vital-unit">mmHg</span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Nhịp tim</span>
                    <span class="vital-number">{{ rec.heartRate || '--' }}</span>
                    <span class="vital-unit">lần/phút</span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Thân nhiệt</span>
                    <span class="vital-number">{{ rec.temperature || '--' }}</span>
                    <span class="vital-unit">°C</span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Cân nặng / Chiều cao</span>
                    <span class="vital-number">
                      {{ rec.weight || '--' }}kg / {{ rec.height || '--' }}cm
                    </span>
                    <span class="vital-unit">Thể trạng</span>
                  </div>
                </div>
              </div>

              <!-- Section 2: Khám lâm sàng & Chẩn đoán -->
              <div class="detail-section">
                <h4 class="section-title"><i class="bi bi-clipboard2-pulse"></i> 2. Khám Lâm Sàng &amp; Chẩn Đoán</h4>
                <div class="diagnosis-block">
                  <div class="diag-item">
                    <span class="diag-label">Triệu chứng &amp; Lý do khám:</span>
                    <p class="diag-text">{{ rec.symptoms || 'Không có ghi nhận' }}</p>
                  </div>
                  <div class="diag-item">
                    <span class="diag-label">Chẩn đoán sơ bộ:</span>
                    <p class="diag-text">{{ rec.preliminaryDiagnosis || '--' }}</p>
                  </div>
                  <div class="diag-item final-diag-highlight">
                    <span class="diag-label">Chẩn đoán xác định:</span>
                    <p class="diag-text bold-final">
                      {{ rec.finalDiagnosis || rec.preliminaryDiagnosis || 'Chưa có chẩn đoán xác định' }}
                    </p>
                    @if (rec.icd10Code) {
                      <span class="icd-badge-lg">Mã bệnh quốc tế ICD-10: <strong>{{ rec.icd10Code }}</strong></span>
                    }
                  </div>
                  @if (rec.notes) {
                    <div class="diag-item">
                      <span class="diag-label">Ghi chú lâm sàng:</span>
                      <p class="diag-text">{{ rec.notes }}</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Section 3: Cận lâm sàng & Kết quả xét nghiệm -->
              @if (rec.labOrders && rec.labOrders.length > 0) {
                <div class="detail-section">
                  <h4 class="section-title"><i class="bi bi-eyedropper"></i> 3. Chỉ Định Cận Lâm Sàng &amp; Kết Quả Phòng Xét Nghiệm</h4>
                  <div class="lab-orders-list">
                    @for (order of rec.labOrders; track order.id) {
                      <div class="lab-order-card" [class.completed]="order.status === 'COMPLETED'">
                        <div class="order-card-header">
                          <div class="order-service-name">
                            <span class="service-code">{{ order.serviceCode }}</span>
                            <strong>{{ order.serviceName }}</strong>
                            <span class="order-cat-tag">{{ order.category }}</span>
                          </div>
                          <span class="order-status-badge" [class.badge-done]="order.status === 'COMPLETED'">
                            {{ order.status === 'COMPLETED' ? 'Đã có kết quả' : order.status }}
                          </span>
                        </div>

                        @if (order.status === 'COMPLETED') {
                          <div class="order-results-body">
                            <div class="res-row">
                              <span class="res-label">Kết quả đo:</span>
                              <span class="res-val highlight-val">{{ order.resultValue || 'Xem chi tiết' }} {{ order.unit }}</span>
                              @if (order.referenceRange) {
                                <span class="res-ref">(Tham chiếu: {{ order.referenceRange }})</span>
                              }
                            </div>
                            @if (order.conclusion) {
                              <div class="res-row">
                                <span class="res-label">Kết luận / Đánh giá:</span>
                                <span class="res-val">{{ order.conclusion }}</span>
                              </div>
                            }
                            @if (order.performerName) {
                              <div class="res-row text-muted small">
                                <span>KTV thực hiện: {{ order.performerName }}</span>
                                @if (order.performedTime) {
                                  <span> - Lúc: {{ order.performedTime | date: 'HH:mm dd/MM/yyyy' }}</span>
                                }
                              </div>
                            }
                          </div>
                        } @else {
                          <div class="order-pending-msg">
                            <i class="bi bi-hourglass-split"></i> Đang chờ phòng xét nghiệm tiếp nhận và xử lý mẫu
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Section 4: Đơn thuốc điện tử -->
              @if (rec.prescription && rec.prescription.items && rec.prescription.items.length > 0) {
                <div class="detail-section">
                  <h4 class="section-title"><i class="bi bi-capsule"></i> 4. Đơn Thuốc Điện Tử &amp; Hướng Dẫn Sử Dụng</h4>
                  <div class="prescription-table-wrap">
                    <table class="prescription-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Tên biệt dược / Hoạt chất</th>
                          <th>Hàm lượng</th>
                          <th>Số lượng</th>
                          <th>Đường dùng &amp; Hướng dẫn liều</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of rec.prescription.items; track item.id; let idx = $index) {
                          <tr>
                            <td class="text-center font-semibold">{{ idx + 1 }}</td>
                            <td>
                              <div class="rx-medicine-name">{{ item.medicineName }}</div>
                              <div class="rx-medicine-sub">{{ item.activeIngredient }}</div>
                            </td>
                            <td>{{ item.dosage || '--' }}</td>
                            <td class="font-bold text-center">{{ item.quantity }} {{ item.unit }}</td>
                            <td>
                              <div class="rx-instruction">{{ item.instructions }}</div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- Section 5: Lời dặn & Hẹn tái khám -->
              @if (rec.revisitDate || rec.prescription?.doctorAdvice) {
                <div class="detail-section">
                  <h4 class="section-title"><i class="bi bi-calendar2-heart"></i> 5. Lời Dặn Bác Sĩ &amp; Hẹn Tái Khám</h4>
                  <div class="advice-card">
                    @if (rec.prescription?.doctorAdvice) {
                      <div class="advice-item">
                        <span class="advice-label"><i class="bi bi-chat-heart"></i> Lời dặn dò:</span>
                        <p class="advice-content">{{ rec.prescription?.doctorAdvice }}</p>
                      </div>
                    }
                    @if (rec.revisitDate) {
                      <div class="revisit-item">
                        <span class="revisit-label"><i class="bi bi-calendar-event"></i> Ngày hẹn tái khám:</span>
                        <span class="revisit-date-val">{{ rec.revisitDate | date: 'dd/MM/yyyy' }}</span>
                        @if (rec.revisitNotes) {
                          <span class="revisit-notes">({{ rec.revisitNotes }})</span>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="modal-footer">
              <button type="button" class="btn btn-outline" (click)="closeDetailModal()">
                Đóng
              </button>
              <button
                type="button"
                class="btn btn-primary"
                (click)="printMedicalRecordPdf(rec.id)"
              >
                <i class="bi bi-printer"></i> In Phiếu Khám &amp; Đơn Thuốc (PDF)
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .doctor-history-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 1.5rem 1rem 3rem;
    }

    /* Page Header */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.82rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.35rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 1.15rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .metric-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .icon-blue { background: #e0f2fe; color: #0284c7; }
    .icon-green { background: #ecfdf5; color: #059669; }
    .icon-purple { background: #f3e8ff; color: #7e22ce; }
    .icon-teal { background: #ccfbf1; color: #0f766e; }

    .metric-info {
      display: flex;
      flex-direction: column;
    }

    .metric-label {
      font-size: 0.82rem;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 0.15rem;
    }

    .metric-value {
      font-size: 1.6rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }

    /* Search Bar & Filters */
    .search-bar-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 1rem 1.25rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
    }

    .search-box {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 1rem;
      color: #94a3b8;
      font-size: 1rem;
    }

    .search-input {
      width: 100%;
      height: 42px;
      padding: 0 2.5rem 0 2.5rem;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 0.92rem;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      background: #ffffff;
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }

    .clear-btn {
      position: absolute;
      right: 0.75rem;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }

    .clear-btn:hover { color: #64748b; }

    .filter-group {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .filter-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .form-select {
      height: 42px;
      padding: 0 2rem 0 0.85rem;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      font-size: 0.88rem;
      font-weight: 600;
      color: #334155;
      outline: none;
      cursor: pointer;
    }

    .form-select:focus {
      border-color: #0284c7;
      background: #ffffff;
    }

    /* Table Card */
    .table-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
    }

    .modern-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    .modern-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
    }

    .modern-table td {
      padding: 1rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
      font-size: 0.9rem;
    }

    .table-row:hover {
      background: #f8fafc;
    }

    .date-badge {
      display: flex;
      flex-direction: column;
    }

    .date-part {
      font-weight: 700;
      color: #1e293b;
    }

    .time-part {
      font-size: 0.8rem;
      color: #64748b;
    }

    .ticket-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.65rem;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 8px;
      font-weight: 800;
      font-size: 0.85rem;
      border: 1px solid #bfdbfe;
    }

    .patient-cell {
      display: flex;
      flex-direction: column;
    }

    .patient-name {
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .text-male { color: #0284c7; }
    .text-female { color: #ec4899; }

    .patient-sub {
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.15rem;
    }

    .dot-divider {
      color: #cbd5e1;
    }

    .vital-pills {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .vital-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.78rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      width: fit-content;
    }

    .diagnosis-cell {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .final-diag {
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
      max-width: 280px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .icd-badge {
      display: inline-flex;
      font-size: 0.75rem;
      background: #eef2ff;
      color: #4338ca;
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      width: fit-content;
      font-weight: 600;
      border: 1px solid #c7d2fe;
    }

    .lab-count-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: #f3e8ff;
      color: #7e22ce;
      border: 1px solid #e9d5ff;
    }

    .lab-count-badge.badge-completed {
      background: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .rx-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      background: #ccfbf1;
      color: #0f766e;
      border: 1px solid #99f6e4;
    }

    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
    }

    .btn-icon-action {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 1rem;
    }

    .btn-view { color: #0284c7; }
    .btn-view:hover {
      background: #f0f9ff;
      border-color: #0284c7;
    }

    .btn-pdf { color: #dc2626; }
    .btn-pdf:hover {
      background: #fef2f2;
      border-color: #dc2626;
    }

    /* Pagination */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      font-size: 0.88rem;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .page-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .page-indicator {
      font-weight: 600;
      color: #334155;
    }

    /* Modal Backdrop & Dialog */
    .modal-backdrop {
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
    }

    .modal-dialog-large {
      background: #ffffff;
      border-radius: 18px;
      width: 100%;
      max-width: 950px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }

    .header-pretitle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.35rem;
    }

    .ticket-pill {
      background: #0284c7;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.8rem;
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
    }

    .time-stamp {
      font-size: 0.82rem;
      color: #64748b;
    }

    .modal-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
    }

    .close-modal-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #64748b;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }

    .close-modal-btn:hover { color: #0f172a; }

    .modal-body {
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .detail-section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1.25rem;
      background: #ffffff;
    }

    .section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #0369a1;
      margin: 0 0 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem 1.25rem;
      margin-bottom: 1rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .info-item.full-width {
      grid-column: 1 / -1;
    }

    .info-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: 600;
    }

    .info-val {
      font-size: 0.92rem;
      color: #1e293b;
    }

    .vitals-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      background: #f8fafc;
      padding: 0.85rem;
      border-radius: 10px;
    }

    .vital-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .vital-name {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 600;
    }

    .vital-number {
      font-size: 1.2rem;
      font-weight: 800;
      color: #0284c7;
      line-height: 1.2;
    }

    .vital-unit {
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .diag-item {
      margin-bottom: 0.85rem;
    }

    .diag-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #475569;
      display: block;
      margin-bottom: 0.25rem;
    }

    .diag-text {
      margin: 0;
      font-size: 0.92rem;
      color: #1e293b;
      line-height: 1.4;
    }

    .final-diag-highlight {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 0.85rem;
    }

    .bold-final {
      font-size: 1.05rem;
      font-weight: 800;
      color: #15803d;
    }

    .icd-badge-lg {
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      background: #dcfce7;
      color: #166534;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      font-weight: 600;
    }

    /* Lab Orders list */
    .lab-orders-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .lab-order-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      background: #f8fafc;
    }

    .lab-order-card.completed {
      background: #ffffff;
      border-color: #cbd5e1;
    }

    .order-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .order-service-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
    }

    .service-code {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      background: #e2e8f0;
      border-radius: 4px;
      color: #334155;
    }

    .order-cat-tag {
      font-size: 0.75rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }

    .order-status-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      background: #fef3c7;
      color: #b45309;
    }

    .order-status-badge.badge-done {
      background: #ecfdf5;
      color: #047857;
    }

    .order-results-body {
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .res-row {
      font-size: 0.88rem;
    }

    .res-label {
      font-weight: 600;
      color: #475569;
      margin-right: 0.4rem;
    }

    .highlight-val {
      font-weight: 800;
      color: #0284c7;
    }

    .res-ref {
      color: #64748b;
      font-size: 0.82rem;
      margin-left: 0.4rem;
    }

    .order-pending-msg {
      margin-top: 0.5rem;
      font-size: 0.82rem;
      color: #b45309;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    /* Prescription Table */
    .prescription-table-wrap {
      overflow-x: auto;
    }

    .prescription-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }

    .prescription-table th {
      background: #f8fafc;
      padding: 0.65rem 0.75rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
      font-size: 0.8rem;
    }

    .prescription-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .rx-medicine-name {
      font-weight: 700;
      color: #0f172a;
    }

    .rx-medicine-sub {
      font-size: 0.78rem;
      color: #64748b;
    }

    .rx-instruction {
      color: #334155;
      font-style: italic;
    }

    /* Advice */
    .advice-card {
      background: #eff6ff;
      border-radius: 10px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .advice-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .advice-label, .revisit-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1d4ed8;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .advice-content {
      margin: 0;
      font-size: 0.92rem;
      color: #1e3a8a;
    }

    .revisit-date-val {
      font-size: 1.05rem;
      font-weight: 800;
      color: #b91c1c;
      margin-left: 0.25rem;
    }

    .revisit-notes {
      font-size: 0.85rem;
      color: #64748b;
      margin-left: 0.35rem;
    }

    .modal-footer {
      padding: 1rem 1.75rem;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
    }

    /* General Utilities */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.15rem;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      border: none;
      text-decoration: none;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-primary:hover {
      background: #0369a1;
    }

    .btn-outline {
      background: #ffffff;
      color: #475569;
      border: 1px solid #cbd5e1;
    }

    .btn-outline:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }

    .btn-sm {
      padding: 0.35rem 0.75rem;
      font-size: 0.82rem;
    }

    .spin-active {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .state-card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      padding: 3rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .empty-icon-wrap {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #f1f5f9;
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      margin-bottom: 1rem;
    }

    .empty-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 0.35rem;
    }

    .empty-desc {
      color: #64748b;
      font-size: 0.9rem;
      max-width: 450px;
      margin: 0;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    .state-text {
      color: #64748b;
      font-size: 0.92rem;
      margin: 0;
    }

    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-muted { color: #94a3b8; }
    .text-danger { color: #dc2626; }
    .text-warning { color: #d97706; }
  `]
})
export class DoctorHistoryComponent implements OnInit {
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly authService = inject(AuthService);

  readonly records = signal<MedicalRecordResponse[]>([]);
  readonly loading = signal<boolean>(true);
  readonly selectedRecord = signal<MedicalRecordResponse | null>(null);

  // Search & Filter criteria
  searchQuery = '';
  timeFilter: 'ALL' | 'TODAY' | '7DAYS' | '30DAYS' = 'ALL';
  typeFilter: 'ALL' | 'WITH_LAB' | 'WITH_PRESCRIPTION' | 'REVISIT' = 'ALL';

  // Pagination
  currentPage = 1;
  pageSize = 10;

  // Filtered Records Computed
  readonly filteredRecords = computed(() => {
    let result = this.records();
    const query = this.searchQuery.trim().toLowerCase();

    // 1. Lọc theo search
    if (query) {
      result = result.filter(r =>
        (r.patientName && r.patientName.toLowerCase().includes(query)) ||
        (r.ticketNumber && r.ticketNumber.toLowerCase().includes(query)) ||
        (r.patientPhone && r.patientPhone.includes(query)) ||
        (r.finalDiagnosis && r.finalDiagnosis.toLowerCase().includes(query)) ||
        (r.preliminaryDiagnosis && r.preliminaryDiagnosis.toLowerCase().includes(query)) ||
        (r.icd10Code && r.icd10Code.toLowerCase().includes(query))
      );
    }

    // 2. Lọc theo timeFilter
    const now = new Date();
    if (this.timeFilter === 'TODAY') {
      const todayStr = now.toISOString().substring(0, 10);
      result = result.filter(r => r.createdAt && r.createdAt.toString().substring(0, 10) === todayStr);
    } else if (this.timeFilter === '7DAYS') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      result = result.filter(r => r.createdAt && new Date(r.createdAt) >= sevenDaysAgo);
    } else if (this.timeFilter === '30DAYS') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      result = result.filter(r => r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo);
    }

    // 3. Lọc theo typeFilter
    if (this.typeFilter === 'WITH_LAB') {
      result = result.filter(r => r.labOrders && r.labOrders.length > 0);
    } else if (this.typeFilter === 'WITH_PRESCRIPTION') {
      result = result.filter(r => r.prescription && r.prescription.items && r.prescription.items.length > 0);
    } else if (this.typeFilter === 'REVISIT') {
      result = result.filter(r => !!r.revisitDate);
    }

    return result;
  });

  // Metrics
  readonly todayCount = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.records().filter(r => r.createdAt && r.createdAt.toString().substring(0, 10) === todayStr).length;
  });

  readonly withLabCount = computed(() => {
    return this.records().filter(r => r.labOrders && r.labOrders.length > 0).length;
  });

  readonly withPrescriptionCount = computed(() => {
    return this.records().filter(r => r.prescription && r.prescription.items && r.prescription.items.length > 0).length;
  });

  // Pagination Computations
  readonly totalPages = computed(() => Math.ceil(this.filteredRecords().length / this.pageSize) || 1);

  readonly paginatedRecords = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredRecords().slice(start, start + this.pageSize);
  });

  paginationStartIndex(): number {
    if (this.filteredRecords().length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  paginationEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredRecords().length);
  }

  ngOnInit(): void {
    this.loadRecords();
  }

  loadRecords(): void {
    this.loading.set(true);
    // Bác sĩ gọi endpoint lấy toàn bộ ca khám của chính mình
    this.medicalRecordService.getMyDoctorRecords().subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.records.set(res.data);
        }
      },
      error: () => {
        // Fallback: nếu gọi endpoint /doctor/my chưa có doctor context thì thử personId
        const user = this.authService.currentUser();
        if (user?.personId) {
          this.medicalRecordService.getDoctorRecords(user.personId).subscribe({
            next: fallbackRes => {
              this.loading.set(false);
              if (fallbackRes.success && fallbackRes.data) {
                this.records.set(fallbackRes.data);
              }
            },
            error: () => this.loading.set(false)
          });
        } else {
          this.loading.set(false);
        }
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.timeFilter = 'ALL';
    this.typeFilter = 'ALL';
    this.currentPage = 1;
  }

  openDetailModal(record: MedicalRecordResponse): void {
    this.selectedRecord.set(record);
  }

  closeDetailModal(): void {
    this.selectedRecord.set(null);
  }

  isAllLabCompleted(record: MedicalRecordResponse): boolean {
    if (!record.labOrders || record.labOrders.length === 0) return false;
    return record.labOrders.every(o => o.status === 'COMPLETED');
  }

  calculateAge(dob: string | any): number {
    if (!dob) return 0;
    const birthYear = new Date(dob).getFullYear();
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  }

  printMedicalRecordPdf(recordId: number): void {
    this.medicalRecordService.exportMedicalRecordPdf(recordId).subscribe({
      next: (blob: Blob) => {
        const fileUrl = window.URL.createObjectURL(blob);
        const newTab = window.open(fileUrl, '_blank');
        if (!newTab) {
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = `phieu-kham-${recordId}.pdf`;
          a.click();
        }
      },
      error: () => {
        alert('Không thể tạo file PDF phiếu khám vào lúc này. Vui lòng thử lại sau.');
      }
    });
  }
}
