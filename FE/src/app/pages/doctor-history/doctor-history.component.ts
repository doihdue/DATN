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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lịch sử khám bệnh</h1>
          <p class="page-subtitle">{{ records().length }} ca đã khám, {{ todayCount() }} ca hôm nay</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-secondary" (click)="loadRecords()">
            <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i> Làm mới
          </button>
          <a routerLink="/doctor/examination" class="btn btn-primary">Bàn khám bệnh</a>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Tổng ca đã khám</span>
          <span class="stat-value mono">{{ records().length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Khám hôm nay</span>
          <span class="stat-value mono">{{ todayCount() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Có chỉ định CLS</span>
          <span class="stat-value mono">{{ withLabCount() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Có kê đơn thuốc</span>
          <span class="stat-value mono">{{ withPrescriptionCount() }}</span>
        </div>
      </div>

      <div class="panel">
        <div class="toolbar">
          <div class="search-box">
            <i class="bi bi-search"></i>
            <input
              type="text"
              class="search-input"
              placeholder="Tìm theo tên bệnh nhân, số vé, SĐT, chẩn đoán, mã ICD"
              [(ngModel)]="searchQuery"
            />
            @if (searchQuery) {
              <button class="clear-btn" (click)="searchQuery = ''" title="Xóa tìm kiếm" aria-label="Xóa tìm kiếm">
                <i class="bi bi-x-lg"></i>
              </button>
            }
          </div>
          <select [(ngModel)]="timeFilter" class="filter-select" aria-label="Khoảng thời gian">
            <option value="ALL">Tất cả thời gian</option>
            <option value="TODAY">Hôm nay</option>
            <option value="7DAYS">7 ngày gần nhất</option>
            <option value="30DAYS">30 ngày gần nhất</option>
          </select>
          <select [(ngModel)]="typeFilter" class="filter-select" aria-label="Loại ca">
            <option value="ALL">Tất cả loại ca</option>
            <option value="WITH_LAB">Có chỉ định xét nghiệm</option>
            <option value="WITH_PRESCRIPTION">Có đơn thuốc</option>
            <option value="REVISIT">Có hẹn tái khám</option>
          </select>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải lịch sử khám...</p>
          </div>
        } @else if (filteredRecords().length === 0) {
          <div class="empty-state">
            <h3>Không có ca khám nào</h3>
            <p>
              @if (searchQuery || timeFilter !== 'ALL' || typeFilter !== 'ALL') {
                Không có ca khám phù hợp với bộ lọc hiện tại.
              } @else {
                Chưa có ca khám nào được ghi nhận.
              }
            </p>
            @if (searchQuery || timeFilter !== 'ALL' || typeFilter !== 'ALL') {
              <button class="btn btn-sm btn-secondary mt-3" (click)="resetFilters()">Đặt lại bộ lọc</button>
            }
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 120px;">Thời gian</th>
                  <th style="width: 110px;">Số vé</th>
                  <th style="min-width: 180px;">Bệnh nhân</th>
                  <th style="width: 130px;">Sinh hiệu</th>
                  <th style="min-width: 220px;">Chẩn đoán</th>
                  <th style="width: 120px;">Cận lâm sàng</th>
                  <th style="width: 110px;">Đơn thuốc</th>
                  <th style="width: 90px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (record of paginatedRecords(); track record.id) {
                  <tr>
                    <td>
                      <div class="stack">
                        <span class="mono">{{ record.createdAt | date: 'dd/MM/yyyy' }}</span>
                        <span class="sub mono">{{ record.createdAt | date: 'HH:mm' }}</span>
                      </div>
                    </td>
                    <td class="mono text-muted">{{ record.ticketNumber || ('#' + record.queueTicketId) }}</td>
                    <td>
                      <div class="stack">
                        <span class="strong">{{ record.patientName }}</span>
                        <span class="sub">
                          {{ record.patientGender === 'MALE' ? 'Nam' : (record.patientGender === 'FEMALE' ? 'Nữ' : (record.patientGender || '—')) }}
                          @if (record.patientDob) {
                            · {{ calculateAge(record.patientDob) }} tuổi
                          }
                          @if (record.patientPhone) {
                            · {{ record.patientPhone }}
                          }
                        </span>
                      </div>
                    </td>
                    <td>
                      <div class="stack mono">
                        @if (record.bloodPressure) {
                          <span title="Huyết áp">{{ record.bloodPressure }} <span class="sub">mmHg</span></span>
                        }
                        @if (record.heartRate) {
                          <span title="Nhịp tim">{{ record.heartRate }} <span class="sub">lần/phút</span></span>
                        }
                        @if (!record.bloodPressure && !record.heartRate) {
                          <span class="text-muted">—</span>
                        }
                      </div>
                    </td>
                    <td>
                      <div class="stack">
                        <span class="diag" [title]="record.finalDiagnosis || record.preliminaryDiagnosis || ''">
                          {{ record.finalDiagnosis || record.preliminaryDiagnosis || 'Chưa ghi rõ' }}
                        </span>
                        @if (record.icd10Code) {
                          <span class="sub mono">ICD-10 {{ record.icd10Code }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      @if (record.labOrders && record.labOrders.length > 0) {
                        <span class="status" [class.success]="isAllLabCompleted(record)" [class.warning]="!isAllLabCompleted(record)">
                          {{ record.labOrders.length }} chỉ định
                        </span>
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      @if (record.prescription && record.prescription.items && record.prescription.items.length > 0) {
                        {{ record.prescription.items.length }} thuốc
                      } @else {
                        <span class="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <div class="row-actions">
                        <button type="button" class="icon-btn" title="Xem bệnh án" aria-label="Xem bệnh án" (click)="openDetailModal(record)">
                          <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="icon-btn" title="Xuất PDF phiếu khám và đơn thuốc" aria-label="Xuất PDF" (click)="printMedicalRecordPdf(record.id)">
                          <i class="bi bi-file-earmark-pdf"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          @if (filteredRecords().length > pageSize) {
            <div class="pagination-footer">
              <span class="mono">{{ paginationStartIndex() }}–{{ paginationEndIndex() }} / {{ filteredRecords().length }}</span>
              <div class="pagination-controls">
                <button type="button" class="btn-page" [disabled]="currentPage === 1" (click)="currentPage = currentPage - 1" title="Trang trước" aria-label="Trang trước">
                  <i class="bi bi-chevron-left"></i>
                </button>
                <span class="page-indicator mono">Trang {{ currentPage }} / {{ totalPages() }}</span>
                <button type="button" class="btn-page" [disabled]="currentPage >= totalPages()" (click)="currentPage = currentPage + 1" title="Trang sau" aria-label="Trang sau">
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Modal chi tiết bệnh án -->
      @if (selectedRecord(); as rec) {
        <div class="modal-backdrop" (click)="closeDetailModal()">
          <div class="modal-dialog modal-xl" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div>
                <h2 class="modal-title">Bệnh án: {{ rec.patientName }}</h2>
                <div class="modal-meta">
                  <span class="mono">Vé {{ rec.ticketNumber || ('#' + rec.queueTicketId) }}</span>
                  <span>·</span>
                  <span class="mono">{{ rec.createdAt | date: 'HH:mm dd/MM/yyyy' }}</span>
                </div>
              </div>
              <button type="button" class="modal-close-btn" (click)="closeDetailModal()" aria-label="Đóng">×</button>
            </div>

            <div class="modal-body">
              <section class="detail-section">
                <h3 class="section-title">Bệnh nhân và sinh hiệu</h3>
                <dl class="detail-grid">
                  <dt>Họ và tên</dt><dd class="strong">{{ rec.patientName }}</dd>
                  <dt>Giới tính / tuổi</dt>
                  <dd>
                    {{ rec.patientGender === 'MALE' ? 'Nam' : (rec.patientGender === 'FEMALE' ? 'Nữ' : (rec.patientGender || '—')) }}
                    @if (rec.patientDob) {
                      · {{ calculateAge(rec.patientDob) }} tuổi
                    }
                  </dd>
                  <dt>Số điện thoại</dt><dd>{{ rec.patientPhone || '—' }}</dd>
                  <dt>Nhóm máu</dt><dd>{{ rec.bloodGroup || 'Chưa rõ' }}</dd>
                  <dt>Tiền sử dị ứng</dt>
                  <dd [class.text-danger]="rec.allergies">{{ rec.allergies || 'Không ghi nhận' }}</dd>
                </dl>

                <div class="vitals-strip">
                  <div class="vital-box">
                    <span class="vital-name">Huyết áp</span>
                    <span class="vital-number mono">{{ rec.bloodPressure || '—' }} <small>mmHg</small></span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Nhịp tim</span>
                    <span class="vital-number mono">{{ rec.heartRate || '—' }} <small>lần/phút</small></span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Thân nhiệt</span>
                    <span class="vital-number mono">{{ rec.temperature || '—' }} <small>°C</small></span>
                  </div>
                  <div class="vital-box">
                    <span class="vital-name">Cân nặng / chiều cao</span>
                    <span class="vital-number mono">{{ rec.weight || '—' }} <small>kg</small> / {{ rec.height || '—' }} <small>cm</small></span>
                  </div>
                </div>
              </section>

              <section class="detail-section">
                <h3 class="section-title">Khám lâm sàng và chẩn đoán</h3>
                <dl class="detail-grid detail-grid-wide">
                  <dt>Triệu chứng, lý do khám</dt><dd>{{ rec.symptoms || '—' }}</dd>
                  <dt>Chẩn đoán sơ bộ</dt><dd>{{ rec.preliminaryDiagnosis || '—' }}</dd>
                  <dt>Chẩn đoán xác định</dt>
                  <dd class="strong">
                    {{ rec.finalDiagnosis || rec.preliminaryDiagnosis || 'Chưa có' }}
                    @if (rec.icd10Code) {
                      <span class="code-tag mono">ICD-10 {{ rec.icd10Code }}</span>
                    }
                  </dd>
                  @if (rec.notes) {
                    <dt>Ghi chú lâm sàng</dt><dd>{{ rec.notes }}</dd>
                  }
                </dl>
              </section>

              @if (rec.labOrders && rec.labOrders.length > 0) {
                <section class="detail-section">
                  <h3 class="section-title">Cận lâm sàng ({{ rec.labOrders.length }})</h3>
                  <div class="table-responsive bordered">
                    <table class="data-table compact">
                      <thead>
                        <tr>
                          <th>Dịch vụ</th>
                          <th>Kết quả</th>
                          <th>Tham chiếu</th>
                          <th>Thực hiện</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (order of rec.labOrders; track order.id) {
                          <tr>
                            <td>
                              <div class="stack">
                                <span>{{ order.serviceName }}</span>
                                <span class="sub"><span class="mono">{{ order.serviceCode }}</span>@if (order.category) { · {{ order.category }} }</span>
                                @if (order.conclusion) {
                                  <span class="sub">Kết luận: {{ order.conclusion }}</span>
                                }
                              </div>
                            </td>
                            <td class="mono">
                              @if (order.status === 'COMPLETED') {
                                <span class="strong" [class.text-danger]="order.isAbnormal">{{ order.resultValue || '—' }}</span> {{ order.unit }}
                              } @else {
                                <span class="text-muted">—</span>
                              }
                            </td>
                            <td class="mono text-muted">{{ order.referenceRange || '—' }}</td>
                            <td>
                              <div class="stack">
                                <span>{{ order.performerName || '—' }}</span>
                                @if (order.shiftLabel) {
                                  <span class="sub">{{ order.shiftLabel }}{{ order.labRoomNumber ? ', ' + order.labRoomNumber : '' }}</span>
                                }
                                @if (order.performedTime) {
                                  <span class="sub mono">{{ order.performedTime | date: 'HH:mm dd/MM/yyyy' }}</span>
                                }
                              </div>
                            </td>
                            <td>
                              @if (order.status === 'COMPLETED') {
                                <span class="status success">Đã có kết quả</span>
                              } @else {
                                <span class="status warning">Chờ xử lý</span>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>
              }

              @if (rec.prescription && rec.prescription.items && rec.prescription.items.length > 0) {
                <section class="detail-section">
                  <h3 class="section-title">Đơn thuốc ({{ rec.prescription.items.length }})</h3>
                  <div class="table-responsive bordered">
                    <table class="data-table compact">
                      <thead>
                        <tr>
                          <th style="width: 40px;">STT</th>
                          <th>Thuốc / hoạt chất</th>
                          <th>Liều dùng</th>
                          <th style="text-align: right;">Số lượng</th>
                          <th>Hướng dẫn</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (item of rec.prescription.items; track item.id; let idx = $index) {
                          <tr>
                            <td class="mono text-muted">{{ idx + 1 }}</td>
                            <td>
                              <div class="stack">
                                <span class="strong">{{ item.medicineName }}</span>
                                <span class="sub">{{ item.activeIngredient }}</span>
                              </div>
                            </td>
                            <td>{{ item.dosage || '—' }}</td>
                            <td class="mono" style="text-align: right;">{{ item.quantity }} {{ item.unit }}</td>
                            <td>{{ item.instructions }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </section>
              }

              @if (rec.revisitDate || rec.prescription?.doctorAdvice) {
                <section class="detail-section">
                  <h3 class="section-title">Lời dặn và tái khám</h3>
                  <dl class="detail-grid detail-grid-wide">
                    @if (rec.prescription?.doctorAdvice) {
                      <dt>Lời dặn</dt><dd>{{ rec.prescription?.doctorAdvice }}</dd>
                    }
                    @if (rec.revisitDate) {
                      <dt>Ngày tái khám</dt>
                      <dd>
                        <span class="strong mono">{{ rec.revisitDate | date: 'dd/MM/yyyy' }}</span>
                        @if (rec.revisitNotes) {
                          <span class="text-muted"> ({{ rec.revisitNotes }})</span>
                        }
                      </dd>
                    }
                  </dl>
                </section>
              }
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeDetailModal()">Đóng</button>
              <button type="button" class="btn btn-primary" (click)="printMedicalRecordPdf(rec.id)">Xuất PDF</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 14px 16px;
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

    .toolbar .search-box {
      position: relative;
      flex: 1 1 280px;
      max-width: 440px;
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
      padding: 0 32px 0 32px;
    }

    .filter-select {
      padding: 0 8px;
      min-width: 180px;
    }

    .search-input:focus,
    .filter-select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .clear-btn {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      width: 26px;
      height: 26px;
      border: none;
      background: transparent;
      color: var(--text-light);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
    }

    .clear-btn:hover { color: var(--text-main); background: var(--bg-hover); }

    .table-responsive { overflow-x: auto; }

    .stack {
      display: flex;
      flex-direction: column;
      line-height: 1.4;
    }

    .sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    .strong { font-weight: 500; }

    .diag {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
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

    .mt-3 { margin-top: 12px; }

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

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 8px;
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

    .spin-active {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Modal chi tiết */
    .modal-xl {
      max-width: 880px;
      width: 100%;
    }

    .modal-header { align-items: flex-start; }

    .modal-meta {
      display: flex;
      gap: 6px;
      margin-top: 2px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .detail-section + .detail-section {
      margin-top: 20px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      margin: 0 0 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 140px minmax(0, 1fr) 140px minmax(0, 1fr);
      gap: 8px 16px;
      margin: 0;
      font-size: 14px;
    }

    .detail-grid-wide {
      grid-template-columns: 170px minmax(0, 1fr);
    }

    .detail-grid dt {
      color: var(--text-muted);
      font-size: 13px;
    }

    .detail-grid dd {
      margin: 0;
      color: var(--text-main);
    }

    .code-tag {
      margin-left: 8px;
      font-size: 12px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .vitals-strip {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin-top: 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .vital-box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 10px 12px;
    }

    .vital-box + .vital-box { border-left: 1px solid var(--border-color); }

    .vital-name {
      font-size: 12px;
      color: var(--text-muted);
    }

    .vital-number {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }

    .vital-number small {
      font-size: 12px;
      font-weight: 400;
      color: var(--text-muted);
    }

    .bordered {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .data-table.compact td,
    .data-table.compact th {
      padding: 8px 10px;
      vertical-align: top;
    }

    .data-table.compact td { font-size: 13px; }

    .text-muted { color: var(--text-muted); }
    .text-danger { color: var(--danger-text); }

    @media (max-width: 900px) {
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .detail-grid { grid-template-columns: 130px minmax(0, 1fr); }
      .vitals-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .vital-box:nth-child(3) { border-left: none; }
    }
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
