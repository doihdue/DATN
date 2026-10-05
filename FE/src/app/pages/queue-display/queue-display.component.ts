import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QueueService } from '../../services/queue.service';
import { ClinicDisplayBoard } from '../../models/queue.model';

@Component({
  selector: 'app-queue-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tv-display-container">
      <!-- TV Header -->
      <header class="tv-header">
        <div class="tv-brand">
          <div class="brand-icon">
            <i class="bi bi-hospital-fill"></i>
          </div>
          <div class="brand-text">
            <h1 class="brand-title">MEDQUEUE CLINIC</h1>
            <span class="brand-sub">BẢNG GỌI SỐ THỨ TỰ KHÁM BỆNH ĐIỆN TỬ</span>
          </div>
        </div>

        <div class="tv-clock">
          <div class="clock-time">{{ currentTime() }}</div>
          <div class="clock-date">{{ currentDate() }}</div>
        </div>
      </header>

      <!-- TV Main Room Cards Grid -->
      <main class="tv-content">
        @if (loading() && boards().length === 0) {
          <div class="tv-loading">
            <div class="tv-spinner"></div>
            <p>Đang kết nối hệ thống điều phối hàng đợi...</p>
          </div>
        } @else {
          <div class="room-tv-grid">
            @for (room of boards(); track room.roomId) {
              <div class="room-tv-card">
                <!-- Card Header -->
                <div class="card-room-header">
                  <div class="room-num-badge">{{ room.roomNumber }}</div>
                  <div class="room-meta">
                    <h2 class="room-title">{{ room.roomName }}</h2>
                    <span class="room-doc"><i class="bi bi-person-fill"></i> {{ room.doctorName }} ({{ room.specialtyName }})</span>
                  </div>
                  <div class="room-waiting-pill">
                    Đang chờ: <strong>{{ room.waitingCount }}</strong>
                  </div>
                </div>

                <!-- Card Body: Current Call & Current Exam -->
                <div class="card-room-body">
                  <!-- Section: Đang Gọi (CALLED) -->
                  <div class="status-box box-called">
                    <div class="box-label">
                      <span class="pulse-indicator"></span> MỜI VÀO PHÒNG KHÁM
                    </div>
                    <div class="box-ticket-number neon-yellow">
                      {{ room.currentCalledTicketNumber }}
                    </div>
                    <div class="box-patient-name">
                      {{ room.currentCalledPatientName || '---' }}
                    </div>
                  </div>

                  <!-- Section: Đang Khám (IN_PROGRESS) -->
                  <div class="status-box box-examining">
                    <div class="box-label">
                      <i class="bi bi-heart-pulse-fill"></i> ĐANG KHÁM
                    </div>
                    <div class="box-ticket-number neon-green">
                      {{ room.currentExaminingTicketNumber }}
                    </div>
                    <div class="box-patient-name">
                      {{ room.currentExaminingPatientName || '---' }}
                    </div>
                  </div>
                </div>

                <!-- Card Footer: Upcoming Tickets -->
                <div class="card-room-footer">
                  <span class="footer-label">Chuẩn bị:</span>
                  <div class="upcoming-tags">
                    @if (room.upcomingTicketNumbers.length === 0) {
                      <span class="no-upcoming">Không có số chờ tiếp theo</span>
                    } @else {
                      @for (num of room.upcomingTicketNumbers; track num) {
                        <span class="upcoming-tag">{{ num }}</span>
                      }
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </main>

      <!-- TV Marquee Ticker -->
      <footer class="tv-footer-ticker">
        <div class="ticker-label"><i class="bi bi-megaphone-fill"></i> THÔNG BÁO:</div>
        <div class="ticker-scroll">
          <span class="ticker-text">
            Quý bệnh nhân vui lòng theo dõi số thứ tự trên màn hình và chuẩn bị sẵn CCCD / thẻ BHYT khi được gọi tên vào phòng khám. 
            Để tra cứu thời gian chờ trên điện thoại, vui lòng quét mã QR tại quầy tiếp đón. Trân trọng cảm ơn!
          </span>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100vw;
      min-height: 100vh;
      background: #090d16;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow-x: hidden;
    }

    .tv-display-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: radial-gradient(circle at top right, #131c31 0%, #090d16 100%);
      padding: 1.5rem 2rem;
      box-sizing: border-box;
    }

    /* Header */
    .tv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1.25rem;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1.5rem;
    }

    .tv-brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .brand-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      box-shadow: 0 0 25px rgba(2, 132, 199, 0.5);
    }

    .brand-title {
      font-size: 1.75rem;
      font-weight: 900;
      letter-spacing: 0.05em;
      margin: 0;
      color: #38bdf8;
    }

    .brand-sub {
      font-size: 0.85rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .tv-clock {
      text-align: right;
    }

    .clock-time {
      font-family: 'Courier New', Courier, monospace;
      font-size: 2.25rem;
      font-weight: 900;
      color: #38bdf8;
      line-height: 1;
      letter-spacing: 0.05em;
      text-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
    }

    .clock-date {
      font-size: 0.9rem;
      color: #94a3b8;
      font-weight: 600;
      margin-top: 0.25rem;
    }

    /* Main Grid */
    .tv-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .room-tv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 1.75rem;
    }

    .room-tv-card {
      background: rgba(18, 26, 47, 0.75);
      border: 1px solid rgba(56, 189, 248, 0.2);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      transition: all 0.3s;
    }

    .room-tv-card:hover {
      border-color: rgba(56, 189, 248, 0.5);
      box-shadow: 0 20px 45px -5px rgba(2, 132, 199, 0.3);
    }

    .card-room-header {
      background: rgba(30, 41, 59, 0.8);
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .room-num-badge {
      font-family: monospace;
      font-size: 1.6rem;
      font-weight: 900;
      background: #0284c7;
      color: #ffffff;
      padding: 0.3rem 0.75rem;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }

    .room-meta {
      flex: 1;
    }

    .room-title {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0;
      color: #f1f5f9;
    }

    .room-doc {
      font-size: 0.85rem;
      color: #38bdf8;
      display: block;
      margin-top: 0.15rem;
    }

    .room-waiting-pill {
      background: rgba(255, 255, 255, 0.1);
      padding: 0.35rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      color: #cbd5e1;
    }

    .room-waiting-pill strong {
      color: #f59e0b;
    }

    /* Card Body */
    .card-room-body {
      padding: 1.5rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      flex: 1;
    }

    .status-box {
      border-radius: 14px;
      padding: 1.25rem 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border: 1px solid transparent;
    }

    .box-called {
      background: rgba(245, 158, 11, 0.08);
      border-color: rgba(245, 158, 11, 0.3);
    }

    .box-examining {
      background: rgba(16, 185, 129, 0.08);
      border-color: rgba(16, 185, 129, 0.3);
    }

    .box-label {
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }

    .box-called .box-label { color: #f59e0b; }
    .box-examining .box-label { color: #10b981; }

    .pulse-indicator {
      width: 10px;
      height: 10px;
      background: #f59e0b;
      border-radius: 50%;
      box-shadow: 0 0 10px #f59e0b;
      animation: pulseAlert 1.2s infinite;
    }

    @keyframes pulseAlert {
      0% { transform: scale(0.9); opacity: 0.7; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.9); opacity: 0.7; }
    }

    .box-ticket-number {
      font-family: 'Courier New', Courier, monospace;
      font-size: 3rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.05em;
      margin-bottom: 0.4rem;
    }

    .neon-yellow {
      color: #fbbf24;
      text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
    }

    .neon-green {
      color: #34d399;
      text-shadow: 0 0 20px rgba(52, 211, 153, 0.6);
    }

    .box-patient-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #e2e8f0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Footer Upcoming */
    .card-room-footer {
      background: rgba(15, 23, 42, 0.6);
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .footer-label {
      font-size: 0.85rem;
      font-weight: 700;
      color: #94a3b8;
      white-space: nowrap;
    }

    .upcoming-tags {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .upcoming-tag {
      font-family: monospace;
      font-size: 0.9rem;
      font-weight: 800;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }

    .no-upcoming {
      font-size: 0.8rem;
      color: #64748b;
      font-style: italic;
    }

    /* Marquee */
    .tv-footer-ticker {
      margin-top: 1.5rem;
      background: rgba(2, 132, 199, 0.15);
      border: 1px solid rgba(2, 132, 199, 0.3);
      border-radius: 12px;
      padding: 0.65rem 1rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      overflow: hidden;
    }

    .ticker-label {
      font-size: 0.85rem;
      font-weight: 900;
      color: #38bdf8;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .ticker-scroll {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
    }

    .ticker-text {
      display: inline-block;
      padding-left: 100%;
      animation: marquee 25s linear infinite;
      font-size: 0.95rem;
      font-weight: 600;
      color: #e2e8f0;
    }

    @keyframes marquee {
      0% { transform: translate(0, 0); }
      100% { transform: translate(-100%, 0); }
    }

    .tv-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 400px;
    }

    .tv-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(56, 189, 248, 0.2);
      border-top-color: #38bdf8;
      border-radius: 50%;
      animation: spin 1s infinite linear;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class QueueDisplayComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);

  readonly boards = signal<ClinicDisplayBoard[]>([]);
  readonly loading = signal(true);
  readonly currentTime = signal('');
  readonly currentDate = signal('');

  private clockTimer: any = null;
  private pollingTimer: any = null;

  ngOnInit(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);

    this.loadDisplayBoard();
    // Cập nhật tự động mỗi 3 giây
    this.pollingTimer = setInterval(() => this.loadDisplayBoard(false), 3000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.pollingTimer) clearInterval(this.pollingTimer);
  }

  updateClock(): void {
    const now = new Date();
    this.currentTime.set(
      now.toLocaleTimeString('vi-VN', { hour12: false })
    );
    this.currentDate.set(
      now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    );
  }

  loadDisplayBoard(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.queueService.getDisplayBoard().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.boards.set(res.data);
        }
        if (showLoading) this.loading.set(false);
      },
      error: () => {
        if (showLoading) this.loading.set(false);
      }
    });
  }
}
