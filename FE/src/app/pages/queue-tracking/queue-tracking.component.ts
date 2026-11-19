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
    <div class="page tracking-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ activeMode === 'LOOKUP' ? 'Phiếu khám của tôi' : 'Lấy số khám' }}</h1>
          <p class="page-subtitle">
            {{ activeMode === 'LOOKUP'
              ? 'Số thứ tự, trạng thái và thời gian chờ ước tính trong ngày.'
              : 'Điền thông tin để nhận số thứ tự trước khi đến phòng khám.' }}
          </p>
        </div>
      </div>

      <!-- Chế độ 1: tra cứu / phiếu của tôi -->
      @if (activeMode === 'LOOKUP') {
        @if (loadingSearch()) {
          <div class="panel search-loading-card">
            <div class="spinner"></div>
            <p>Đang tìm phiếu khám...</p>
          </div>
        } @else if (ticketResult()) {
          <div class="panel ticket-result-card" [ngClass]="getCardClassByStatus(ticketResult()!.status)">
            <div class="panel-header">
              <h2 class="panel-title">Phiếu khám <span class="mono text-muted ticket-date">{{ formatTicketDate(ticketResult()!.ticketDate) }}</span></h2>
              <span class="status live-status-pill" [ngClass]="'status-' + ticketResult()!.status.toLowerCase()">
                {{ getStatusMessage(ticketResult()!.status) }}
              </span>
            </div>

            <!-- Số thứ tự và bệnh nhân -->
            <div class="pass-hero-row">
              <div class="hero-ticket-box">
                <span class="hero-label">Số thứ tự</span>
                <div class="ticket-display-number mono">{{ ticketResult()!.ticketNumber }}</div>
              </div>
              <div class="hero-patient-box">
                <span class="hero-label">Bệnh nhân</span>
                <strong class="patient-name">{{ ticketResult()!.patientName }}</strong>
                <span class="text-muted mono">Lấy số lúc {{ formatCheckInTime(ticketResult()!.checkInTime) }}</span>
              </div>
            </div>

            <!-- Tiến trình 4 bước -->
            <ol class="journey-stepper">
              <li class="stepper-item" [ngClass]="getStepState(1, ticketResult()!.status)">
                <span class="step-circle">
                  @if (getStepState(1, ticketResult()!.status) === 'done') { <i class="bi bi-check-lg"></i> } @else { 1 }
                </span>
                <span class="step-name">Lấy số</span>
              </li>
              <li class="stepper-item" [ngClass]="getStepState(2, ticketResult()!.status)">
                <span class="step-circle">
                  @if (getStepState(2, ticketResult()!.status) === 'done') { <i class="bi bi-check-lg"></i> } @else { 2 }
                </span>
                <span class="step-name">{{ ticketResult()!.status === 'CALLED' ? 'Đã gọi số' : 'Chờ gọi số' }}</span>
              </li>
              <li class="stepper-item" [ngClass]="getStepState(3, ticketResult()!.status)">
                <span class="step-circle">
                  @if (getStepState(3, ticketResult()!.status) === 'done') { <i class="bi bi-check-lg"></i> } @else { 3 }
                </span>
                <span class="step-name">{{ ticketResult()!.status === 'IN_PROGRESS' ? 'Đang khám' : 'Khám bệnh' }}</span>
              </li>
              <li class="stepper-item" [ngClass]="getStepState(4, ticketResult()!.status)">
                <span class="step-circle">
                  @if (getStepState(4, ticketResult()!.status) === 'done') { <i class="bi bi-check-lg"></i> } @else { 4 }
                </span>
                <span class="step-name">Hoàn tất</span>
              </li>
            </ol>

            <!-- Thông báo theo trạng thái -->
            @if (ticketResult()!.status === 'IN_PROGRESS') {
              <div class="callout-card in-progress-card">
                <strong class="callout-title">Bác sĩ đang khám</strong>
                <p class="callout-desc">Phòng {{ ticketResult()!.roomNumber }} – {{ ticketResult()!.roomName }}.</p>
              </div>
            }

            @if (ticketResult()!.status === 'CALLED') {
              <div class="callout-card called-card">
                <strong class="callout-title">Đã đến lượt khám</strong>
                <p class="callout-desc">
                  Mời vào phòng {{ ticketResult()!.roomNumber }} – {{ ticketResult()!.roomName }}, tầng {{ ticketResult()!.floor }}.
                </p>
              </div>
            }

            @if (ticketResult()!.status === 'WAITING') {
              <div class="queue-metrics">
                <div class="q-metric">
                  <div class="q-metric-label">Vị trí trong hàng đợi</div>
                  <div class="q-metric-val mono">#{{ ticketResult()!.positionInQueue }}</div>
                </div>
                <div class="q-metric">
                  <div class="q-metric-label">Người chờ trước</div>
                  <div class="q-metric-val mono">{{ ticketResult()!.waitingAheadCount }}</div>
                </div>
                <div class="q-metric">
                  <div class="q-metric-label">Thời gian chờ ước tính</div>
                  <div class="q-metric-val mono">~{{ ticketResult()!.estimatedWaitingMinutes }} phút</div>
                </div>
              </div>
            }

            @if (ticketResult()!.status === 'COMPLETED') {
              <div class="callout-card completed-card">
                <strong class="callout-title">Đã khám xong</strong>
                <p class="callout-desc">Có thể tải đơn thuốc và kết quả khám (PDF) hoặc đến quầy lấy thuốc theo hướng dẫn.</p>
              </div>
            }

            <!-- Thông tin phòng khám -->
            <dl class="clinic-info-grid">
              <div class="info-item">
                <dt>Phòng khám</dt>
                <dd>{{ ticketResult()!.roomNumber }} – {{ ticketResult()!.roomName }}</dd>
                <dd class="info-sub">Tầng {{ ticketResult()!.floor }}</dd>
              </div>
              <div class="info-item">
                <dt>Bác sĩ</dt>
                <dd>{{ ticketResult()!.doctorName || 'Bác sĩ trực' }}</dd>
                <dd class="info-sub">{{ ticketResult()!.specialtyName || 'Khám đa khoa' }}</dd>
              </div>
              <div class="info-item">
                <dt>Thời gian lấy số</dt>
                <dd class="mono">{{ formatCheckInTime(ticketResult()!.checkInTime) }}</dd>
                <dd class="info-sub mono">{{ formatTicketDate(ticketResult()!.ticketDate) }}</dd>
              </div>
              <div class="info-item">
                <dt>Hình thức</dt>
                <dd>{{ ticketResult()!.priorityScore ? 'Khám ưu tiên' : 'Khám thường' }}</dd>
                <dd class="info-sub">Mã phiếu <span class="mono">{{ ticketResult()!.ticketNumber }}</span></dd>
              </div>
            </dl>

            <!-- Xác minh 4 số cuối SĐT trước khi tải phiếu kết quả -->
            @if (ticketResult()!.status === 'COMPLETED' && showPdfVerify()) {
              <div class="pdf-verify-box">
                <label for="pdfPhoneLast4" class="form-label">Nhập 4 số cuối số điện thoại đã đăng ký khi lấy số để tải phiếu kết quả</label>
                <div class="pdf-verify-row">
                  <input id="pdfPhoneLast4" type="text" inputmode="numeric" maxlength="4" placeholder="VD: 4321"
                         class="form-control mono pdf-input"
                         [ngModel]="pdfPhoneLast4()" (ngModelChange)="pdfPhoneLast4.set($event)"
                         (keyup.enter)="downloadPdfByTicket(ticketResult()!.ticketNumber, ticketResult()!.ticketDate)" />
                  <button type="button" class="btn btn-primary" [disabled]="downloadingPdf() || pdfPhoneLast4().length !== 4"
                          (click)="downloadPdfByTicket(ticketResult()!.ticketNumber, ticketResult()!.ticketDate)">
                    @if (downloadingPdf()) { <span class="spinner-sm"></span> }
                    {{ downloadingPdf() ? 'Đang tải...' : 'Tải PDF' }}
                  </button>
                  <button type="button" class="btn btn-secondary" (click)="closePdfVerify()">Hủy</button>
                </div>
                @if (pdfError()) {
                  <p class="pdf-verify-error" role="alert">{{ pdfError() }}</p>
                }
              </div>
            }

            <div class="pass-footer-actions">
              <span class="footer-hint">Trạng thái không tự cập nhật, nhấn “Làm mới” để xem mới nhất.</span>
              <div class="footer-buttons">
                @if (ticketResult()!.status === 'COMPLETED' && !showPdfVerify()) {
                  <button type="button" class="btn btn-secondary" (click)="openPdfVerify()">
                    <i class="bi bi-download"></i> Tải đơn thuốc và kết quả (PDF)
                  </button>
                }
                <button type="button" class="btn btn-secondary" [disabled]="loadingSearch()" (click)="refreshTicket()">
                  <i class="bi bi-arrow-clockwise" [class.spin]="loadingSearch()"></i> Làm mới
                </button>
              </div>
            </div>
          </div>

          <div class="lookup-other-link-wrapper">
            <button type="button" class="btn-link" (click)="showManualSearch = !showManualSearch">
              {{ showManualSearch ? 'Ẩn ô tra cứu' : 'Tra cứu phiếu khác' }}
            </button>
          </div>
        } @else {
          <div class="panel empty-ticket-card">
            <h3 class="empty-ticket-title">Chưa có phiếu khám hôm nay</h3>
            <p class="empty-ticket-desc">
              @if (authService.isAuthenticated() && authService.hasRole('PATIENT')) {
                Chưa ghi nhận lượt khám nào của <strong>{{ authService.currentUser()?.fullName }}</strong> trong hôm nay.
              } @else {
                Chưa lấy số khám trong hôm nay, hoặc chưa tra cứu mã phiếu.
              }
            </p>
            <button class="btn btn-primary" (click)="setMode('CHECKIN')">Lấy số khám</button>
          </div>
        }

        <!-- Tra cứu theo mã phiếu -->
        @if (!ticketResult() || showManualSearch) {
          <div class="panel search-ticket-card">
            <div class="panel-body">
              <label class="form-label" for="ticketSearchInput">Tra cứu theo mã phiếu</label>
              <div class="search-input-group">
                <input
                  id="ticketSearchInput"
                  type="text"
                  [(ngModel)]="searchTicketNumber"
                  placeholder="Ví dụ: P101-001"
                  class="form-control ticket-input mono"
                  (keyup.enter)="searchTicket()"
                />
                <button class="btn btn-primary" [disabled]="loadingSearch() || !searchTicketNumber.trim()" (click)="searchTicket()">
                  @if (loadingSearch()) {
                    <span class="spinner-sm"></span> Đang tra cứu...
                  } @else {
                    Tra cứu
                  }
                </button>
              </div>
              <small class="form-hint">Mã phiếu in trên vé khám hoặc trong tin nhắn thông báo.</small>
            </div>
          </div>
        }

        @if (errorMessage()) {
          <div class="alert alert-danger">
            <span>{{ errorMessage() }}</span>
          </div>
        }
      }

      <!-- Chế độ 2: lấy số trực tuyến -->
      @if (activeMode === 'CHECKIN') {
        <div class="panel checkin-online-card">
          <div class="panel-body">
            <div class="form-group">
              <label class="form-label required">Họ và tên người khám</label>
              <input type="text" [(ngModel)]="checkInForm.patientName" placeholder="Nguyễn Văn A" class="form-control" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label required">Số điện thoại</label>
                <input type="tel" [(ngModel)]="checkInForm.patientPhone" placeholder="0912345678" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label">Ngày sinh</label>
                <input type="date" [(ngModel)]="checkInForm.patientDob" [max]="todayString" class="form-control" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label required">Phòng khám / chuyên khoa</label>
              <select [(ngModel)]="checkInForm.examinationRoomId" class="form-control">
                @for (room of rooms(); track room.id) {
                  <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }} (tầng {{ room.floor }})</option>
                }
              </select>
            </div>

            <div class="form-group form-group-last">
              <label class="form-label">Triệu chứng (không bắt buộc)</label>
              <textarea [(ngModel)]="checkInForm.notes" rows="2" placeholder="Ví dụ: đau đầu, chóng mặt" class="form-control"></textarea>
            </div>
          </div>

          <div class="checkin-footer">
            <button
              class="btn btn-primary"
              [disabled]="submittingCheckIn() || !checkInForm.patientName.trim() || !checkInForm.patientPhone.trim()"
              (click)="submitOnlineCheckIn()"
            >
              @if (submittingCheckIn()) {
                <span class="spinner-sm"></span> Đang cấp số...
              } @else {
                Lấy số thứ tự
              }
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .tracking-page { max-width: 760px; }

    .panel + .panel, .panel + .lookup-other-link-wrapper, .lookup-other-link-wrapper + .panel { margin-top: 16px; }
    .alert { margin-top: 16px; }

    .search-loading-card { padding: 40px 16px; text-align: center; color: var(--text-muted); font-size: 14px; }

    /* Phiếu khám */
    .ticket-date { font-weight: 400; font-size: 13px; margin-left: 6px; }

    .live-status-pill.status-waiting { background: var(--info-bg); color: var(--info-text); }
    .live-status-pill.status-called { background: var(--warning-bg); color: var(--warning-text); }
    .live-status-pill.status-in_progress { background: var(--info-bg); color: var(--info-text); }
    .live-status-pill.status-completed { background: var(--success-bg); color: var(--success-text); }
    .live-status-pill.status-skipped { background: var(--danger-bg); color: var(--danger-text); }

    .pass-hero-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 32px;
      align-items: end;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .hero-label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
    .ticket-display-number { font-size: 36px; font-weight: 600; line-height: 1.1; color: var(--text-main); }

    .hero-patient-box { display: flex; flex-direction: column; gap: 2px; font-size: 13px; min-width: 0; }
    .patient-name { font-size: 16px; font-weight: 600; color: var(--text-main); }

    /* Tiến trình */
    .journey-stepper {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      list-style: none;
      margin: 0;
      padding: 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .stepper-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Đường nối giữa các bước */
    .stepper-item + .stepper-item::before {
      content: '';
      position: absolute;
      top: 11px;
      right: calc(50% + 16px);
      width: calc(100% - 32px);
      height: 2px;
      background: var(--border-color);
    }

    .stepper-item.done + .stepper-item::before,
    .stepper-item.done + .stepper-item.current::before { background: var(--primary-600); }

    .step-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid var(--border-strong);
      background: #fff;
      font-size: 12px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--text-muted);
    }

    .stepper-item.done .step-circle { background: var(--primary-600); border-color: var(--primary-600); color: #fff; }
    .stepper-item.current .step-circle { border: 2px solid var(--primary-600); color: var(--primary-700); }
    .stepper-item.current .step-name { color: var(--text-main); font-weight: 500; }
    .stepper-item.done .step-name { color: var(--text-secondary); }

    /* Thông báo theo trạng thái */
    .callout-card {
      margin: 16px 16px 0;
      padding: 10px 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      font-size: 14px;
    }
    .callout-title { display: block; font-weight: 600; color: var(--text-main); }
    .callout-desc { margin: 2px 0 0; color: var(--text-secondary); font-size: 13px; }

    .called-card { background: var(--warning-bg); border-color: var(--warning-border); }
    .called-card .callout-title, .called-card .callout-desc { color: var(--warning-text); }
    .in-progress-card { background: var(--info-bg); border-color: var(--info-border); }
    .in-progress-card .callout-title, .in-progress-card .callout-desc { color: var(--info-text); }
    .completed-card { background: var(--success-bg); border-color: var(--success-border); }
    .completed-card .callout-title, .completed-card .callout-desc { color: var(--success-text); }

    .queue-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      margin: 16px 16px 0;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .q-metric { padding: 12px 14px; }
    .q-metric + .q-metric { border-left: 1px solid var(--border-color); }
    .q-metric-label { font-size: 12px; color: var(--text-muted); }
    .q-metric-val { font-size: 22px; font-weight: 600; color: var(--text-main); margin-top: 2px; }

    /* Thông tin */
    .clinic-info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px 24px;
      margin: 0;
      padding: 16px;
    }
    .info-item dt { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
    .info-item dd { margin: 0; font-size: 14px; color: var(--text-main); font-weight: 500; }
    .info-item .info-sub { font-size: 13px; color: var(--text-muted); font-weight: 400; }

    /* Xác minh tải PDF */
    .pdf-verify-box {
      margin: 0 16px 16px;
      padding: 12px 14px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
    }
    .pdf-verify-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; flex-wrap: wrap; }
    .pdf-input { width: 120px; flex: 0 0 auto; background: #fff; letter-spacing: .1em; }
    .pdf-verify-error { margin: 6px 0 0; font-size: 13px; color: var(--danger-text); }

    .pass-footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
    }
    .footer-hint { font-size: 12px; color: var(--text-muted); }
    .footer-buttons { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }

    .spin { display: inline-block; animation: spin 0.8s linear infinite; }

    .lookup-other-link-wrapper { text-align: center; }
    .btn-link {
      border: none;
      background: none;
      padding: 4px 0;
      font: inherit;
      font-size: 13px;
      color: var(--primary-700);
      cursor: pointer;
    }
    .btn-link:hover { text-decoration: underline; }

    /* Không có phiếu */
    .empty-ticket-card { padding: 32px 16px; text-align: center; }
    .empty-ticket-title { font-size: 15px; font-weight: 600; color: var(--text-main); margin: 0 0 4px; }
    .empty-ticket-desc { font-size: 14px; color: var(--text-muted); margin: 0 0 16px; }

    /* Tra cứu */
    .search-input-group { display: flex; gap: 8px; }
    .ticket-input { flex: 1; }
    .search-ticket-card .form-label { margin-bottom: 6px; }
    .search-ticket-card .form-hint { display: block; margin-top: 6px; font-size: 12px; color: var(--text-muted); }

    /* Lấy số */
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .form-group-last { margin-bottom: 0; }
    .checkin-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color);
    }

    @media (max-width: 600px) {
      .page { padding: 16px; }
      .pass-hero-row { grid-template-columns: 1fr; gap: 12px; }
      .queue-metrics { grid-template-columns: 1fr; }
      .q-metric + .q-metric { border-left: none; border-top: 1px solid var(--border-color); }
      .clinic-info-grid, .form-row { grid-template-columns: 1fr; }
      .step-name { font-size: 12px; text-align: center; }
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
  // Xác minh 4 số cuối SĐT trước khi tải phiếu kết quả (người không đăng nhập)
  readonly showPdfVerify = signal(false);
  readonly pdfPhoneLast4 = signal('');
  readonly pdfError = signal<string | null>(null);
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

    const lastTicket = localStorage.getItem('medqueue_last_ticket');

    this.loadingSearch.set(true);
    this.errorMessage.set(null);

    this.queueService.getMyActiveTicket().subscribe({
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
    this.queueService.selfCheckIn(this.checkInForm).subscribe({
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
      case 'WAITING': return 'Đang chờ';
      case 'CALLED': return 'Mời vào phòng khám';
      case 'IN_PROGRESS': return 'Đang khám';
      case 'COMPLETED': return 'Đã khám xong';
      case 'SKIPPED': return 'Đã bỏ qua lượt';
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

  openPdfVerify(): void {
    this.pdfPhoneLast4.set('');
    this.pdfError.set(null);
    this.showPdfVerify.set(true);
  }

  closePdfVerify(): void {
    this.showPdfVerify.set(false);
    this.pdfError.set(null);
  }

  downloadPdfByTicket(ticketNumber: string, ticketDate?: string): void {
    const last4 = this.pdfPhoneLast4().trim();
    if (!/^\d{4}$/.test(last4)) {
      this.pdfError.set('Vui lòng nhập đúng 4 chữ số.');
      return;
    }
    this.pdfError.set(null);
    this.downloadingPdf.set(true);
    this.medicalRecordService.exportPdfByTicketNumber(ticketNumber, last4, ticketDate).subscribe({
      next: (blob: Blob) => {
        this.downloadingPdf.set(false);
        this.closePdfVerify();
        const fileUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = `phieu-kham-${ticketNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(fileUrl);
      },
      error: async err => {
        this.downloadingPdf.set(false);
        this.pdfError.set(await this.readBlobError(err) ?? 'Không tải được phiếu kết quả. Vui lòng thử lại sau.');
      }
    });
  }

  // Lỗi của request responseType 'blob' trả về dạng Blob: đọc ra để lấy thông báo của máy chủ
  private async readBlobError(err: { error?: unknown }): Promise<string | null> {
    try {
      if (err.error instanceof Blob) {
        return JSON.parse(await err.error.text())?.message ?? null;
      }
    } catch {}
    return null;
  }
}
