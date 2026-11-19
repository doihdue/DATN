import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardOverview, DailyStat, RoomStat } from '../../models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Tổng quan</h1>
          <p class="page-subtitle">
            @if (data()) {
              Số liệu từ {{ data()?.fromDate | date:'dd/MM/yyyy' }} đến {{ data()?.toDate | date:'dd/MM/yyyy' }}
            } @else {
              Tiếp đón, hàng đợi và hiệu suất phòng khám
            }
          </p>
        </div>

        <div class="page-actions">
          <div class="segmented" role="group" aria-label="Khoảng thời gian">
            <button type="button" class="segmented-btn" [class.active]="selectedPeriod() === 'TODAY'" (click)="changePeriod('TODAY')">
              Hôm nay
            </button>
            <button type="button" class="segmented-btn" [class.active]="selectedPeriod() === 'WEEK'" (click)="changePeriod('WEEK')">
              7 ngày
            </button>
            <button type="button" class="segmented-btn" [class.active]="selectedPeriod() === 'MONTH'" (click)="changePeriod('MONTH')">
              30 ngày
            </button>
          </div>

          <button class="btn btn-secondary" (click)="loadData()" [disabled]="isLoading()" title="Tải lại số liệu">
            <i class="bi bi-arrow-clockwise" [class.spin]="isLoading()"></i> Làm mới
          </button>

          <button class="btn btn-secondary" (click)="triggerPrint()" title="In / xuất PDF">
            <i class="bi bi-printer"></i> In báo cáo
          </button>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải số liệu...</p>
        </div>
      } @else if (data()) {
        <!-- Chỉ số chính -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Lượt khám hoàn tất</span>
            <div class="kpi-value-row">
              <span class="kpi-value mono">{{ data()?.totalExaminationsCompleted }}</span>
              <span class="kpi-unit">/ {{ data()?.totalTickets }} vé</span>
            </div>
            <div class="kpi-meta">
              Hôm nay <span class="mono">{{ data()?.todayCompleted }}</span> hoàn tất / <span class="mono">{{ data()?.todayTickets }}</span> vé
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Thời gian chờ trung bình</span>
            <div class="kpi-value-row">
              <span class="kpi-value mono">{{ data()?.avgWaitingMinutes }}</span>
              <span class="kpi-unit">phút</span>
              @if ((data()?.avgWaitingMinutes ?? 0) <= 15) {
                <span class="status success">Tốt</span>
              } @else if ((data()?.avgWaitingMinutes ?? 0) <= 30) {
                <span class="status warning">Trung bình</span>
              } @else {
                <span class="status danger">Cao</span>
              }
            </div>
            <div class="kpi-meta">Mục tiêu ≤ 20 phút</div>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Tỷ lệ hủy lịch hẹn</span>
            <div class="kpi-value-row">
              <span class="kpi-value mono">{{ data()?.cancellationRate }}%</span>
            </div>
            <div class="kpi-meta">
              <span class="mono">{{ data()?.cancelledAppointments }}</span> / <span class="mono">{{ data()?.totalAppointments }}</span> lịch hẹn bị hủy
            </div>
          </div>

          <div class="kpi-card">
            <span class="kpi-label">Lịch hẹn</span>
            <div class="kpi-value-row">
              <span class="kpi-value mono">{{ data()?.totalAppointments }}</span>
            </div>
            <div class="kpi-meta">
              <span class="mono">{{ data()?.confirmedAppointments }}</span> đã xác nhận · <span class="mono">{{ data()?.completedAppointments }}</span> đã hoàn tất
            </div>
          </div>
        </div>

        <div class="analytics-grid">
          <!-- Lượt khám theo ngày -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Lượt khám theo ngày</h2>
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-swatch"></span> Ca hoàn tất</span>
                <span class="legend-item text-muted">Dòng dưới: chờ TB (phút)</span>
              </div>
            </div>
            <div class="panel-body">
              <div class="chart-scroll-wrapper">
                <div class="bar-chart" [class.period-month]="selectedPeriod() === 'MONTH'">
                  @if (data()?.totalExaminationsCompleted === 0) {
                    <div class="chart-empty">Chưa có ca khám hoàn tất trong khoảng thời gian này</div>
                  }
                  @for (d of data()?.dailyStats; track d.date) {
                    <div class="bar-column" [title]="(d.dayOfWeek || '') + ' ' + (d.date | date:'dd/MM/yyyy') + ':\n• ' + d.completedExaminations + ' ca hoàn tất\n• Chờ TB: ' + d.avgWaitingMinutes + ' phút'">
                      <div class="bar-track">
                        @if (d.completedExaminations > 0 || selectedPeriod() !== 'MONTH') {
                          <span class="bar-value mono" [class.bar-value-zero]="d.completedExaminations === 0">
                            {{ d.completedExaminations }}
                          </span>
                        }
                        <div
                          class="bar-fill"
                          [style.height.%]="d.completedExaminations > 0 ? getBarHeightPercent(d.completedExaminations) : 0"
                        ></div>
                      </div>
                      <div class="bar-labels">
                        <span class="bar-dow">{{ formatDayOfWeek(d.dayOfWeek) }}</span>
                        <span class="bar-date mono">{{ d.date | date:'dd/MM' }}</span>
                        <span class="bar-wait mono">
                          @if (d.avgWaitingMinutes > 0) {
                            {{ d.avgWaitingMinutes | number:'1.0-1' }}
                          } @else {
                            -
                          }
                        </span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Phân bổ trạng thái hàng đợi -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Trạng thái hàng đợi</h2>
              <span class="text-muted panel-meta"><span class="mono">{{ data()?.totalTickets }}</span> vé</span>
            </div>
            <div class="panel-body">
              <div class="stack-bar">
                <div class="stack-seg seg-completed" [style.width.%]="getStatusPercent('COMPLETED')"
                     title="Hoàn tất: {{ getStatusCount('COMPLETED') }} vé"></div>
                <div class="stack-seg seg-progress" [style.width.%]="getStatusPercent('IN_PROGRESS')"
                     title="Đang khám: {{ getStatusCount('IN_PROGRESS') }} vé"></div>
                <div class="stack-seg seg-waiting" [style.width.%]="getStatusPercent('WAITING')"
                     title="Đang chờ: {{ getStatusCount('WAITING') }} vé"></div>
                <div class="stack-seg seg-called" [style.width.%]="getStatusPercent('CALLED')"
                     title="Đang gọi: {{ getStatusCount('CALLED') }} vé"></div>
                <div class="stack-seg seg-cancelled" [style.width.%]="getStatusPercent('CANCELLED') + getStatusPercent('SKIPPED')"
                     title="Hủy/nhỡ lượt: {{ getStatusCount('CANCELLED') + getStatusCount('SKIPPED') }} vé"></div>
              </div>

              <table class="legend-table">
                <tbody>
                  <tr>
                    <td><span class="dot seg-completed"></span> Hoàn tất</td>
                    <td class="mono num-col">{{ getStatusCount('COMPLETED') }}</td>
                    <td class="mono num-col text-muted">{{ getStatusPercent('COMPLETED') | number:'1.1-1' }}%</td>
                  </tr>
                  <tr>
                    <td><span class="dot seg-progress"></span> Đang khám</td>
                    <td class="mono num-col">{{ getStatusCount('IN_PROGRESS') }}</td>
                    <td class="mono num-col text-muted">{{ getStatusPercent('IN_PROGRESS') | number:'1.1-1' }}%</td>
                  </tr>
                  <tr>
                    <td><span class="dot seg-waiting"></span> Đang chờ</td>
                    <td class="mono num-col">{{ getStatusCount('WAITING') }}</td>
                    <td class="mono num-col text-muted">{{ getStatusPercent('WAITING') | number:'1.1-1' }}%</td>
                  </tr>
                  <tr>
                    <td><span class="dot seg-called"></span> Đang gọi</td>
                    <td class="mono num-col">{{ getStatusCount('CALLED') }}</td>
                    <td class="mono num-col text-muted">{{ getStatusPercent('CALLED') | number:'1.1-1' }}%</td>
                  </tr>
                  <tr>
                    <td><span class="dot seg-cancelled"></span> Nhỡ lượt / đã hủy</td>
                    <td class="mono num-col">{{ getStatusCount('CANCELLED') + getStatusCount('SKIPPED') }}</td>
                    <td class="mono num-col text-muted">{{ (getStatusPercent('CANCELLED') + getStatusPercent('SKIPPED')) | number:'1.1-1' }}%</td>
                  </tr>
                </tbody>
              </table>

              <div class="ops-note">
                @if ((data()?.avgWaitingMinutes ?? 0) > 25) {
                  Thời gian chờ trung bình vượt 25 phút. Cân nhắc bổ sung bác sĩ hoặc tăng tốc khâu tiếp đón.
                } @else if ((data()?.cancellationRate ?? 0) > 15) {
                  Tỷ lệ hủy lịch hẹn trên 15%. Nên bật nhắc lịch qua email/SMS trước 2 giờ.
                } @else {
                  Thời gian chờ và tỷ lệ hủy đang trong ngưỡng.
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Hiệu suất phòng khám -->
        <div class="panel">
          <div class="panel-header">
            <h2 class="panel-title">Hiệu suất phòng khám</h2>
            <span class="text-muted panel-meta"><span class="mono">{{ data()?.roomStats?.length || 0 }}</span> phòng</span>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 80px;">Phòng</th>
                  <th style="min-width: 220px;">Tên phòng</th>
                  <th style="width: 80px;">Tầng</th>
                  <th style="min-width: 180px;">Bác sĩ phụ trách</th>
                  <th class="num-col">Tổng vé</th>
                  <th class="num-col">Đã khám</th>
                  <th class="num-col">Đang chờ</th>
                  <th class="num-col">Chờ TB</th>
                  <th style="width: 170px;">Tỷ lệ hoàn thành</th>
                </tr>
              </thead>
              <tbody>
                @for (r of data()?.roomStats; track r.roomId) {
                  <tr>
                    <td class="mono text-muted">{{ r.roomNumber }}</td>
                    <td class="room-name">{{ r.roomName }}</td>
                    <td class="mono">{{ r.floor }}</td>
                    <td>{{ r.activeDoctorName }}</td>
                    <td class="mono num-col">{{ r.totalTickets }}</td>
                    <td class="mono num-col">{{ r.completedCount }}</td>
                    <td class="mono num-col" [class.text-muted]="r.waitingCount === 0">{{ r.waitingCount }}</td>
                    <td class="num-col">
                      <span
                        class="status mono"
                        [class.success]="r.avgWaitingMinutes <= 15"
                        [class.warning]="r.avgWaitingMinutes > 15 && r.avgWaitingMinutes <= 30"
                        [class.danger]="r.avgWaitingMinutes > 30"
                      >{{ r.avgWaitingMinutes }} phút</span>
                    </td>
                    <td>
                      <div class="utilization-cell">
                        <div class="util-track">
                          <div class="util-fill" [style.width.%]="r.utilizationRate"></div>
                        </div>
                        <span class="util-percent mono">{{ r.utilizationRate }}%</span>
                      </div>
                    </td>
                  </tr>
                }
                @if (!data()?.roomStats || data()?.roomStats?.length === 0) {
                  <tr>
                    <td colspan="9" class="empty-row">Chưa có dữ liệu phòng khám</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Chọn khoảng thời gian */
    .segmented {
      display: inline-flex;
      height: 36px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: #ffffff;
    }

    .segmented-btn {
      padding: 0 12px;
      border: none;
      border-left: 1px solid var(--border-color);
      background: transparent;
      font: inherit;
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .segmented-btn:first-child { border-left: none; }
    .segmented-btn:hover { background: var(--bg-hover); }

    .segmented-btn.active {
      background: var(--primary-50);
      color: var(--primary-700);
      font-weight: 500;
    }

    /* Chỉ số chính */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-label {
      font-size: 13px;
      color: var(--text-muted);
    }

    .kpi-value-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 600;
      line-height: 1.25;
      color: var(--text-main);
    }

    .kpi-unit {
      font-size: 13px;
      color: var(--text-muted);
    }

    .kpi-value-row .status {
      align-self: center;
      margin-left: auto;
    }

    .kpi-meta {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Lưới biểu đồ */
    .analytics-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .panel-meta { font-size: 13px; }

    .chart-legend {
      display: flex;
      align-items: center;
      gap: 14px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .legend-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: var(--primary-600);
    }

    /* Biểu đồ cột */
    .chart-scroll-wrapper {
      width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      padding-bottom: 6px;
      scrollbar-width: thin;
      scrollbar-color: #cbd5e1 transparent;
    }

    .chart-scroll-wrapper::-webkit-scrollbar {
      height: 6px;
    }

    .chart-scroll-wrapper::-webkit-scrollbar-track {
      background: var(--bg-subtle, #f1f5f9);
      border-radius: 3px;
    }

    .chart-scroll-wrapper::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .chart-scroll-wrapper::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    .bar-chart {
      position: relative;
      display: flex;
      align-items: stretch;
      height: 250px;
      width: 100%;
    }

    .bar-chart.period-month {
      min-width: 960px;
    }

    .chart-empty {
      position: absolute;
      left: 0;
      right: 0;
      top: 35%;
      text-align: center;
      font-size: 13px;
      color: var(--text-muted);
    }

    .bar-column {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      transition: background-color 0.15s ease;
      border-radius: 4px;
    }

    .bar-chart.period-month .bar-column {
      flex: 1 0 32px;
      min-width: 32px;
    }

    .bar-track {
      padding: 0 2px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      border-bottom: 1px solid var(--border-strong, #cbd5e1);
    }

    .bar-value {
      font-size: 12px;
      color: var(--text-secondary);
      margin-bottom: 4px;
      font-weight: 600;
    }

    .bar-value-zero {
      opacity: 0.35;
      font-weight: normal;
    }

    .bar-chart.period-month .bar-value {
      font-size: 11px;
    }

    .bar-fill {
      width: 100%;
      max-width: 32px;
      background: var(--primary-600, #0284c7);
      border-radius: 4px 4px 0 0;
      transition: height 0.15s ease;
    }

    .bar-chart.period-month .bar-fill {
      max-width: 16px;
    }

    .bar-column:hover {
      background: rgba(2, 132, 199, 0.05);
    }

    .bar-column:hover .bar-fill {
      background: var(--primary-700, #0369a1);
    }

    .bar-labels {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 6px;
      line-height: 1.35;
    }

    .bar-dow {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      font-weight: 500;
    }

    .bar-chart.period-month .bar-dow {
      font-size: 11px;
      color: var(--text-muted);
    }

    .bar-date {
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .bar-chart.period-month .bar-date {
      font-size: 10px;
    }

    .bar-wait {
      margin-top: 3px;
      font-size: 11px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .bar-chart.period-month .bar-wait {
      font-size: 10px;
      margin-top: 2px;
    }

    /* Phân bổ trạng thái */
    .stack-bar {
      display: flex;
      gap: 2px;
      height: 12px;
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--bg-subtle);
      margin-bottom: 12px;
    }

    .stack-seg { height: 100%; }

    .seg-completed { background: #1f5fb4; }
    .seg-progress { background: #8db3e4; }
    .seg-waiting { background: #d99a1e; }
    .seg-called { background: #5b6578; }
    .seg-cancelled { background: #c4c9d2; }

    .legend-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .legend-table td {
      padding: 6px 0;
      border-bottom: 1px solid var(--border-color);
      color: var(--text-main);
    }

    .legend-table tr:last-child td { border-bottom: none; }

    .legend-table .num-col {
      width: 64px;
      text-align: right;
    }

    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-right: 6px;
    }

    .ops-note {
      margin-top: 12px;
      padding: 10px 12px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.45;
    }

    /* Bảng phòng khám */
    .table-responsive { overflow-x: auto; }

    .data-table td.text-muted { color: var(--text-muted); }
    .data-table td.mono { white-space: nowrap; }

    .data-table .num-col {
      text-align: right;
      white-space: nowrap;
    }

    .room-name { font-weight: 500; }

    .utilization-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .util-track {
      flex: 1;
      height: 6px;
      background: var(--bg-subtle);
      border-radius: 3px;
      overflow: hidden;
    }

    .util-fill {
      height: 100%;
      background: var(--primary-600);
      border-radius: 3px;
    }

    .util-percent {
      min-width: 36px;
      text-align: right;
      font-size: 13px;
    }

    .empty-row {
      text-align: center;
      color: var(--text-muted);
      padding: 24px 12px;
    }

    .loading-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .spin { animation: spin 0.8s linear infinite; }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 1080px) {
      .analytics-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 640px) {
      .page { padding: 16px; }
      .kpi-grid { grid-template-columns: 1fr; }
    }

    @media print {
      .page-actions { display: none !important; }
      .page { padding: 0; max-width: 100%; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly selectedPeriod = signal<'TODAY' | 'WEEK' | 'MONTH'>('WEEK');
  readonly isLoading = signal(false);
  readonly data = signal<DashboardOverview | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  changePeriod(p: 'TODAY' | 'WEEK' | 'MONTH'): void {
    this.selectedPeriod.set(p);
    this.loadData();
    if (p === 'MONTH') {
      setTimeout(() => {
        const el = document.querySelector('.chart-scroll-wrapper');
        if (el) {
          el.scrollLeft = el.scrollWidth;
        }
      }, 150);
    }
  }

  formatDayOfWeek(dow: string | undefined): string {
    if (!dow) return '';
    if (this.selectedPeriod() !== 'MONTH') {
      return dow;
    }
    const lower = dow.toLowerCase().trim();
    if (lower.includes('chủ') || lower.includes('cn')) return 'CN';
    if (lower.includes('2')) return 'T2';
    if (lower.includes('3')) return 'T3';
    if (lower.includes('4')) return 'T4';
    if (lower.includes('5')) return 'T5';
    if (lower.includes('6')) return 'T6';
    if (lower.includes('7')) return 'T7';
    return dow.substring(0, 2);
  }

  loadData(): void {
    this.isLoading.set(true);
    this.dashboardService.getOverview(this.selectedPeriod()).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.data.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  triggerPrint(): void {
    window.print();
  }

  // Helper methods for metrics
  getWaitTimeCardClass(): string {
    const val = this.data()?.avgWaitingMinutes ?? 0;
    if (val <= 15) return 'card-emerald';
    if (val <= 30) return 'card-amber';
    return 'card-rose';
  }

  getWaitTimeIconClass(): string {
    const val = this.data()?.avgWaitingMinutes ?? 0;
    if (val <= 15) return 'bg-emerald-subtle text-emerald';
    if (val <= 30) return 'bg-amber-subtle text-amber';
    return 'bg-rose-subtle text-rose';
  }

  getWaitTimeBadgeClass(): string {
    const val = this.data()?.avgWaitingMinutes ?? 0;
    if (val <= 15) return 'badge-success';
    if (val <= 30) return 'badge-warning';
    return 'badge-danger';
  }

  getWaitTimeBadgeIcon(): string {
    const val = this.data()?.avgWaitingMinutes ?? 0;
    if (val <= 15) return 'bi-lightning-charge-fill';
    if (val <= 30) return 'bi-check-circle-fill';
    return 'bi-exclamation-triangle-fill';
  }

  getWaitTimeAssessmentText(): string {
    const val = this.data()?.avgWaitingMinutes ?? 0;
    if (val <= 15) return 'Tối ưu nhanh (≤15p)';
    if (val <= 30) return 'Chuẩn y tế (15-30p)';
    return 'Cần giảm tải (>30p)';
  }

  getStatusCount(status: string): number {
    return this.data()?.statusDistribution?.[status] ?? 0;
  }

  getStatusPercent(status: string): number {
    const total = this.data()?.totalTickets ?? 0;
    if (total === 0) return 0;
    const count = this.getStatusCount(status);
    return (count * 100) / total;
  }

  getBarHeightPercent(count: number): number {
    const list = this.data()?.dailyStats ?? [];
    if (list.length === 0) return 10;
    const max = Math.max(...list.map(d => d.completedExaminations), 1);
    const pct = Math.round((count / max) * 100);
    return Math.max(pct, 12); // minimum height so it's visible
  }
}
