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
      <!-- Clinical Welcome Banner -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-badge">
            <i class="bi bi-shield-check"></i> Cổng Tiếp Đón & Quản Lý Hàng Đợi Điện Tử
          </div>
          <h1 class="hero-title">
            Hệ Thống Đặt Lịch Khám &amp; Điều Phối Số Hàng Đợi
          </h1>
          <p class="hero-desc">
            Giải pháp số hóa quy trình tiếp đón bệnh nhân tại phòng khám: Cấp số thứ tự tự động, 
            theo dõi thời gian thực tại sảnh chờ, tối ưu hóa thời gian khám chữa bệnh và hỗ trợ tư vấn phân luồng bằng AI.
          </p>

          <div class="hero-actions">
            @if (!authService.isAuthenticated()) {
              <a routerLink="/register" class="btn btn-primary btn-lg">
                <i class="bi bi-calendar-plus"></i> Đăng Ký Khám Bệnh
              </a>
              <a routerLink="/queue/tracking" class="btn btn-outline btn-lg">
                <i class="bi bi-ticket-perforated"></i> Tra Cứu Phiếu Khám
              </a>
              <a routerLink="/login" class="btn btn-secondary btn-lg">
                <i class="bi bi-box-arrow-in-right"></i> Đăng Nhập Cán Bộ Y Tế
              </a>
            } @else {
              <div class="user-greeting-banner">
                <div class="greeting-avatar">
                  <i class="bi bi-person-circle"></i>
                </div>
                <div class="greeting-text">
                  <span class="welcome-label">Xin chào cán bộ y tế / bệnh nhân,</span>
                  <span class="welcome-name">{{ authService.currentUser()?.fullName }}</span>
                </div>
                <div class="role-tags">
                  @for (role of authService.userRoles(); track role) {
                    <span class="badge" [ngClass]="getRoleBadgeClass(role)">
                      <i class="bi bi-check-circle-fill"></i> {{ getRoleDisplayName(role) }}
                    </span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Quick Stats Overview -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon icon-blue">
              <i class="bi bi-clock-history"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value num">10 - 15 phút</span>
              <span class="stat-label">Thời gian chờ dự kiến</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-teal">
              <i class="bi bi-qr-code"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">Cấp Số Tự Động</span>
              <span class="stat-label">Qua hệ thống trực tuyến &amp; Kiosk</span>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-icon icon-indigo">
              <i class="bi bi-robot"></i>
            </div>
            <div class="stat-info">
              <span class="stat-value">Tư Vấn AI 24/7</span>
              <span class="stat-label">Phân luồng chuyên khoa chính xác</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Live Clinical Queue Monitor -->
      <section class="queue-board-section">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="sub-badge"><i class="bi bi-broadcast"></i> Theo Dõi Trực Tuyến</div>
            <h2 class="section-title">Bảng Theo Dõi Số Khám Tại Các Phòng</h2>
            <p class="section-desc">Tiến độ gọi số và trạng thái khám bệnh hiện thời tại sảnh tiếp đón</p>
          </div>
          <div class="header-right-actions">
            <a routerLink="/queue" class="btn btn-outline btn-sm">
              <i class="bi bi-tv"></i> Mở Màn Hình TV Sảnh Chờ
            </a>
          </div>
        </div>

        <div class="rooms-grid">
          @for (room of sampleQueueRooms; track room.roomNumber) {
            <div class="room-card medical-card">
              <div class="room-header">
                <div class="room-title-group">
                  <span class="room-tag">{{ room.roomNumber }}</span>
                  <h3 class="room-name">{{ room.roomName }}</h3>
                </div>
                <span class="status-indicator" [ngClass]="room.status.toLowerCase()">
                  @if (room.status === 'CALLING') {
                    <i class="bi bi-bell-fill"></i> Đang gọi số
                  } @else {
                    <i class="bi bi-heart-pulse-fill"></i> Đang khám
                  }
                </span>
              </div>

              <div class="doctor-meta">
                <i class="bi bi-person-badge"></i> {{ room.doctorName }}
                <span class="specialty-dot">•</span>
                <strong>{{ room.specialty }}</strong>
              </div>

              <!-- Main Calling Ticket -->
              <div class="current-ticket-box">
                <span class="ticket-caption">SỐ ĐANG TIẾP NHẬN</span>
                <span class="ticket-number num">{{ room.currentTicket }}</span>
              </div>

              <!-- Upcoming Tickets List -->
              <div class="next-tickets-row">
                <span class="next-label">Chuẩn bị:</span>
                <div class="next-chips">
                  @for (next of room.nextTickets; track next) {
                    <span class="next-chip num">{{ next }}</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Role-Specific Action Shortcuts -->
      @if (authService.isAuthenticated()) {
        <section class="portal-actions-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Chức Năng Phân Quyền</h2>
              <p class="section-desc">Truy cập các tính năng theo vai trò công tác của bạn</p>
            </div>
          </div>

          <div class="actions-grid">
            @if (authService.hasRole('PATIENT')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-calendar-check"></i></div>
                <h3 class="action-title">Đăng Ký Khám Mới</h3>
                <p class="action-desc">Chọn bác sĩ, chuyên khoa và khung giờ thuận tiện giúp hạn chế tối đa xếp hàng.</p>
                <a routerLink="/register" class="btn btn-outline btn-sm">Đăng ký ngay <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-ticket-perforated"></i></div>
                <h3 class="action-title">Tra Cứu Phiếu &amp; Hàng Đợi</h3>
                <p class="action-desc">Xem tiến độ gọi số khám của bạn theo thời gian thực và thời gian dự kiến.</p>
                <a routerLink="/queue/tracking" class="btn btn-outline btn-sm">Xem tiến độ phiếu <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Bảng Gọi Số Sảnh Chờ</h3>
                <p class="action-desc">Theo dõi toàn bộ danh sách phòng khám trên màn hình lớn sảnh bệnh viện.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Mở bảng TV <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('DOCTOR')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-clipboard2-pulse"></i></div>
                <h3 class="action-title">Bàn Khám Bệnh &amp; Kê Đơn</h3>
                <p class="action-desc">Ghi nhận chỉ số sinh tồn, chẩn đoán ICD-10 và lập đơn thuốc điện tử cho bệnh nhân.</p>
                <a routerLink="/doctor/examination" class="btn btn-primary btn-sm">Vào bàn khám <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-megaphone"></i></div>
                <h3 class="action-title">Điều Phối &amp; Gọi Số Khám</h3>
                <p class="action-desc">Bấm chuông mời bệnh nhân tiếp theo vào phòng khám hoặc chuyển luồng cấp cứu.</p>
                <a routerLink="/doctor/calling" class="btn btn-outline btn-sm">Vào gọi số <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-calendar-week"></i></div>
                <h3 class="action-title">Lịch Trực Ca Bác Sĩ</h3>
                <p class="action-desc">Theo dõi các ca trực được phân công theo tuần và số lượng bệnh nhân đã tiếp nhận.</p>
                <a routerLink="/doctor/schedule" class="btn btn-outline btn-sm">Xem ca trực <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('STAFF')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-person-plus"></i></div>
                <h3 class="action-title">Bàn Tiếp Đón &amp; Cấp Số</h3>
                <p class="action-desc">Tiếp đón người bệnh, nhập thông tin, cấp số thứ tự vào phòng khám và gắn cờ cấp cứu.</p>
                <a routerLink="/staff/queue" class="btn btn-primary btn-sm">Mở bàn tiếp đón <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-sliders"></i></div>
                <h3 class="action-title">Điều Phối Hàng Đợi</h3>
                <p class="action-desc">Theo dõi danh sách bệnh nhân đang chờ, gọi lại lượt bị nhỡ hoặc đổi phòng khám.</p>
                <a routerLink="/staff/queue" class="btn btn-outline btn-sm">Quản lý hàng đợi <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('ADMIN')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-diagram-3"></i></div>
                <h3 class="action-title">Danh Mục Chuyên Khoa</h3>
                <p class="action-desc">Quản lý chuyên khoa, cấu hình mô tả và chỉ định bác sĩ phụ trách từng chuyên khoa.</p>
                <a routerLink="/admin/specialties" class="btn btn-primary btn-sm">Quản lý chuyên khoa <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-calendar3"></i></div>
                <h3 class="action-title">Cấu Hình Lịch Trực Phòng</h3>
                <p class="action-desc">Xếp lịch làm việc cho bác sĩ, kiểm tra xung đột trùng giờ và thiết lập giới hạn tiếp nhận.</p>
                <a routerLink="/admin/schedules" class="btn btn-outline btn-sm">Cấu hình lịch <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Bảng Gọi Số Sảnh Chờ</h3>
                <p class="action-desc">Theo dõi toàn bộ danh sách phòng khám trên màn hình lớn sảnh bệnh viện thời gian thực.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Mở bảng TV <i class="bi bi-arrow-right"></i></a>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .home-page {
      max-width: 1360px;
      margin: 0 auto;
      padding: 2rem 1.5rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 3rem;
    }

    /* Hero Section */
    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2rem;
      padding: 2rem 1rem 1rem;
      background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 100%);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background-color: #ffffff;
      color: var(--primary-700);
      font-size: 0.825rem;
      font-weight: 700;
      padding: 0.35rem 0.95rem;
      border-radius: var(--radius-full);
      border: 1px solid var(--primary-200);
      box-shadow: var(--shadow-xs);
    }

    .hero-title {
      font-size: 2.35rem;
      font-weight: 800;
      color: var(--primary-950);
      line-height: 1.2;
      letter-spacing: -0.02em;
      max-width: 820px;
    }

    .hero-desc {
      font-size: 1.05rem;
      color: var(--text-secondary);
      max-width: 780px;
      line-height: 1.6;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.85rem;
      margin-top: 0.25rem;
    }

    .user-greeting-banner {
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      border-radius: var(--radius-md);
      padding: 0.85rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .greeting-avatar {
      font-size: 2rem;
      color: var(--primary-600);
      display: flex;
      align-items: center;
    }

    .greeting-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .welcome-label {
      font-size: 0.775rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .welcome-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--primary-900);
    }

    .role-tags {
      display: flex;
      gap: 0.35rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      width: 100%;
      max-width: 960px;
      margin-top: 0.5rem;
    }

    .stat-card {
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 1.15rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-xs);
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .icon-blue { background-color: #e0f2fe; color: #0284c7; }
    .icon-teal { background-color: #ccfbf1; color: #0f766e; }
    .icon-indigo { background-color: #e0e7ff; color: #4338ca; }

    .stat-info {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .stat-value {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Queue Board Section */
    .queue-board-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
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
      color: var(--primary-700);
      font-size: 0.775rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 0.2rem;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: var(--primary-950);
      letter-spacing: -0.01em;
    }

    .section-desc {
      font-size: 0.925rem;
      color: var(--text-muted);
    }

    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }

    .room-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border-top: 3px solid var(--primary-600);
    }

    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .room-title-group {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .room-tag {
      font-size: 0.75rem;
      font-weight: 800;
      color: var(--primary-700);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .room-name {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .status-indicator {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-xs);
    }

    .status-indicator.calling {
      background-color: var(--info-bg);
      color: var(--info-solid);
      border: 1px solid var(--info-border);
    }

    .status-indicator.examining {
      background-color: var(--success-bg);
      color: var(--success-solid);
      border: 1px solid var(--success-border);
    }

    .doctor-meta {
      font-size: 0.85rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .specialty-dot {
      color: var(--text-light);
    }

    .current-ticket-box {
      background-color: var(--primary-900);
      color: #ffffff;
      border-radius: var(--radius-sm);
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .ticket-caption {
      font-size: 0.725rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #93c5fd;
    }

    .ticket-number {
      font-size: 2.35rem;
      font-weight: 900;
      letter-spacing: 0.03em;
      color: #ffffff;
      line-height: 1;
    }

    .next-tickets-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.825rem;
    }

    .next-label {
      font-weight: 700;
      color: var(--text-muted);
    }

    .next-chips {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .next-chip {
      background-color: var(--bg-subtle);
      color: var(--text-secondary);
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-xs);
      font-size: 0.825rem;
      font-weight: 700;
      border: 1px solid var(--border-color);
    }

    /* Actions Grid */
    .portal-actions-section {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .action-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      align-items: flex-start;
    }

    .action-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .action-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .action-desc {
      font-size: 0.875rem;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 0.35rem;
      flex: 1;
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 1.85rem;
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
      roomName: 'Chuyên Khoa Tim Mạch',
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
    if (role.includes('STAFF')) return 'Lễ tân tiếp đón';
    if (role.includes('ADMIN')) return 'Quản trị hệ thống';
    return role.replace('ROLE_', '');
  }
}
