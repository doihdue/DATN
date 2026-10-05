import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface QueueRoom {
  roomNumber: string;
  roomName: string;
  doctorName: string;
  specialty: string;
  currentTicket: string;
  nextTickets: string[];
  status: 'CALLING' | 'EXAMINING' | 'WAITING';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-page">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <span class="live-dot"></span> Hệ Thống Phòng Khám Thông Minh
          </div>
          <h1 class="hero-title">
            Đặt Lịch Khám Nhanh Chóng<br />
            <span class="highlight-text">Quản Lý Hàng Đợi Điện Tử</span>
          </h1>
          <p class="hero-desc">
            Giải pháp số hóa toàn diện quy trình khám chữa bệnh: Đặt lịch trực tuyến, cấp số thứ tự tự động, 
            giảm 85% thời gian chờ đợi và hỗ trợ tư vấn phân luồng bệnh bằng AI.
          </p>

          <div class="hero-actions">
            @if (!authService.isAuthenticated()) {
              <a routerLink="/register" class="btn btn-primary btn-lg">
                <i class="bi bi-calendar-plus"></i> Đăng Ký Khám Bệnh Ngay
              </a>
              <a routerLink="/login" class="btn btn-outline btn-lg">
                <i class="bi bi-box-arrow-in-right"></i> Đăng Nhập Hệ Thống
              </a>
            } @else {
              <div class="user-greeting-banner">
                <div class="greeting-text">
                  <span class="welcome-label">Xin chào bạn trở lại,</span>
                  <span class="welcome-name">{{ authService.currentUser()?.fullName }}!</span>
                </div>
                <div class="role-tags">
                  @for (role of authService.userRoles(); track role) {
                    <span class="badge" [ngClass]="getRoleBadgeClass(role)">
                      <i class="bi bi-patch-check-fill"></i> {{ getRoleDisplayName(role) }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Quick Stats Banner -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon icon-blue"><i class="bi bi-clock-history"></i></div>
            <div class="stat-info">
              <span class="stat-value">15 phút</span>
              <span class="stat-label">Thời gian chờ TB</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-green"><i class="bi bi-ticket-detailed"></i></div>
            <div class="stat-info">
              <span class="stat-value">Tự Động</span>
              <span class="stat-label">Cấp số thứ tự online</span>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-purple"><i class="bi bi-robot"></i></div>
            <div class="stat-info">
              <span class="stat-value">24/7</span>
              <span class="stat-label">AI Tư vấn & Phân luồng</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Interactive Live Queue Display Board -->
      <section class="queue-board-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <span class="sub-badge"><i class="bi bi-broadcast"></i> Thời Gian Thực</span>
            <h2 class="section-title">Bảng Gọi Số Khám Điện Tử</h2>
            <p class="section-desc">Theo dõi tiến độ khám và số thứ tự đang được gọi tại các phòng khám</p>
          </div>
          <div class="live-clock">
            <i class="bi bi-clock"></i> Cập nhật liên tục
          </div>
        </div>

        <div class="rooms-grid">
          @for (room of sampleQueueRooms; track room.roomNumber) {
            <div class="room-card glass-card">
              <div class="room-header">
                <div>
                  <span class="room-tag">{{ room.roomNumber }}</span>
                  <h3 class="room-name">{{ room.roomName }}</h3>
                </div>
                <span class="status-indicator" [ngClass]="room.status.toLowerCase()">
                  @if (room.status === 'CALLING') {
                    <i class="bi bi-megaphone-fill"></i> Đang gọi số
                  } @else {
                    <i class="bi bi-heart-pulse-fill"></i> Đang khám
                  }
                </span>
              </div>

              <div class="doctor-meta">
                <i class="bi bi-person-badge"></i> {{ room.doctorName }} • <strong>{{ room.specialty }}</strong>
              </div>

              <!-- Current Number -->
              <div class="current-ticket-box">
                <span class="ticket-caption">SỐ ĐANG KHÁM</span>
                <span class="ticket-number">{{ room.currentTicket }}</span>
              </div>

              <!-- Upcoming Numbers -->
              <div class="next-tickets-row">
                <span class="next-label">Chuẩn bị:</span>
                <div class="next-chips">
                  @for (next of room.nextTickets; track next) {
                    <span class="next-chip">{{ next }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Role-Specific Action Panels -->
      @if (authService.isAuthenticated()) {
        <section class="portal-actions-section">
          <div class="section-header">
            <h2 class="section-title">Chức Năng Theo Quyền Của Bạn</h2>
          </div>

          <div class="actions-grid">
            @if (authService.hasRole('PATIENT')) {
              <div class="action-card glass-card">
                <div class="action-icon icon-blue"><i class="bi bi-calendar-check"></i></div>
                <h3 class="action-title">Đặt Lịch Khám Mới</h3>
                <p class="action-desc">Chọn bác sĩ, chuyên khoa và khung giờ khám tiện lợi không phải xếp hàng chờ.</p>
                <button class="btn btn-outline btn-sm">Đặt lịch ngay <i class="bi bi-arrow-right"></i></button>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-green"><i class="bi bi-ticket-perforated"></i></div>
                <h3 class="action-title">Lấy Phiếu & Tra Cứu Hàng Đợi</h3>
                <p class="action-desc">Nhận phiếu số thứ tự trực tuyến hoặc tra cứu vị trí khám của bạn theo thời gian thực.</p>
                <a routerLink="/queue/tracking" class="btn btn-outline btn-sm">Tra cứu phiếu của tôi <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-purple"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Bảng Gọi Số TV Sảnh Chờ</h3>
                <p class="action-desc">Xem trực tiếp bảng gọi số điện tử và trạng thái các phòng khám tại sảnh.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Xem bảng TV <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('DOCTOR')) {
              <div class="action-card glass-card">
                <div class="action-icon icon-blue"><i class="bi bi-megaphone-fill"></i></div>
                <h3 class="action-title">Bàn Khám & Gọi Số Bác Sĩ</h3>
                <p class="action-desc">Xem danh sách bệnh nhân đang đợi và thực hiện bấm chuông gọi số tiếp theo.</p>
                <a routerLink="/doctor/calling" class="btn btn-primary btn-sm">Vào phòng gọi khám <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-green"><i class="bi bi-calendar-week-fill"></i></div>
                <h3 class="action-title">Lịch Trực & Ca Khám</h3>
                <p class="action-desc">Theo dõi các ca trực được phân công theo ngày và số lượt khám đã tiếp nhận.</p>
                <a routerLink="/doctor/schedule" class="btn btn-outline btn-sm">Xem lịch trực <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('STAFF')) {
              <div class="action-card glass-card">
                <div class="action-icon icon-amber"><i class="bi bi-person-check-fill"></i></div>
                <h3 class="action-title">Quầy Điều Phối & Tiếp Đón</h3>
                <p class="action-desc">Tiếp đón bệnh nhân, cấp số thứ tự vào phòng khám và xử lý ưu tiên cấp cứu.</p>
                <a routerLink="/staff/queue" class="btn btn-primary btn-sm">Mở bàn điều phối <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-blue"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Màn Hình Hàng Đợi Lớn</h3>
                <p class="action-desc">Mở chế độ toàn màn hình cho tivi hiển thị bảng gọi số tại sảnh chờ.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Mở chế độ TV Kiosk <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('ADMIN')) {
              <div class="action-card glass-card">
                <div class="action-icon icon-purple"><i class="bi bi-diagram-3-fill"></i></div>
                <h3 class="action-title">Quản Lý Chuyên Khoa</h3>
                <p class="action-desc">Cấu hình danh mục chuyên khoa phòng khám, quản lý và phân bổ bác sĩ.</p>
                <a routerLink="/admin/specialties" class="btn btn-primary btn-sm">Quản lý chuyên khoa <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-blue"><i class="bi bi-calendar-week-fill"></i></div>
                <h3 class="action-title">Cấu Hình Lịch Trực & Phòng</h3>
                <p class="action-desc">Phân ca làm việc, kiểm tra xung đột trùng giờ và thiết lập giới hạn bệnh nhân.</p>
                <a routerLink="/admin/schedules" class="btn btn-outline btn-sm">Cấu hình lịch làm việc <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card glass-card">
                <div class="action-icon icon-amber"><i class="bi bi-sliders"></i></div>
                <h3 class="action-title">Bàn Điều Phối Hàng Đợi</h3>
                <p class="action-desc">Theo dõi điều phối hàng đợi thời gian thực, can thiệp gọi số và cấp cứu.</p>
                <a routerLink="/staff/queue" class="btn btn-outline btn-sm">Mở điều phối <i class="bi bi-arrow-right"></i></a>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .home-page {
      max-width: 1300px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 3.5rem;
    }

    /* Hero Section */
    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2rem;
      padding: 2.5rem 1rem 1rem;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #e0f2fe;
      color: var(--primary-800);
      font-size: 0.85rem;
      font-weight: 700;
      padding: 0.4rem 1rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      background: var(--emerald-500);
      border-radius: 50%;
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .hero-title {
      font-size: 2.85rem;
      font-weight: 800;
      color: var(--primary-900);
      line-height: 1.15;
      letter-spacing: -0.03em;
    }

    .highlight-text {
      background: linear-gradient(135deg, var(--primary-600) 0%, var(--indigo-600) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-desc {
      font-size: 1.1rem;
      color: var(--text-muted);
      max-width: 720px;
      line-height: 1.6;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .btn-lg {
      padding: 0.95rem 2rem;
      font-size: 1.05rem;
      border-radius: var(--radius-md);
    }

    .user-greeting-banner {
      background: #ffffff;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
      border-radius: var(--radius-lg);
      padding: 1rem 1.75rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1.5rem;
    }

    .greeting-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .welcome-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .welcome-name {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--primary-900);
    }

    .role-tags {
      display: flex;
      gap: 0.5rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      width: 100%;
      max-width: 900px;
      margin-top: 1rem;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }

    .icon-blue { background: #e0f2fe; color: #0284c7; }
    .icon-green { background: #dcfce7; color: #16a34a; }
    .icon-purple { background: #f3e8ff; color: #9333ea; }
    .icon-amber { background: #fef3c7; color: #d97706; }

    .stat-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .stat-value {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Queue Board Section */
    .queue-board-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .sub-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--primary-600);
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.25rem;
    }

    .section-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary-900);
      letter-spacing: -0.02em;
    }

    .section-desc {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .live-clock {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
      padding: 0.4rem 1rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--primary-700);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .room-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      border-top: 4px solid var(--primary-600);
    }

    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .room-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--primary-600);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .room-name {
      font-size: 1.2rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.3rem 0.65rem;
      border-radius: var(--radius-full);
    }

    .status-indicator.calling {
      background: #fef3c7;
      color: #b45309;
      animation: pulse-border 1.5s infinite;
    }

    .status-indicator.examining {
      background: #dcfce7;
      color: #15803d;
    }

    .doctor-meta {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .current-ticket-box {
      background: linear-gradient(135deg, var(--primary-800) 0%, var(--primary-950, #082f49) 100%);
      color: #ffffff;
      border-radius: var(--radius-md);
      padding: 1.25rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      box-shadow: 0 10px 15px -3px rgba(2, 132, 199, 0.2);
    }

    .ticket-caption {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      opacity: 0.8;
    }

    .ticket-number {
      font-size: 2.75rem;
      font-weight: 900;
      letter-spacing: 0.05em;
      color: #38bdf8;
    }

    .next-tickets-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .next-label {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .next-chips {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .next-chip {
      background: #f1f5f9;
      color: var(--text-main);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 700;
      border: 1px solid var(--border-color);
    }

    /* Portal Actions Section */
    .portal-actions-section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .action-card {
      padding: 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: flex-start;
      transition: all 0.2s;
    }

    .action-card:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-xl);
    }

    .action-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
    }

    .action-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .action-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 0.5rem;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2.1rem;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomeComponent {
  readonly authService = inject(AuthService);

  sampleQueueRooms: QueueRoom[] = [
    {
      roomNumber: 'PHÒNG 101',
      roomName: 'Khám Nội Tổng Quát',
      doctorName: 'BS.CKII Nguyễn Văn Hùng',
      specialty: 'Khoa Khám Bệnh',
      currentTicket: 'A-012',
      nextTickets: ['A-013', 'A-014', 'A-015'],
      status: 'CALLING'
    },
    {
      roomNumber: 'PHÒNG 102',
      roomName: 'Khám Chuyên Khoa Tim Mạch',
      doctorName: 'ThS.BS Trần Đức Minh',
      specialty: 'Khoa Tim Mạch',
      currentTicket: 'B-008',
      nextTickets: ['B-009', 'B-010'],
      status: 'EXAMINING'
    },
    {
      roomNumber: 'PHÒNG 103',
      roomName: 'Khám Nhi & Tiêm Chủng',
      doctorName: 'BS.CKI Phạm Quỳnh Nga',
      specialty: 'Khoa Nhi',
      currentTicket: 'C-019',
      nextTickets: ['C-020', 'C-021', 'C-022'],
      status: 'CALLING'
    }
  ];

  getRoleBadgeClass(role: string): string {
    if (role.includes('PATIENT')) return 'badge-patient';
    if (role.includes('DOCTOR')) return 'badge-doctor';
    if (role.includes('STAFF')) return 'badge-staff';
    if (role.includes('ADMIN')) return 'badge-admin';
    return '';
  }

  getRoleDisplayName(role: string): string {
    if (role.includes('PATIENT')) return 'Bệnh nhân';
    if (role.includes('DOCTOR')) return 'Bác sĩ';
    if (role.includes('STAFF')) return 'Lễ tân';
    if (role.includes('ADMIN')) return 'Quản trị';
    return role.replace('ROLE_', '');
  }
}
