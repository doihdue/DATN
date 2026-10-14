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
    <div class="dashboard-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="live-dot"></span> BẢNG ĐIỀU KHIỂN TRUNG TÂM
          </div>
          <h1 class="page-title">
            <i class="bi bi-speedometer2 text-primary"></i> Dashboard
          </h1>
          <p class="page-subtitle">
            Tổng quan tình hình tiếp đón, hàng đợi khám chữa bệnh và hiệu suất phòng khám thời gian thực
          </p>
        </div>

        <div class="header-actions">
          <!-- Period Selector -->
          <div class="period-toggle-group">
            <button
              class="period-btn"
              [class.active]="selectedPeriod() === 'TODAY'"
              (click)="changePeriod('TODAY')"
            >
              Hôm nay
            </button>
            <button
              class="period-btn"
              [class.active]="selectedPeriod() === 'WEEK'"
              (click)="changePeriod('WEEK')"
            >
              7 ngày qua
            </button>
            <button
              class="period-btn"
              [class.active]="selectedPeriod() === 'MONTH'"
              (click)="changePeriod('MONTH')"
            >
              30 ngày qua
            </button>
          </div>

          <button class="btn btn-outline" (click)="loadData()" [disabled]="isLoading()" title="Tải lại số liệu">
            <i class="bi bi-arrow-clockwise" [class.spin]="isLoading()"></i> Làm mới
          </button>

          <button class="btn btn-primary" (click)="triggerPrint()" title="In / Xuất PDF báo cáo">
            <i class="bi bi-printer"></i> In Báo Cáo
          </button>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang phân tích và tổng hợp số liệu thống kê y tế...</p>
        </div>
      } @else if (data()) {
        <!-- 4 Hero KPI Cards -->
        <div class="kpi-grid">
          <!-- Card 1: Số Lượt Khám -->
          <div class="kpi-card card-blue">
            <div class="kpi-icon-wrap bg-blue-subtle text-blue">
              <i class="bi bi-clipboard2-check-fill"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">LƯỢT KHÁM HOÀN TẤT</span>
              <div class="kpi-value-row">
                <span class="kpi-value num">{{ data()?.totalExaminationsCompleted }}</span>
                <span class="kpi-unit">/ {{ data()?.totalTickets }} vé</span>
              </div>
              <div class="kpi-meta">
                <span class="badge badge-success">
                  <i class="bi bi-check-circle-fill"></i> Hôm nay: {{ data()?.todayCompleted }} ca xong
                </span>
                <span class="meta-note">Tổng cấp hôm nay: {{ data()?.todayTickets }}</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Thời Gian Chờ Trung Bình -->
          <div class="kpi-card" [ngClass]="getWaitTimeCardClass()">
            <div class="kpi-icon-wrap" [ngClass]="getWaitTimeIconClass()">
              <i class="bi bi-hourglass-split"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">THỜI GIAN CHỜ TRUNG BÌNH</span>
              <div class="kpi-value-row">
                <span class="kpi-value num">{{ data()?.avgWaitingMinutes }}</span>
                <span class="kpi-unit">phút / người</span>
              </div>
              <div class="kpi-meta">
                <span class="badge" [ngClass]="getWaitTimeBadgeClass()">
                  <i class="bi" [ngClass]="getWaitTimeBadgeIcon()"></i> {{ getWaitTimeAssessmentText() }}
                </span>
                <span class="meta-note">Tiêu chuẩn: ≤ 20 phút</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Tỷ Lệ Huỷ Lịch Hẹn -->
          <div class="kpi-card card-rose">
            <div class="kpi-icon-wrap bg-rose-subtle text-rose">
              <i class="bi bi-calendar-x-fill"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">TỶ LỆ HUỶ LỊCH HẸN</span>
              <div class="kpi-value-row">
                <span class="kpi-value num text-danger">{{ data()?.cancellationRate }}%</span>
                <span class="kpi-unit">tỷ lệ huỷ</span>
              </div>
              <div class="kpi-meta">
                <span class="badge badge-danger">
                  <i class="bi bi-x-circle"></i> {{ data()?.cancelledAppointments }} lịch bị huỷ
                </span>
                <span class="meta-note">Tổng: {{ data()?.totalAppointments }} lịch hẹn</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Tổng Lịch Hẹn Đã Đặt -->
          <div class="kpi-card card-purple">
            <div class="kpi-icon-wrap bg-purple-subtle text-purple">
              <i class="bi bi-calendar-check-fill"></i>
            </div>
            <div class="kpi-info">
              <span class="kpi-label">TỔNG LỊCH HẸN KHÁM</span>
              <div class="kpi-value-row">
                <span class="kpi-value num">{{ data()?.totalAppointments }}</span>
                <span class="kpi-unit">cuộc hẹn</span>
              </div>
              <div class="kpi-meta">
                <span class="badge badge-info">
                  <i class="bi bi-clock-history"></i> {{ data()?.confirmedAppointments }} đã xác nhận
                </span>
                <span class="meta-note">{{ data()?.completedAppointments }} đã hoàn tất</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Charts and Breakdown Grid -->
        <div class="analytics-grid">
          <!-- Left: Daily Volume & Wait Chart -->
          <div class="card-box chart-card">
            <div class="card-box-header">
              <div class="card-box-title">
                <i class="bi bi-bar-chart-line-fill text-primary"></i>
                Xu Hướng Lượt Khám &amp; Thời Gian Chờ Theo Ngày
              </div>
              <span class="date-range-badge">
                {{ data()?.fromDate | date:'dd/MM' }} - {{ data()?.toDate | date:'dd/MM/yyyy' }}
              </span>
            </div>
            <div class="card-box-body">
              <div class="chart-legend">
                <span class="legend-item"><span class="legend-box bar-color"></span> Số ca đã khám hoàn tất</span>
                <span class="legend-item"><span class="legend-box wait-color"></span> Thời gian chờ TB (phút)</span>
              </div>

              <!-- CSS / SVG Bar Chart Representation -->
              <div class="bar-chart-container">
                @for (d of data()?.dailyStats; track d.date) {
                  <div class="bar-column">
                    <div class="bar-metric-top">
                      <span class="wait-pill" title="Chờ TB: {{ d.avgWaitingMinutes }} phút">
                        {{ d.avgWaitingMinutes }}p
                      </span>
                    </div>

                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [style.height.%]="getBarHeightPercent(d.completedExaminations)"
                        [title]="d.completedExaminations + ' ca hoàn tất'"
                      >
                        <span class="bar-val-inside">{{ d.completedExaminations }}</span>
                      </div>
                    </div>

                    <div class="bar-label-group">
                      <span class="bar-dow">{{ d.dayOfWeek }}</span>
                      <span class="bar-date">{{ d.date | date:'dd/MM' }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Right: Queue Status Distribution -->
          <div class="card-box distribution-card">
            <div class="card-box-header">
              <div class="card-box-title">
                <i class="bi bi-pie-chart-fill text-primary"></i>
                Phân Bổ Trạng Thái Hàng Đợi ({{ data()?.totalTickets }} vé)
              </div>
            </div>
            <div class="card-box-body">
              <!-- Visual Multi-segment Progress Bar -->
              <div class="multi-progress-bar">
                <div
                  class="progress-seg seg-completed"
                  [style.width.%]="getStatusPercent('COMPLETED')"
                  title="Hoàn tất: {{ getStatusCount('COMPLETED') }} vé"
                ></div>
                <div
                  class="progress-seg seg-progress"
                  [style.width.%]="getStatusPercent('IN_PROGRESS')"
                  title="Đang khám: {{ getStatusCount('IN_PROGRESS') }} vé"
                ></div>
                <div
                  class="progress-seg seg-waiting"
                  [style.width.%]="getStatusPercent('WAITING')"
                  title="Đang chờ: {{ getStatusCount('WAITING') }} vé"
                ></div>
                <div
                  class="progress-seg seg-called"
                  [style.width.%]="getStatusPercent('CALLED')"
                  title="Đang gọi: {{ getStatusCount('CALLED') }} vé"
                ></div>
                <div
                  class="progress-seg seg-cancelled"
                  [style.width.%]="getStatusPercent('CANCELLED') + getStatusPercent('SKIPPED')"
                  title="Huỷ/Nhỡ: {{ getStatusCount('CANCELLED') + getStatusCount('SKIPPED') }} vé"
                ></div>
              </div>

              <!-- Status Breakdown List -->
              <div class="status-legend-list">
                <div class="status-legend-item">
                  <div class="item-left">
                    <span class="dot dot-completed"></span>
                    <span class="status-name">Khám hoàn tất (COMPLETED)</span>
                  </div>
                  <div class="item-right">
                    <strong>{{ getStatusCount('COMPLETED') }}</strong> ca
                    <span class="percent-tag">({{ getStatusPercent('COMPLETED') | number:'1.1-1' }}%)</span>
                  </div>
                </div>

                <div class="status-legend-item">
                  <div class="item-left">
                    <span class="dot dot-progress"></span>
                    <span class="status-name">Đang trong phòng khám (IN_PROGRESS)</span>
                  </div>
                  <div class="item-right">
                    <strong>{{ getStatusCount('IN_PROGRESS') }}</strong> ca
                    <span class="percent-tag">({{ getStatusPercent('IN_PROGRESS') | number:'1.1-1' }}%)</span>
                  </div>
                </div>

                <div class="status-legend-item">
                  <div class="item-left">
                    <span class="dot dot-waiting"></span>
                    <span class="status-name">Đang chờ gọi tên (WAITING)</span>
                  </div>
                  <div class="item-right">
                    <strong>{{ getStatusCount('WAITING') }}</strong> ca
                    <span class="percent-tag">({{ getStatusPercent('WAITING') | number:'1.1-1' }}%)</span>
                  </div>
                </div>

                <div class="status-legend-item">
                  <div class="item-left">
                    <span class="dot dot-called"></span>
                    <span class="status-name">Đang mời vào (CALLED)</span>
                  </div>
                  <div class="item-right">
                    <strong>{{ getStatusCount('CALLED') }}</strong> ca
                    <span class="percent-tag">({{ getStatusPercent('CALLED') | number:'1.1-1' }}%)</span>
                  </div>
                </div>

                <div class="status-legend-item">
                  <div class="item-left">
                    <span class="dot dot-cancelled"></span>
                    <span class="status-name">Nhỡ lượt hoặc Đã huỷ (SKIPPED / CANCELLED)</span>
                  </div>
                  <div class="item-right">
                    <strong>{{ getStatusCount('CANCELLED') + getStatusCount('SKIPPED') }}</strong> ca
                    <span class="percent-tag">({{ (getStatusPercent('CANCELLED') + getStatusPercent('SKIPPED')) | number:'1.1-1' }}%)</span>
                  </div>
                </div>
              </div>

              <!-- Recommendation Note -->
              <div class="kpi-recommendation-box">
                <i class="bi bi-lightbulb-fill text-warning"></i>
                <div class="rec-text">
                  <strong>Khuyến nghị vận hành:</strong>
                  @if ((data()?.avgWaitingMinutes ?? 0) > 25) {
                    Thời gian chờ đang cao hơn mức khuyến nghị (>25p). Cần điều phối thêm bác sĩ hoặc tăng tốc khâu tiếp đón tại sảnh.
                  } @else if ((data()?.cancellationRate ?? 0) > 15) {
                    Tỷ lệ huỷ lịch hẹn ở mức cao (>15%). Nên kích hoạt hệ thống nhắc lịch hẹn qua Email/SMS trước 2 tiếng.
                  } @else {
                    Hiệu suất vận hành phòng khám đang ở trạng thái tốt. Thời gian chờ và tỷ lệ huỷ duy trì trong ngưỡng an toàn.
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Room Performance Table -->
        <div class="card-box mt-4">
          <div class="card-box-header">
            <div class="card-box-title">
              <i class="bi bi-door-open-fill text-primary"></i>
              Hiệu Suất Tiếp Nhận &amp; Thời Gian Chờ Từng Phòng Khám
            </div>
            <span class="badge badge-primary">
              {{ data()?.roomStats?.length || 0 }} phòng khám hoạt động
            </span>
          </div>
          <div class="card-box-body p-0">
            <div class="table-responsive">
              <table class="table data-table">
                <thead>
                  <tr>
                    <th>Mã &amp; Phòng Khám</th>
                    <th>Vị Trí</th>
                    <th>Bác Sĩ Phụ Trách</th>
                    <th class="text-center">Tổng Vé Cấp</th>
                    <th class="text-center">Đã Khám Xong</th>
                    <th class="text-center">Đang Chờ Hôm Nay</th>
                    <th class="text-center">Thời Gian Chờ TB</th>
                    <th>Tỷ Lệ Hoàn Thành</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of data()?.roomStats; track r.roomId) {
                    <tr>
                      <td>
                        <div class="room-name-cell">
                          <span class="room-badge">{{ r.roomNumber }}</span>
                          <span class="room-fullname font-bold">{{ r.roomName }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="text-muted">Tầng {{ r.floor }}</span>
                      </td>
                      <td>
                        <div class="doc-cell">
                          <i class="bi bi-person-badge text-primary"></i>
                          <span>{{ r.activeDoctorName }}</span>
                        </div>
                      </td>
                      <td class="text-center font-bold">
                        {{ r.totalTickets }}
                      </td>
                      <td class="text-center font-bold text-success">
                        {{ r.completedCount }}
                      </td>
                      <td class="text-center">
                        @if (r.waitingCount > 0) {
                          <span class="badge badge-warning">{{ r.waitingCount }} ca</span>
                        } @else {
                          <span class="badge badge-normal">0</span>
                        }
                      </td>
                      <td class="text-center">
                        <span
                          class="wait-time-tag"
                          [class.fast]="r.avgWaitingMinutes <= 15"
                          [class.medium]="r.avgWaitingMinutes > 15 && r.avgWaitingMinutes <= 30"
                          [class.slow]="r.avgWaitingMinutes > 30"
                        >
                          {{ r.avgWaitingMinutes }} phút
                        </span>
                      </td>
                      <td>
                        <div class="utilization-cell">
                          <div class="progress-bar-wrap">
                            <div
                              class="progress-bar-fill"
                              [style.width.%]="r.utilizationRate"
                              [class.fill-high]="r.utilizationRate >= 70"
                              [class.fill-mid]="r.utilizationRate >= 40 && r.utilizationRate < 70"
                              [class.fill-low]="r.utilizationRate < 40"
                            ></div>
                          </div>
                          <span class="util-percent font-bold">{{ r.utilizationRate }}%</span>
                        </div>
                      </td>
                    </tr>
                  }
                  @if (!data()?.roomStats || data()?.roomStats?.length === 0) {
                    <tr>
                      <td colspan="8" class="text-center py-4 text-muted">
                        Chưa có dữ liệu phòng khám
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 1.5rem 1.5rem 3.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background-color: var(--primary-50);
      color: var(--primary-800);
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.4rem;
      border: 1px solid var(--primary-200);
      letter-spacing: 0.04em;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background-color: var(--success-solid);
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.5); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .page-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.25rem;
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 0.925rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .period-toggle-group {
      display: flex;
      background: #f1f5f9;
      border-radius: var(--radius-sm);
      padding: 3px;
      border: 1px solid var(--border-color);
    }

    .period-btn {
      padding: 0.4rem 0.85rem;
      border: none;
      background: transparent;
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .period-btn:hover {
      color: var(--text-main);
    }

    .period-btn.active {
      background: #ffffff;
      color: var(--primary-700);
      font-weight: 700;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    /* KPI Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.75rem;
    }

    .kpi-card {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      padding: 1.25rem;
      display: flex;
      align-items: flex-start;
      gap: 1.15rem;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    .kpi-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .bg-blue-subtle { background: #e0f2fe; }
    .text-blue { color: #0284c7; }

    .bg-emerald-subtle { background: #dcfce7; }
    .text-emerald { color: #16a34a; }

    .bg-amber-subtle { background: #fef3c7; }
    .text-amber { color: #d97706; }

    .bg-rose-subtle { background: #ffe4e6; }
    .text-rose { color: #e11d48; }

    .bg-purple-subtle { background: #ede9fe; }
    .text-purple { color: #7c3aed; }

    .kpi-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .kpi-label {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .kpi-value-row {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      margin-bottom: 0.5rem;
    }

    .kpi-value {
      font-size: 2rem;
      font-weight: 900;
      color: var(--text-main);
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .kpi-unit {
      font-size: 0.825rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .kpi-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .meta-note {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Analytics Grid */
    .analytics-grid {
      display: grid;
      grid-template-columns: 1.6fr 1.2fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 1080px) {
      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }

    .card-box {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .card-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
    }

    .card-box-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-box-body {
      padding: 1.25rem;
    }

    .date-range-badge {
      font-size: 0.775rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      background: #e2e8f0;
      color: #334155;
      border-radius: var(--radius-xs);
    }

    /* Bar Chart Representation */
    .chart-legend {
      display: flex;
      gap: 1.25rem;
      margin-bottom: 1.25rem;
      font-size: 0.8rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .legend-box {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .bar-color { background-color: var(--primary-600); }
    .wait-color { background-color: #f59e0b; }

    .bar-chart-container {
      display: flex;
      align-items: flex-end;
      gap: 0.85rem;
      height: 220px;
      padding-top: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .bar-metric-top {
      height: 24px;
      display: flex;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .wait-pill {
      font-size: 0.7rem;
      font-weight: 800;
      background: #fef3c7;
      color: #92400e;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      border: 1px solid #fde68a;
    }

    .bar-track {
      flex: 1;
      width: 100%;
      max-width: 44px;
      display: flex;
      align-items: flex-end;
      background: #f8fafc;
      border-radius: 4px 4px 0 0;
    }

    .bar-fill {
      width: 100%;
      background: linear-gradient(180deg, var(--primary-500) 0%, var(--primary-700) 100%);
      border-radius: 4px 4px 0 0;
      min-height: 10px;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 0.3rem;
      transition: height 0.3s ease;
      position: relative;
    }

    .bar-val-inside {
      font-size: 0.725rem;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .bar-label-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 0.5rem;
    }

    .bar-dow {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .bar-date {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* Distribution Progress Bar */
    .multi-progress-bar {
      height: 16px;
      width: 100%;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      display: flex;
      overflow: hidden;
      margin-bottom: 1.25rem;
    }

    .progress-seg {
      height: 100%;
      transition: width 0.3s ease;
    }

    .seg-completed { background: #10b981; }
    .seg-progress { background: #3b82f6; }
    .seg-waiting { background: #f59e0b; }
    .seg-called { background: #06b6d4; }
    .seg-cancelled { background: #ef4444; }

    .status-legend-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .status-legend-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.5rem;
      border-radius: var(--radius-xs);
      font-size: 0.825rem;
    }

    .status-legend-item:hover {
      background: #f8fafc;
    }

    .item-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .dot-completed { background: #10b981; }
    .dot-progress { background: #3b82f6; }
    .dot-waiting { background: #f59e0b; }
    .dot-called { background: #06b6d4; }
    .dot-cancelled { background: #ef4444; }

    .percent-tag {
      color: var(--text-muted);
      font-size: 0.775rem;
      margin-left: 0.25rem;
    }

    .kpi-recommendation-box {
      margin-top: 1.25rem;
      padding: 0.85rem 1rem;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      font-size: 0.8rem;
      color: #92400e;
      line-height: 1.45;
    }

    /* Table Styles */
    .table-responsive {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .data-table th {
      background: #f8fafc;
      color: var(--text-secondary);
      font-weight: 700;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
      font-size: 0.8rem;
    }

    .data-table td {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }

    .room-name-cell {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .room-badge {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--primary-800);
      background: var(--primary-50);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
      border: 1px solid var(--primary-200);
    }

    .doc-cell {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: var(--text-main);
    }

    .wait-time-tag {
      font-size: 0.8rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
    }

    .wait-time-tag.fast {
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }

    .wait-time-tag.medium {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .wait-time-tag.slow {
      background: #fee2e2;
      color: #b91c1c;
      border: 1px solid #fecaca;
    }

    .utilization-cell {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 130px;
    }

    .progress-bar-wrap {
      flex: 1;
      height: 8px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.3s ease;
    }

    .fill-high { background-color: #10b981; }
    .fill-mid { background-color: #f59e0b; }
    .fill-low { background-color: #94a3b8; }

    .util-percent {
      font-size: 0.8rem;
      min-width: 38px;
      text-align: right;
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .loading-state {
      padding: 4rem 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--text-muted);
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--border-color);
      border-top-color: var(--primary-600);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @media print {
      .header-actions, .period-toggle-group {
        display: none !important;
      }
      .dashboard-page {
        padding: 0;
        max-width: 100%;
      }
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
