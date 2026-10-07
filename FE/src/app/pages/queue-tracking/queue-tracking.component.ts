import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { CheckInRequest, MyTicketStatus } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';

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
        <h1 class="page-title">Tra Cứu Vị Trí Hàng Đợi Khám</h1>
        <p class="page-subtitle">
          Theo dõi số thứ tự của bạn, dự đoán thời gian chờ và nhận thông báo khi đến lượt khám
        </p>
      </div>

      <!-- Action Tabs: Tra Cứu / Lấy Số Mới -->
      <div class="action-mode-tabs">
        <button
          class="mode-tab-btn"
          [class.active]="activeMode === 'LOOKUP'"
          (click)="activeMode = 'LOOKUP'"
        >
          <i class="bi bi-search"></i> Tra Cứu Phiếu Đã Có
        </button>
        <button
          class="mode-tab-btn"
          [class.active]="activeMode === 'CHECKIN'"
          (click)="activeMode = 'CHECKIN'"
        >
          <i class="bi bi-ticket-perforated"></i> Đăng Ký Lấy Số Khám Ngay
        </button>
      </div>

      <!-- MODE 1: TRA CỨU -->
      @if (activeMode === 'LOOKUP') {
        <div class="search-ticket-card">
          <label class="search-label">Nhập mã số vé khám của bạn</label>
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

        @if (errorMessage()) {
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-circle-fill"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        @if (ticketResult()) {
          <div class="ticket-result-card" [ngClass]="getCardClassByStatus(ticketResult()!.status)">
            <!-- Top Status Banner -->
            <div class="ticket-banner">
              <div class="banner-status-tag">
                <i class="bi" [ngClass]="getStatusIcon(ticketResult()!.status)"></i>
                <span>{{ getStatusMessage(ticketResult()!.status) }}</span>
              </div>
              <div class="banner-ticket-num">{{ ticketResult()!.ticketNumber }}</div>
            </div>

            <!-- Wait Time & Position Highlight -->
            @if (ticketResult()!.status === 'WAITING') {
              <div class="queue-metrics-row">
                <div class="metric-box">
                  <span class="metric-num">#{{ ticketResult()!.positionInQueue }}</span>
                  <span class="metric-text">Vị trí trong hàng đợi</span>
                </div>
                <div class="metric-box">
                  <span class="metric-num">{{ ticketResult()!.waitingAheadCount }}</span>
                  <span class="metric-text">Bệnh nhân đang chờ trước bạn</span>
                </div>
                <div class="metric-box metric-highlight">
                  <span class="metric-num">~{{ ticketResult()!.estimatedWaitingMinutes }}</span>
                  <span class="metric-text">Phút chờ ước tính</span>
                </div>
              </div>
            }

            @if (ticketResult()!.status === 'CALLED') {
              <div class="called-callout">
                <i class="bi bi-bell-fill"></i>
                <div>
                  <h3>ĐÃ ĐẾN LƯỢT KHÁM CỦA BẠN!</h3>
                  <p>Vui lòng tiến vào phòng khám <strong>{{ ticketResult()!.roomNumber }}</strong> ngay bây giờ.</p>
                </div>
              </div>
            }

            <!-- Details List -->
            <div class="ticket-info-grid">
              <div class="info-item">
                <span class="info-label">Họ và tên bệnh nhân:</span>
                <span class="info-val">{{ ticketResult()!.patientName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phòng khám:</span>
                <span class="info-val font-bold text-primary">{{ ticketResult()!.roomNumber }} - {{ ticketResult()!.roomName }} (Tầng {{ ticketResult()!.floor }})</span>
              </div>
              <div class="info-item">
                <span class="info-label">Bác sĩ phụ trách:</span>
                <span class="info-val">{{ ticketResult()!.doctorName || 'Đang cập nhật' }} ({{ ticketResult()!.specialtyName }})</span>
              </div>
              <div class="info-item">
                <span class="info-label">Giờ lấy số:</span>
                <span class="info-val">{{ ticketResult()!.checkInTime }}</span>
              </div>
            </div>

            <div class="ticket-actions">
              <button class="btn btn-outline" (click)="searchTicket()">
                <i class="bi bi-arrow-clockwise"></i> Làm mới trạng thái
              </button>
            </div>
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

    /* Tabs */
    .action-mode-tabs {
      display: flex;
      background: #f1f5f9;
      padding: 0.35rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1.75rem;
      gap: 0.35rem;
    }

    .mode-tab-btn {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .mode-tab-btn.active {
      background: #ffffff;
      color: var(--primary-700);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
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

    /* Ticket Result Card */
    .ticket-result-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      overflow: hidden;
      box-shadow: 0 15px 35px -5px rgba(15, 23, 42, 0.08);
      animation: modalFadeIn 0.25s ease-out;
    }

    .ticket-banner {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .banner-status-tag {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .banner-ticket-num {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, monospace;
      font-size: 2.75rem;
      font-weight: 900;
      letter-spacing: 0.03em;
      line-height: 1;
      font-variant-numeric: tabular-nums;
    }

    .queue-metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      padding: 1.5rem 2rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .metric-box {
      text-align: center;
      display: flex;
      flex-direction: column;
    }

    .metric-num {
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--text-main);
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }

    .metric-text {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .metric-highlight .metric-num {
      color: #0284c7;
    }

    .called-callout {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: var(--radius-md);
      padding: 1.25rem 2rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      color: #92400e;
    }

    .called-callout i {
      font-size: 2.25rem;
      color: #d97706;
    }

    .called-callout h3 {
      margin: 0 0 0.25rem;
      font-size: 1.25rem;
      font-weight: 900;
    }

    .called-callout p {
      margin: 0;
      font-size: 0.95rem;
    }

    .ticket-info-grid {
      padding: 1.5rem 2rem;
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .info-label {
      color: var(--text-muted);
    }

    .info-val {
      font-weight: 600;
      color: var(--text-main);
    }

    .ticket-actions {
      padding: 1rem 2rem 1.5rem;
      display: flex;
      justify-content: flex-end;
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

    @keyframes modalFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class QueueTrackingComponent implements OnInit {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);
  private readonly route = inject(ActivatedRoute);

  activeMode: 'LOOKUP' | 'CHECKIN' = 'LOOKUP';
  searchTicketNumber = '';
  readonly loadingSearch = signal(false);
  readonly submittingCheckIn = signal(false);
  readonly ticketResult = signal<MyTicketStatus | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly rooms = signal<ExaminationRoom[]>([]);

  readonly todayString = new Date().toISOString().split('T')[0];

  checkInForm: CheckInRequest = {
    patientName: '',
    patientPhone: '',
    patientDob: '',
    patientYearOfBirth: undefined,
    examinationRoomId: 1,
    notes: ''
  };

  ngOnInit(): void {
    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.rooms.set(res.data);
          this.checkInForm.examinationRoomId = res.data[0].id;
        }
      }
    });

    // Nếu có param ticket trên url
    this.route.queryParams.subscribe(params => {
      if (params['ticket']) {
        this.searchTicketNumber = params['ticket'];
        this.searchTicket();
      }
    });
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
          this.searchTicketNumber = res.data.ticketNumber;
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
}
