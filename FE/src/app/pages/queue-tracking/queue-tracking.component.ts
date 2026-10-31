import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { MedicalRecordService } from '../../services/medical-record.service';
import { CheckInRequest, MyTicketStatus } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';
import { AuthService } from '../../services/auth.service';
import { toIsoDate } from '../../utils/date.utils';

@Component({
  selector: 'app-queue-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tracking-page">
      <!-- Header -->
      <div class="tracking-header">
        <div class="header-badge">
          <i class="bi bi-broadcast"></i> Theo Dõi Hàng Đợi Số
        </div>
        <h1 class="page-title">
          {{ activeMode === 'LOOKUP' ? 'Phiếu Khám Của Tôi & Hàng Đợi' : 'Đăng Ký Lấy Số Khám Trực Tuyến' }}
        </h1>
        <p class="page-subtitle">
          {{ activeMode === 'LOOKUP'
            ? 'Theo dõi số thứ tự của bạn, dự đoán thời gian chờ và nhận thông báo khi đến lượt khám'
            : 'Điền thông tin bên dưới để được hệ thống xếp hàng tự động trước khi tới phòng khám' }}
        </p>
      </div>

      <!-- MODE 1: TRA CỨU / PHIẾU CỦA TÔI -->
      @if (activeMode === 'LOOKUP') {
        @if (loadingSearch()) {
          <div class="search-loading-card">
            <div class="spinner-lg"></div>
            <p>Đang tìm kiếm thông tin phiếu khám của bạn...</p>
          </div>
        } @else if (ticketResult()) {
          <div class="ticket-result-card" [ngClass]="getCardClassByStatus(ticketResult()!.status)">
            <!-- Card Header: Medical Pass Style -->
            <div class="pass-header">
              <div class="pass-header-top">
                <div class="clinic-brand">
                  <div class="brand-badge-icon">
                    <i class="bi bi-hospital"></i>
                  </div>
                  <div class="brand-meta">
                    <span class="brand-sub">PHIẾU KHÁM BỆNH ĐIỆN TỬ</span>
                    <span class="brand-main">HỆ THỐNG ĐIỀU PHỐI KHÁM THÔNG MINH</span>
                  </div>
                </div>

                <div class="live-status-pill" [ngClass]="'status-' + ticketResult()!.status.toLowerCase()">
                  <span class="pulse-indicator"></span>
                  <i class="bi" [ngClass]="getStatusIcon(ticketResult()!.status)"></i>
                  <span>{{ getStatusMessage(ticketResult()!.status) }}</span>
                </div>
              </div>

              <!-- Pass Hero: Ticket Number & Patient summary -->
              <div class="pass-hero-row">
                <div class="hero-ticket-box">
                  <span class="ticket-label">SỐ THỨ TỰ CỦA BẠN</span>
                  <div class="ticket-display-number">{{ ticketResult()!.ticketNumber }}</div>
                </div>

                <div class="hero-patient-box">
                  <div class="patient-pill">
                    <div class="patient-avatar-circle">
                      <i class="bi bi-person-fill"></i>
                    </div>
                    <div class="patient-info">
                      <span class="lbl">Bệnh nhân</span>
                      <strong class="name">{{ ticketResult()!.patientName }}</strong>
                    </div>
                  </div>
                  <div class="time-meta-row">
                    <span class="meta-tag">
                      <i class="bi bi-clock-history"></i> {{ formatCheckInTime(ticketResult()!.checkInTime) }}
                    </span>
                    <span class="meta-tag">
                      <i class="bi bi-calendar3"></i> {{ formatTicketDate(ticketResult()!.ticketDate) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Visual Journey Stepper (4 steps) -->
            <div class="journey-stepper-wrap">
              <div class="stepper-item" [ngClass]="getStepState(1, ticketResult()!.status)">
                <div class="step-circle">
                  @if (getStepState(1, ticketResult()!.status) === 'done') {
                    <i class="bi bi-check-lg"></i>
                  } @else {
                    <span>1</span>
                  }
                </div>
                <div class="step-label">
                  <span class="step-name">Lấy số</span>
                  <span class="step-desc">Thành công</span>
                </div>
              </div>

              <div class="stepper-line" [class.active]="getStepState(2, ticketResult()!.status) !== 'waiting'"></div>

              <div class="stepper-item" [ngClass]="getStepState(2, ticketResult()!.status)">
                <div class="step-circle">
                  @if (getStepState(2, ticketResult()!.status) === 'done') {
                    <i class="bi bi-check-lg"></i>
                  } @else {
                    <span>2</span>
                  }
                </div>
                <div class="step-label">
                  <span class="step-name">Chờ gọi lượt</span>
                  <span class="step-desc">{{ ticketResult()!.status === 'CALLED' ? 'Đã gọi!' : 'Hàng đợi' }}</span>
                </div>
              </div>

              <div class="stepper-line" [class.active]="getStepState(3, ticketResult()!.status) !== 'waiting'"></div>

              <div class="stepper-item" [ngClass]="getStepState(3, ticketResult()!.status)">
                <div class="step-circle">
                  @if (getStepState(3, ticketResult()!.status) === 'done') {
                    <i class="bi bi-check-lg"></i>
                  } @else {
                    <span>3</span>
                  }
                </div>
                <div class="step-label">
                  <span class="step-name">Bác sĩ khám</span>
                  <span class="step-desc">{{ ticketResult()!.status === 'IN_PROGRESS' ? 'Đang khám' : 'Phòng khám' }}</span>
                </div>
              </div>

              <div class="stepper-line" [class.active]="getStepState(4, ticketResult()!.status) !== 'waiting'"></div>

              <div class="stepper-item" [ngClass]="getStepState(4, ticketResult()!.status)">
                <div class="step-circle">
                  @if (getStepState(4, ticketResult()!.status) === 'done') {
                    <i class="bi bi-check-lg"></i>
                  } @else {
                    <span>4</span>
                  }
                </div>
                <div class="step-label">
                  <span class="step-name">Hoàn tất</span>
                  <span class="step-desc">Đơn thuốc</span>
                </div>
              </div>
            </div>

            <!-- Dynamic Real-time Status Callout -->
            <div class="status-callout-container">
              @if (ticketResult()!.status === 'IN_PROGRESS') {
                <div class="callout-card in-progress-card">
                  <div class="callout-icon-box heartbeat-pulse">
                    <i class="bi bi-heart-pulse-fill"></i>
                  </div>
                  <div class="callout-details">
                    <h3 class="callout-title">BÁC SĨ ĐANG TIẾN HÀNH THĂM KHÁM</h3>
                    <p class="callout-desc">
                      Bạn đang trong quá trình khám tại phòng <strong>{{ ticketResult()!.roomNumber }} - {{ ticketResult()!.roomName }}</strong>.
                      Vui lòng trao đổi kỹ với bác sĩ các dấu hiệu và tiền sử bệnh lý.
                    </p>
                  </div>
                </div>
              }

              @if (ticketResult()!.status === 'CALLED') {
                <div class="callout-card called-card">
                  <div class="callout-icon-box bell-ring">
                    <i class="bi bi-bell-fill"></i>
                  </div>
                  <div class="callout-details">
                    <h3 class="callout-title">ĐÃ ĐẾN LƯỢT KHÁM CỦA BẠN!</h3>
                    <p class="callout-desc">
                      Vui lòng tiến vào <strong>{{ ticketResult()!.roomNumber }} - {{ ticketResult()!.roomName }}</strong> (Tầng {{ ticketResult()!.floor }}) ngay bây giờ.
                    </p>
                  </div>
                </div>
              }

              @if (ticketResult()!.status === 'WAITING') {
                <div class="queue-metrics-container">
                  <div class="q-metric-card">
                    <div class="q-metric-icon"><i class="bi bi-sort-numeric-down"></i></div>
                    <div class="q-metric-val">#{{ ticketResult()!.positionInQueue }}</div>
                    <div class="q-metric-label">Vị trí hàng đợi</div>
                  </div>
                  <div class="q-metric-card">
                    <div class="q-metric-icon"><i class="bi bi-people-fill"></i></div>
                    <div class="q-metric-val">{{ ticketResult()!.waitingAheadCount }}</div>
                    <div class="q-metric-label">Người chờ trước bạn</div>
                  </div>
                  <div class="q-metric-card highlight">
                    <div class="q-metric-icon"><i class="bi bi-stopwatch-fill"></i></div>
                    <div class="q-metric-val">~{{ ticketResult()!.estimatedWaitingMinutes }}'</div>
                    <div class="q-metric-label">Ước tính chờ</div>
                  </div>
                </div>
              }

              @if (ticketResult()!.status === 'COMPLETED') {
                <div class="callout-card completed-card">
                  <div class="callout-icon-box">
                    <i class="bi bi-check-circle-fill"></i>
                  </div>
                  <div class="callout-details">
                    <h3 class="callout-title">LƯỢT KHÁM ĐÃ HOÀN TẤT</h3>
                    <p class="callout-desc">
                      Bác sĩ đã hoàn tất kết luận thăm khám và đơn thuốc. Bạn có thể tải đơn thuốc điện tử hoặc đến quầy lấy thuốc theo hướng dẫn.
                    </p>
                  </div>
                </div>
              }
            </div>

            <!-- Clinical Information Grid (Modern 2x2 Tiles) -->
            <div class="clinic-info-grid">
              <div class="clinic-tile">
                <div class="tile-icon-box icon-room">
                  <i class="bi bi-door-open-fill"></i>
                </div>
                <div class="tile-content">
                  <span class="tile-caption">Phòng khám tiếp nhận</span>
                  <div class="tile-main text-primary-dark">
                    {{ ticketResult()!.roomNumber }} - {{ ticketResult()!.roomName }}
                  </div>
                  <div class="tile-badge-sub">Khu vực: Tầng {{ ticketResult()!.floor }}</div>
                </div>
              </div>

              <div class="clinic-tile">
                <div class="tile-icon-box icon-doctor">
                  <i class="bi bi-person-badge-fill"></i>
                </div>
                <div class="tile-content">
                  <span class="tile-caption">Bác sĩ phụ trách</span>
                  <div class="tile-main">
                    {{ ticketResult()!.doctorName || 'Bác sĩ trực tiếp nhận' }}
                  </div>
                  <div class="tile-badge-sub">Khoa: {{ ticketResult()!.specialtyName || 'Khám bệnh đa khoa' }}</div>
                </div>
              </div>

              <div class="clinic-tile">
                <div class="tile-icon-box icon-time">
                  <i class="bi bi-clock-history"></i>
                </div>
                <div class="tile-content">
                  <span class="tile-caption">Thời gian lấy số</span>
                  <div class="tile-main">
                    {{ formatCheckInTime(ticketResult()!.checkInTime) }}
                  </div>
                  <div class="tile-badge-sub">Ngày {{ formatTicketDate(ticketResult()!.ticketDate) }}</div>
                </div>
              </div>

              <div class="clinic-tile">
                <div class="tile-icon-box icon-priority">
                  <i class="bi bi-shield-check"></i>
                </div>
                <div class="tile-content">
                  <span class="tile-caption">Hình thức tiếp nhận</span>
                  <div class="tile-main">
                    {{ ticketResult()!.priorityScore ? 'Khám Ưu Tiên' : 'Khám Tiêu Chuẩn' }}
                  </div>
                  <div class="tile-badge-sub">Mã phiếu: {{ ticketResult()!.ticketNumber }}</div>
                </div>
              </div>
            </div>

            <!-- Footer Action Controls -->
            <div class="pass-footer-actions">
              <div class="footer-sync-status">
                <span class="sync-ping"></span>
                <span>Hệ thống tự động đồng bộ theo thời gian thực</span>
              </div>
              <div class="footer-buttons">
                @if (ticketResult()!.status === 'COMPLETED') {
                  <button
                    type="button"
                    class="btn btn-pdf"
                    [disabled]="downloadingPdf()"
                    (click)="downloadPdfByTicket(ticketResult()!.ticketNumber)"
                  >
                    <i class="bi" [class.bi-file-earmark-pdf-fill]="!downloadingPdf()" [class.bi-hourglass-split]="downloadingPdf()"></i>
                    {{ downloadingPdf() ? 'Đang tải...' : 'Tải Đơn Thuốc & Kết Quả (PDF)' }}
                  </button>
                }
                <button type="button" class="btn btn-modern-refresh" [disabled]="loadingSearch()" (click)="refreshTicket()">
                  <i class="bi bi-arrow-clockwise" [class.spin]="loadingSearch()"></i> Làm mới trạng thái
                </button>
              </div>
            </div>
          </div>

          <div class="lookup-other-link-wrapper">
            <button type="button" class="btn-link" (click)="showManualSearch = !showManualSearch">
              <i class="bi" [ngClass]="showManualSearch ? 'bi-chevron-up' : 'bi-search'"></i>
              {{ showManualSearch ? 'Ẩn ô tra cứu số khác' : 'Tra cứu số phiếu khác hoặc cho người thân' }}
            </button>
          </div>
        } @else {
          <!-- Empty State when no ticket found today -->
          <div class="empty-ticket-card">
            <div class="empty-ticket-icon">
              <i class="bi bi-ticket-perforated"></i>
            </div>
            <h3 class="empty-ticket-title">Bạn chưa có phiếu khám nào trong hôm nay</h3>
            <p class="empty-ticket-desc">
              @if (authService.isAuthenticated() && authService.hasRole('PATIENT')) {
                Hệ thống chưa ghi nhận lượt khám nào của bệnh nhân <strong>{{ authService.currentUser()?.fullName }}</strong> trong ngày hôm nay.
              } @else {
                Bạn chưa đăng ký lấy số khám trong ngày hôm nay hoặc chưa tra cứu mã phiếu.
              }
            </p>
            <div class="empty-actions">
              <button class="btn btn-primary btn-lg" (click)="setMode('CHECKIN')">
                <i class="bi bi-plus-circle-fill"></i> Đăng Ký Lấy Số Khám Ngay
              </button>
            </div>
          </div>
        }

        <!-- Manual search box -->
        @if (!ticketResult() || showManualSearch) {
          <div class="search-ticket-card">
            <label class="search-label"><i class="bi bi-search"></i> Tra cứu phiếu khám bằng mã số vé</label>
            <div class="search-input-group">
              <i class="bi bi-ticket-detailed"></i>
              <input
                type="text"
                [(ngModel)]="searchTicketNumber"
                placeholder="Ví dụ: P101-001, P102-005..."
                class="ticket-input"
                (keyup.enter)="searchTicket()"
              />
              <button class="btn btn-primary" [disabled]="loadingSearch() || !searchTicketNumber.trim()" (click)="searchTicket()">
                @if (loadingSearch()) {
                  <span class="spinner-sm"></span> Tra cứu...
                } @else {
                  <i class="bi bi-search"></i> Kiểm Tra
                }
              </button>
            </div>
            <small class="search-hint">Mã phiếu được in trên vé khám hoặc gửi qua tin nhắn SMS/thông báo.</small>
          </div>
        }

        @if (errorMessage()) {
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle-fill"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        }
      }

      <!-- MODE 2: LẤY SỐ TRỰC TUYẾN -->
      @if (activeMode === 'CHECKIN') {
        <div class="checkin-online-card">
          <h2 class="card-title"><i class="bi bi-ticket-perforated-fill text-primary"></i> Đăng Ký Lấy Số Khám Trực Tuyến</h2>
          <p class="card-subtitle">Điền thông tin bên dưới để được hệ thống xếp hàng tự động trước khi tới phòng khám</p>

          <div class="form-body">
            <div class="form-group">
              <label class="form-label required">Họ và tên người khám</label>
              <input type="text" [(ngModel)]="checkInForm.patientName" placeholder="Nguyễn Văn A" class="form-control" />
            </div>

            <div class="form-row">
              <div class="form-group flex-1">
                <label class="form-label required">Số điện thoại</label>
                <input type="tel" [(ngModel)]="checkInForm.patientPhone" placeholder="0912345678" class="form-control" />
              </div>
              <div class="form-group flex-1">
                <label class="form-label">Ngày sinh (ngày/tháng/năm)</label>
                <input type="date" [(ngModel)]="checkInForm.patientDob" [max]="todayString" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required">Chọn Phòng khám / Chuyên khoa</label>
              <select [(ngModel)]="checkInForm.examinationRoomId" class="form-control">
                @for (room of rooms(); track room.id) {
                  <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }} (Tầng {{ room.floor }})</option>
                }
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Mô tả triệu chứng sơ bộ</label>
              <textarea [(ngModel)]="checkInForm.notes" rows="2" placeholder="Ví dụ: Đau đầu, chóng mặt, cần tư vấn..." class="form-control"></textarea>
            </div>

            <button
              class="btn btn-primary btn-block btn-lg"
              [disabled]="submittingCheckIn() || !checkInForm.patientName.trim() || !checkInForm.patientPhone.trim()"
              (click)="submitOnlineCheckIn()"
            >
              @if (submittingCheckIn()) {
                <span class="spinner-sm"></span> Đang cấp số...
              } @else {
                <i class="bi bi-check-circle-fill"></i> Xác Nhận Lấy Số Thứ Tự
              }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tracking-page {
      padding: 2rem 0 4rem;
      max-width: 760px;
      margin: 0 auto;
    }

    .tracking-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background: var(--primary-100);
      color: var(--primary-800);
      font-size: 0.8rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
    }

    .page-title {
      font-size: 2.2rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.5rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 1rem;
    }


    /* Search Box */
    .search-ticket-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      padding: 1.75rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      margin-bottom: 1.5rem;
    }

    .search-label {
      display: block;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.75rem;
    }

    .search-input-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: #f8fafc;
      border: 2px solid var(--primary-200);
      border-radius: var(--radius-lg);
      padding: 0.4rem 0.6rem 0.4rem 1rem;
    }

    .search-input-group i {
      font-size: 1.35rem;
      color: var(--primary-600);
    }

    .ticket-input {
      border: none;
      background: transparent;
      outline: none;
      font-family: monospace;
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: var(--text-main);
      width: 100%;
    }

    .search-hint {
      display: block;
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    /* ========================================================
       PREMIUM PATIENT TICKET PASS STYLES
       ======================================================== */
    .ticket-result-card {
      background: #ffffff;
      border-radius: 24px;
      border: 1px solid #e2e8f0;
      overflow: hidden;
      box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.09), 0 2px 6px rgba(0, 0, 0, 0.04);
      animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      margin-bottom: 1.5rem;
    }

    /* Pass Header */
    .pass-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%);
      color: #ffffff;
      padding: 1.75rem 2rem;
      position: relative;
    }

    .pass-header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      margin-bottom: 1.5rem;
    }

    .clinic-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .brand-badge-icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      color: #38bdf8;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .brand-meta {
      display: flex;
      flex-direction: column;
    }

    .brand-sub {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .brand-main {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.01em;
    }

    /* Live status pill */
    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      backdrop-filter: blur(10px);
      border: 1px solid transparent;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .live-status-pill.status-waiting {
      background: rgba(2, 132, 199, 0.25);
      border-color: rgba(56, 189, 248, 0.4);
      color: #38bdf8;
    }

    .live-status-pill.status-called {
      background: rgba(245, 158, 11, 0.25);
      border-color: rgba(251, 191, 36, 0.5);
      color: #fbbf24;
      animation: pulseAlert 2s infinite;
    }

    .live-status-pill.status-in_progress {
      background: rgba(16, 185, 129, 0.25);
      border-color: rgba(52, 211, 153, 0.5);
      color: #34d399;
      animation: pulseAlert 2s infinite;
    }

    .live-status-pill.status-completed {
      background: rgba(99, 102, 241, 0.25);
      border-color: rgba(129, 140, 248, 0.4);
      color: #a5b4fc;
    }

    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 10px currentColor;
      display: inline-block;
    }

    @keyframes pulseAlert {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.03); }
    }

    /* Hero row: Ticket Number & Patient Info */
    .pass-hero-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .hero-ticket-box {
      display: flex;
      flex-direction: column;
    }

    .ticket-label {
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #94a3b8;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }

    .ticket-display-number {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, monospace;
      font-size: 3.25rem;
      font-weight: 900;
      letter-spacing: 0.04em;
      line-height: 1;
      background: linear-gradient(135deg, #ffffff 30%, #7dd3fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 2px 20px rgba(56, 189, 248, 0.3);
    }

    .hero-patient-box {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.6rem;
    }

    .patient-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 0.4rem 1rem 0.4rem 0.5rem;
    }

    .patient-avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 0.95rem;
    }

    .patient-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .patient-info .lbl {
      font-size: 0.68rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      line-height: 1;
    }

    .patient-info .name {
      font-size: 1rem;
      color: #ffffff;
      font-weight: 800;
      line-height: 1.2;
    }

    .time-meta-row {
      display: flex;
      gap: 0.75rem;
    }

    .meta-tag {
      font-size: 0.8rem;
      color: #cbd5e1;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.05);
      padding: 0.2rem 0.65rem;
      border-radius: 6px;
    }

    /* Visual Journey Stepper */
    .journey-stepper-wrap {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .stepper-item {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      position: relative;
    }

    .step-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 800;
      background: #e2e8f0;
      color: #64748b;
      transition: all 0.2s ease;
    }

    .step-label {
      display: flex;
      flex-direction: column;
    }

    .step-name {
      font-size: 0.85rem;
      font-weight: 800;
      color: #64748b;
      line-height: 1.2;
    }

    .step-desc {
      font-size: 0.72rem;
      color: #94a3b8;
      font-weight: 600;
    }

    .stepper-item.done .step-circle {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .stepper-item.done .step-name {
      color: #0f172a;
    }

    .stepper-item.current .step-circle {
      background: #0284c7;
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(2, 132, 199, 0.18);
      animation: pulseStep 2s infinite;
    }

    .stepper-item.current .step-name {
      color: #0284c7;
      font-weight: 900;
    }

    .stepper-line {
      flex: 1;
      height: 3px;
      background: #e2e8f0;
      margin: 0 0.75rem;
      border-radius: 9999px;
      transition: all 0.3s ease;
    }

    .stepper-line.active {
      background: #10b981;
    }

    @keyframes pulseStep {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    /* Dynamic Real-time Status Callout */
    .status-callout-container {
      padding: 1.25rem 2rem 0.5rem;
    }

    .callout-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
      border-radius: 16px;
      box-shadow: 0 4px 15px -2px rgba(0, 0, 0, 0.04);
    }

    .callout-card.in-progress-card {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1px solid #86efac;
    }

    .callout-card.called-card {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #fde68a;
    }

    .callout-card.completed-card {
      background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
      border: 1px solid #99f6e4;
    }

    .callout-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .in-progress-card .callout-icon-box {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    .called-card .callout-icon-box {
      background: #f59e0b;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
    }

    .completed-card .callout-icon-box {
      background: #0d9488;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);
    }

    .callout-details {
      flex: 1;
    }

    .callout-title {
      font-size: 1.1rem;
      font-weight: 900;
      margin: 0 0 0.3rem;
      letter-spacing: -0.01em;
    }

    .in-progress-card .callout-title { color: #065f46; }
    .called-card .callout-title { color: #92400e; }
    .completed-card .callout-title { color: #115e59; }

    .callout-desc {
      font-size: 0.92rem;
      margin: 0;
      line-height: 1.45;
    }

    .in-progress-card .callout-desc { color: #047857; }
    .called-card .callout-desc { color: #b45309; }
    .completed-card .callout-desc { color: #0f766e; }

    .heartbeat-pulse {
      animation: heartbeat 1.5s infinite;
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      14% { transform: scale(1.15); }
      28% { transform: scale(1); }
      42% { transform: scale(1.12); }
      70% { transform: scale(1); }
    }

    .bell-ring {
      animation: ringBell 2s infinite;
    }

    @keyframes ringBell {
      0%, 100% { transform: rotate(0); }
      10%, 30% { transform: rotate(-15deg); }
      20%, 40% { transform: rotate(15deg); }
      50% { transform: rotate(0); }
    }

    /* Queue metrics grid */
    .queue-metrics-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .q-metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 1rem;
      text-align: center;
      transition: all 0.2s ease;
    }

    .q-metric-card:hover {
      background: #ffffff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.05);
      border-color: #cbd5e1;
    }

    .q-metric-card.highlight {
      background: #f0f9ff;
      border-color: #bae6fd;
    }

    .q-metric-icon {
      font-size: 1.35rem;
      color: #64748b;
      margin-bottom: 0.25rem;
    }

    .highlight .q-metric-icon {
      color: #0284c7;
    }

    .q-metric-val {
      font-size: 2.1rem;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }

    .highlight .q-metric-val {
      color: #0284c7;
    }

    .q-metric-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: #64748b;
      margin-top: 0.25rem;
    }

    /* Clinical Information Grid */
    .clinic-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      padding: 1.25rem 2rem 1.5rem;
    }

    .clinic-tile {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      background: #ffffff;
      border: 1px solid #edf2f7;
      border-radius: 16px;
      padding: 1rem 1.15rem;
      transition: all 0.2s ease;
    }

    .clinic-tile:hover {
      border-color: #cbd5e1;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
    }

    .tile-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .icon-room { background: #eff6ff; color: #2563eb; }
    .icon-doctor { background: #f5f3ff; color: #7c3aed; }
    .icon-time { background: #ecfdf5; color: #059669; }
    .icon-priority { background: #fffbeb; color: #d97706; }

    .tile-content {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .tile-caption {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.2rem;
    }

    .tile-main {
      font-size: 0.98rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .text-primary-dark {
      color: #0284c7;
    }

    .tile-badge-sub {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 600;
      margin-top: 0.2rem;
    }

    /* Footer Action Controls */
    .pass-footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 2rem;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .footer-sync-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: #64748b;
      font-weight: 600;
    }

    .sync-ping {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }

    .footer-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-modern-refresh {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.15rem;
      border-radius: 10px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #0f172a;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-modern-refresh:hover {
      background: #f1f5f9;
      border-color: #94a3b8;
    }

    .spin {
      animation: spinAnim 1s linear infinite;
    }

    @keyframes spinAnim {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .btn-pdf {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.55rem 1.25rem;
      border-radius: 10px;
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #ffffff;
      border: none;
      font-size: 0.9rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
      transition: all 0.2s ease;
    }

    .btn-pdf:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(220, 38, 38, 0.35);
    }

    /* Responsive */
    @media (max-width: 640px) {
      .pass-header { padding: 1.25rem 1.25rem; }
      .pass-hero-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .hero-patient-box { align-items: flex-start; }
      .journey-stepper-wrap { padding: 1rem; }
      .step-desc { display: none; }
      .clinic-info-grid { grid-template-columns: 1fr; padding: 1rem; }
      .status-callout-container { padding: 1rem 1rem 0; }
      .queue-metrics-container { grid-template-columns: 1fr; }
      .pass-footer-actions { padding: 1rem; flex-direction: column; align-items: stretch; }
      .footer-buttons { justify-content: flex-end; }
    }

    /* CheckIn Online Card */
    .checkin-online-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      padding: 2rem;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
    }

    .card-title {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0 0 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-subtitle {
      color: var(--text-muted);
      margin: 0 0 1.5rem;
      font-size: 0.9rem;
    }

    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .flex-1 { flex: 1; }
    .form-group { display: flex; flex-direction: column; margin-bottom: 1rem; }
    .form-label { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem; }
    .form-label.required::after { content: ' *'; color: var(--rose-600); }
    .form-control { padding: 0.75rem 0.95rem; font-size: 0.95rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
    .btn-block { width: 100%; margin-top: 0.5rem; }

    .alert { padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .alert-danger { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }

    .search-loading-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      padding: 3rem 1.5rem;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      margin-bottom: 1.5rem;
      color: var(--text-muted);
    }

    .spinner-lg {
      width: 44px;
      height: 44px;
      border: 3px solid #e2e8f0;
      border-top-color: var(--primary-600);
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.8s linear infinite;
      margin-bottom: 1rem;
    }

    .empty-ticket-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      padding: 2.75rem 1.75rem;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);
      margin-bottom: 1.5rem;
    }

    .empty-ticket-icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.25rem;
      background: #f0f9ff;
      color: #0284c7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.2rem;
    }

    .empty-ticket-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.5rem;
    }

    .empty-ticket-desc {
      color: var(--text-muted);
      font-size: 0.95rem;
      max-width: 520px;
      margin: 0 auto 1.5rem;
      line-height: 1.5;
    }

    .lookup-other-link-wrapper {
      text-align: center;
      margin: 1.25rem 0;
    }

    .btn-link {
      background: transparent;
      border: none;
      color: var(--primary-600);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: color 0.15s;
    }

    .btn-link:hover {
      color: var(--primary-800);
      text-decoration: underline;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class QueueTrackingComponent implements OnInit {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  activeMode: 'LOOKUP' | 'CHECKIN' = 'LOOKUP';
  showManualSearch = false;
  searchTicketNumber = '';
  readonly loadingSearch = signal(false);
  readonly submittingCheckIn = signal(false);
  readonly downloadingPdf = signal(false);
  readonly ticketResult = signal<MyTicketStatus | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly rooms = signal<ExaminationRoom[]>([]);

  readonly todayString = toIsoDate(new Date());

  checkInForm: CheckInRequest = {
    patientName: '',
    patientPhone: '',
    patientDob: '',
    patientYearOfBirth: undefined,
    examinationRoomId: 1,
    notes: ''
  };

  ngOnInit(): void {
    // Guard patientOrGuestGuard đã xử lý redirect nếu là nhân viên y tế
    // Chỉ cần xử lý logic cho PATIENT hoặc khách vãng lai

    // Tự động điền thông tin nếu là BỆNH NHÂN đã đăng nhập
    if (this.authService.isAuthenticated() && this.authService.hasRole('PATIENT')) {
      const user = this.authService.currentUser();
      if (user) {
        if (user.fullName) this.checkInForm.patientName = user.fullName;
        if (user.phoneNumber) this.checkInForm.patientPhone = user.phoneNumber;
      }
    }

    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.rooms.set(res.data);
          this.checkInForm.examinationRoomId = res.data[0].id;
        }
      }
    });

    // Xác định chế độ theo route hiện tại
    const isMyTickets = this.router.url.includes('/my-tickets');
    if (isMyTickets) {
      this.activeMode = 'LOOKUP';
      this.loadMyActiveTicket();
    } else {
      this.activeMode = 'CHECKIN';
    }

    // Xử lý query params (mode & ticket)
    this.route.queryParams.subscribe(params => {
      if (params['mode'] === 'checkin') {
        this.activeMode = 'CHECKIN';
      } else if (params['mode'] === 'lookup') {
        this.activeMode = 'LOOKUP';
        this.loadMyActiveTicket();
      }

      if (params['ticket']) {
        this.searchTicketNumber = params['ticket'];
        this.activeMode = 'LOOKUP';
        this.searchTicket();
      }
    });
  }

  setMode(mode: 'LOOKUP' | 'CHECKIN'): void {
    this.activeMode = mode;
    this.errorMessage.set(null);
    if (mode === 'LOOKUP' && !this.ticketResult()) {
      this.loadMyActiveTicket();
    }
  }

  loadMyActiveTicket(): void {
    if (this.ticketResult()) return;
    if (this.authService.isAuthenticated() && !this.authService.hasRole('PATIENT')) return;

    const userPhone = this.authService.currentUser()?.phoneNumber;
    const lastTicket = localStorage.getItem('medqueue_last_ticket');

    this.loadingSearch.set(true);
    this.errorMessage.set(null);

    this.queueService.getMyActiveTicket(userPhone).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.ticketResult.set(res.data);
          this.searchTicketNumber = res.data.ticketNumber;
          localStorage.setItem('medqueue_last_ticket', res.data.ticketNumber);
        } else if (lastTicket) {
          this.searchTicketNumber = lastTicket;
          this.searchTicket();
        }
        this.loadingSearch.set(false);
      },
      error: () => {
        if (lastTicket) {
          this.searchTicketNumber = lastTicket;
          this.searchTicket();
        } else {
          this.loadingSearch.set(false);
        }
      }
    });
  }

  refreshTicket(): void {
    if (this.ticketResult()) {
      this.searchTicketNumber = this.ticketResult()!.ticketNumber;
      this.searchTicket();
    } else {
      this.loadMyActiveTicket();
    }
  }

  searchTicket(): void {
    if (!this.searchTicketNumber.trim()) return;

    this.loadingSearch.set(true);
    this.errorMessage.set(null);
    this.queueService.getMyTicketStatus(this.searchTicketNumber).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.ticketResult.set(res.data);
        }
        this.loadingSearch.set(false);
      },
      error: err => {
        this.ticketResult.set(null);
        this.errorMessage.set(err.error?.message || 'Không tìm thấy số phiếu khám này trong ngày hôm nay.');
        this.loadingSearch.set(false);
      }
    });
  }

  submitOnlineCheckIn(): void {
    if (!this.checkInForm.patientName.trim() || !this.checkInForm.patientPhone.trim()) return;

    if (this.checkInForm.patientDob) {
      const dobDate = new Date(this.checkInForm.patientDob);
      this.checkInForm.patientYearOfBirth = dobDate.getFullYear();
    }

    this.submittingCheckIn.set(true);
    this.queueService.checkIn(this.checkInForm).subscribe({
      next: res => {
        if (res.success && res.data) {
          const ticketNum = res.data.ticketNumber;
          this.searchTicketNumber = ticketNum;
          localStorage.setItem('medqueue_last_ticket', ticketNum);
          this.activeMode = 'LOOKUP';
          this.searchTicket();
        }
        this.submittingCheckIn.set(false);
      },
      error: err => {
        alert(err.error?.message || 'Lỗi khi đăng ký số thứ tự');
        this.submittingCheckIn.set(false);
      }
    });
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'WAITING': return 'bi-hourglass-split';
      case 'CALLED': return 'bi-bell-fill';
      case 'IN_PROGRESS': return 'bi-heart-pulse-fill';
      case 'COMPLETED': return 'bi-check-circle-fill';
      case 'SKIPPED': return 'bi-arrow-repeat';
      default: return 'bi-info-circle-fill';
    }
  }

  getStatusMessage(status: string): string {
    switch (status) {
      case 'WAITING': return 'Đang Chờ Đến Lượt';
      case 'CALLED': return 'Mời Bạn Vào Phòng Khám';
      case 'IN_PROGRESS': return 'Bác Sĩ Đang Khám';
      case 'COMPLETED': return 'Đã Khám Xong';
      case 'SKIPPED': return 'Đã Bỏ Qua Lượt';
      default: return status;
    }
  }

  getCardClassByStatus(status: string): string {
    return 'status-' + status.toLowerCase();
  }

  formatCheckInTime(time?: string): string {
    if (!time) return '--:--';
    let t = time;
    if (t.includes('T')) {
      t = t.split('T')[1];
    }
    return t.split('.')[0];
  }

  formatTicketDate(dateStr?: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  getStepState(step: number, status?: string): 'done' | 'current' | 'waiting' {
    if (!status) return step === 1 ? 'current' : 'waiting';
    switch (status) {
      case 'WAITING':
        if (step < 2) return 'done';
        if (step === 2) return 'current';
        return 'waiting';
      case 'CALLED':
        if (step < 2) return 'done';
        if (step === 2) return 'current';
        return 'waiting';
      case 'IN_PROGRESS':
        if (step < 3) return 'done';
        if (step === 3) return 'current';
        return 'waiting';
      case 'COMPLETED':
        return 'done';
      case 'SKIPPED':
        if (step < 2) return 'done';
        if (step === 2) return 'current';
        return 'waiting';
      default:
        return step === 1 ? 'current' : 'waiting';
    }
  }

  downloadPdfByTicket(ticketNumber: string): void {
    this.downloadingPdf.set(true);
    this.medicalRecordService.exportPdfByTicketNumber(ticketNumber).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `phieu-kham-${ticketNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
      },
      error: err => {
        this.downloadingPdf.set(false);
        console.error('Lỗi khi tải PDF phiếu khám:', err);
        alert('Hồ sơ bệnh án cho phiếu khám này chưa sẵn sàng hoặc có lỗi từ máy chủ!');
      }
    });
  }
}
