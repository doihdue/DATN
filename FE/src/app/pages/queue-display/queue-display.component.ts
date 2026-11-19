import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QueueService } from '../../services/queue.service';
import { AuthService } from '../../services/auth.service';
import { ClinicDisplayBoard } from '../../models/queue.model';

@Component({
  selector: 'app-queue-display',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="tv-display-container">
      <header class="tv-header">
        <div class="tv-brand">
          <h1 class="brand-title">MedQueue</h1>
          <span class="brand-sub">Bảng gọi số khám bệnh</span>
        </div>

        <div class="tv-header-actions">
          <button type="button" class="tv-btn-action" (click)="toggleFullscreen()" title="Bật/Tắt chế độ Toàn màn hình TV (F11)">
            <i class="bi" [ngClass]="isFullscreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'"></i>
            <span>{{ isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình' }}</span>
          </button>
          @if (authService.isAuthenticated()) {
            <a [routerLink]="getReturnUrl()" class="tv-btn-action tv-btn-back" title="Quay lại bàn làm việc">
              <i class="bi bi-arrow-left"></i>
              <span>Quay lại</span>
            </a>
          }
        </div>

        <div class="tv-clock">
          <div class="clock-time">{{ currentTime() }}</div>
          <div class="clock-date">{{ currentDate() }}</div>
        </div>
      </header>

      <main class="tv-content">
        @if (loading() && boards().length === 0) {
          <div class="tv-loading">
            <div class="tv-spinner"></div>
            <p>Đang tải dữ liệu hàng đợi...</p>
          </div>
        } @else {
          <div class="room-tv-grid">
            @for (room of boards(); track room.roomId) {
              <section class="room-tv-card">
                <div class="card-room-header">
                  <div class="room-num-badge">{{ room.roomNumber }}</div>
                  <div class="room-meta">
                    <h2 class="room-title">{{ room.roomName }}</h2>
                    <span class="room-doc">{{ room.doctorName }}{{ room.specialtyName ? ' · ' + room.specialtyName : '' }}</span>
                  </div>
                  <div class="room-waiting">
                    <span class="room-waiting-label">Đang chờ</span>
                    <strong>{{ room.waitingCount }}</strong>
                  </div>
                </div>

                <div class="card-room-body">
                  <div class="status-box box-called">
                    <div class="box-label">Mời vào phòng</div>
                    <!-- Phần tử được tạo lại khi số gọi thay đổi để chạy hiệu ứng nhấn mạnh một lần -->
                    @for (calledNo of [room.currentCalledTicketNumber]; track calledNo) {
                      <div class="box-ticket-number called-number">{{ calledNo }}</div>
                    }
                    <div class="box-patient-name">{{ room.currentCalledPatientName || '—' }}</div>
                  </div>

                  <div class="status-box box-examining">
                    <div class="box-label">Đang khám</div>
                    <div class="box-ticket-number examining-number">{{ room.currentExaminingTicketNumber }}</div>
                    <div class="box-patient-name">{{ room.currentExaminingPatientName || '—' }}</div>
                  </div>
                </div>

                <div class="card-room-footer">
                  <span class="footer-label">Số tiếp theo</span>
                  <div class="upcoming-tags">
                    @if (room.upcomingTicketNumbers.length === 0) {
                      <span class="no-upcoming">Không có</span>
                    } @else {
                      @for (num of room.upcomingTicketNumbers; track num) {
                        <span class="upcoming-tag">{{ num }}</span>
                      }
                    }
                  </div>
                </div>
              </section>
            }
          </div>
        }
      </main>

      <footer class="tv-footer-ticker">
        <span class="ticker-label">Lưu ý</span>
        <span class="ticker-text">
          Theo dõi số thứ tự trên màn hình và chuẩn bị CCCD / thẻ BHYT khi được gọi.
          Tra cứu thời gian chờ bằng mã QR tại quầy tiếp đón.
        </span>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      --tv-bg: #111418;
      --tv-surface: #191d23;
      --tv-surface-2: #20252c;
      --tv-border: #2b313a;
      --tv-text: #f2f4f7;
      --tv-muted: #9aa3af;
      --tv-called: #f5c451;
      --tv-called-bg: rgba(245, 196, 81, 0.08);

      display: block;
      width: 100%;
      min-height: 100vh;
      background: var(--tv-bg);
      color: var(--tv-text);
      font-family: var(--font-family);
      overflow-x: hidden;
      box-sizing: border-box;
    }

    .tv-display-container {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      padding: 20px 24px;
      box-sizing: border-box;
      width: 100%;
    }

    .tv-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--tv-border);
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .tv-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tv-btn-action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: var(--radius-md, 8px);
      background: var(--tv-surface-2);
      border: 1px solid var(--tv-border);
      color: var(--tv-text);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .tv-btn-action:hover {
      background: var(--tv-border);
      color: var(--tv-called);
      border-color: var(--tv-called);
    }

    .tv-btn-back:hover {
      color: #60a5fa;
      border-color: #3b82f6;
    }

    .tv-brand { display: flex; flex-direction: column; gap: 2px; }
    .brand-title { font-size: 26px; font-weight: 600; margin: 0; color: var(--tv-text); }
    .brand-sub { font-size: 16px; color: var(--tv-muted); }

    .tv-clock { text-align: right; }
    .clock-time {
      font-size: 40px;
      font-weight: 600;
      line-height: 1;
      color: var(--tv-text);
      font-variant-numeric: tabular-nums;
    }
    .clock-date { font-size: 15px; color: var(--tv-muted); margin-top: 6px; }

    .tv-content { flex: 1; width: 100%; }

    .room-tv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 18px;
      width: 100%;
    }

    @media (min-width: 1160px) and (max-width: 1550px) {
      .room-tv-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .room-tv-card {
      display: flex;
      flex-direction: column;
      background: var(--tv-surface);
      border: 1px solid var(--tv-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .card-room-header {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-bottom: 1px solid var(--tv-border);
    }

    .room-num-badge {
      flex-shrink: 0;
      min-width: 72px;
      padding: 6px 10px;
      text-align: center;
      font-size: 22px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--tv-text);
      background: var(--tv-surface-2);
      border: 1px solid var(--tv-border);
      border-radius: var(--radius-md);
    }

    .room-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .room-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: var(--tv-text);
      line-height: 1.3;
    }
    .room-doc {
      font-size: 14px;
      color: var(--tv-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .room-waiting { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .room-waiting-label { font-size: 13px; color: var(--tv-muted); }
    .room-waiting strong { font-size: 24px; font-weight: 600; font-variant-numeric: tabular-nums; line-height: 1.1; }

    .card-room-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      flex: 1;
    }

    .status-box {
      padding: 18px 16px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      gap: 6px;
      min-width: 0;
    }

    .box-called { background: var(--tv-called-bg); border-right: 1px solid var(--tv-border); }

    .box-label { font-size: 15px; font-weight: 500; color: var(--tv-muted); }
    .box-called .box-label { color: var(--tv-called); }

    .box-ticket-number {
      font-weight: 600;
      line-height: 1.05;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.01em;
      border-radius: var(--radius-md);
    }

    .called-number {
      font-size: 64px;
      color: var(--tv-called);
      animation: callHighlight 1s ease-out 3;
    }

    .examining-number {
      font-size: 44px;
      color: var(--tv-text);
    }

    /* Nhấn mạnh tiết chế khi có số mới được gọi: nền sáng lên rồi tắt dần, lặp 3 lần */
    @keyframes callHighlight {
      0% { background-color: rgba(245, 196, 81, 0.28); }
      100% { background-color: transparent; }
    }

    .box-patient-name {
      font-size: 18px;
      font-weight: 500;
      color: var(--tv-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card-room-footer {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-top: 1px solid var(--tv-border);
      background: var(--tv-surface-2);
    }

    .footer-label { font-size: 14px; color: var(--tv-muted); white-space: nowrap; }
    .upcoming-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .upcoming-tag {
      font-size: 16px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: var(--tv-text);
      background: var(--tv-surface);
      border: 1px solid var(--tv-border);
      padding: 2px 8px;
      border-radius: var(--radius-sm);
    }
    .no-upcoming { font-size: 14px; color: var(--tv-muted); }

    .tv-footer-ticker {
      margin-top: 24px;
      display: flex;
      align-items: baseline;
      gap: 16px;
      padding: 12px 18px;
      background: var(--tv-surface);
      border: 1px solid var(--tv-border);
      border-radius: var(--radius-lg);
    }
    .ticker-label { font-size: 15px; font-weight: 600; color: var(--tv-text); white-space: nowrap; }
    .ticker-text { font-size: 16px; color: var(--tv-muted); }

    .tv-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      color: var(--tv-muted);
      font-size: 18px;
    }

    .tv-spinner {
      width: 44px;
      height: 44px;
      border: 4px solid var(--tv-border);
      border-top-color: var(--tv-text);
      border-radius: 50%;
      animation: spin 1s infinite linear;
      margin-bottom: 16px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (prefers-reduced-motion: reduce) {
      .called-number { animation: none; }
    }

    @media (max-width: 600px) {
      .tv-display-container { padding: 16px; }
      .room-tv-grid { grid-template-columns: 1fr; }
      .called-number { font-size: 48px; }
      .examining-number { font-size: 34px; }
    }
  `]
})
export class QueueDisplayComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);
  readonly authService = inject(AuthService);

  readonly boards = signal<ClinicDisplayBoard[]>([]);
  readonly loading = signal(true);
  readonly currentTime = signal('');
  readonly currentDate = signal('');

  isFullscreen = false;

  private clockTimer: any = null;
  private pollingTimer: any = null;

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.isFullscreen = !!document.fullscreenElement;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.isFullscreen = false;
        }).catch(() => {});
      }
    }
  }

  getReturnUrl(): string {
    if (this.authService.isAdmin()) return '/dashboard';
    if (this.authService.isDoctor()) return '/doctor/examination';
    if (this.authService.isStaff()) return '/staff/check-in';
    if (this.authService.isLabTech()) return '/lab';
    return '/';
  }

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
