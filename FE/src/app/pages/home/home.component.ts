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
        <div class="hero-ambient-glow"></div>
        <div class="hero-content">
          @if (authService.hasRole('PATIENT')) {
            <div class="hero-badge patient-badge">
              <span class="pulse-dot"></span>
              <span>Hồ Sơ Y Tế Bệnh Nhân • {{ authService.currentUser()?.fullName }}</span>
            </div>

            <h1 class="hero-title">
              Xin chào, <span class="hero-gradient-text">{{ authService.currentUser()?.fullName }}</span>!
            </h1>

            <p class="hero-desc">
              Hồ sơ y tế của bạn đã kết nối thành công với MedQueue. Bạn có thể đăng ký lấy số khám trực tuyến nhanh chóng,
              theo dõi vị trí gọi số theo thời gian thực và tra cứu lịch sử khám bệnh.
            </p>
          } @else if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
            <div class="hero-badge doctor-badge">
              <span class="pulse-dot"></span>
              <span>Bác Sĩ Khám Chữa Bệnh • {{ authService.currentUser()?.fullName }}</span>
            </div>

            <h1 class="hero-title">
              Chào Bác Sĩ, <span class="hero-gradient-text">{{ authService.currentUser()?.fullName }}</span>!
            </h1>

            <p class="hero-desc">
              Chào mừng Bác sĩ đến với Cổng làm việc MedQueue. Bác sĩ có thể tiếp nhận bệnh nhân, ghi nhận chỉ số sinh tồn, chẩn đoán ICD-10 và kê đơn thuốc điện tử.
            </p>
          } @else if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
            <div class="hero-badge staff-badge">
              <span class="pulse-dot"></span>
              <span>Bộ Phận Lễ Tân &amp; Tiếp Đón • {{ authService.currentUser()?.fullName }}</span>
            </div>

            <h1 class="hero-title">
              Bàn Tiếp Đón - <span class="hero-gradient-text">{{ authService.currentUser()?.fullName }}</span>
            </h1>

            <p class="hero-desc">
              Chào mừng bạn đến với Cổng điều hành tiếp đón &amp; điều phối. Tiếp nhận người bệnh, cấp số thứ tự vào phòng khám chuyên khoa và giám sát luồng hàng đợi thời gian thực.
            </p>
          } @else if (authService.hasRole('ADMIN')) {
            <div class="hero-badge admin-badge">
              <span class="pulse-dot"></span>
              <span>Quản Trị Toàn Viện • {{ authService.currentUser()?.fullName }}</span>
            </div>

            <h1 class="hero-title">
              Trung Tâm Điều Hành <span class="hero-gradient-text">MedQueue Admin</span>
            </h1>

            <p class="hero-desc">
              Giám sát toàn diện chỉ số hoạt động bệnh viện, quản lý danh mục chuyên khoa, danh mục dược phẩm và điều phối lịch trực phòng khám.
            </p>
          } @else {
            <div class="hero-badge">
              <span class="pulse-dot"></span>
              <span>Cổng Tiếp Đón &amp; Quản Lý Hàng Đợi Y Tế Điện Tử</span>
            </div>

            <h1 class="hero-title">
              Hệ Thống Đặt Lịch Khám &amp;<br class="hero-title-break" />
              <span class="hero-gradient-text">Điều Phối Hàng Đợi Thông Minh</span>
            </h1>

            <p class="hero-desc">
              Giải pháp số hóa toàn diện quy trình tiếp đón: Tự động cấp số thứ tự, giám sát phòng khám thời gian thực,
              tối ưu hóa thời gian chờ đợi và hỗ trợ tư vấn phân luồng chuyên khoa bằng AI.
            </p>
          }

          <div class="hero-actions">
            @if (!authService.isAuthenticated()) {
              <div class="hero-cta-group">
                <a routerLink="/register" class="btn btn-primary btn-hero">
                  <i class="bi bi-calendar-plus"></i> Đăng Ký Khám Bệnh
                </a>
                <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" class="btn btn-outline btn-hero">
                  <i class="bi bi-ticket-perforated"></i> Lấy Số Khám Online
                </a>
                <a routerLink="/queue/tracking" [queryParams]="{ mode: 'lookup' }" class="btn btn-outline btn-hero">
                  <i class="bi bi-search"></i> Tra Cứu Phiếu Khám
                </a>
                <a routerLink="/queue" class="btn btn-ghost btn-hero">
                  <i class="bi bi-tv"></i> Màn Hình TV Sảnh
                </a>
              </div>
            } @else {
              <!-- Role-Tailored High-End SaaS Launchers -->
              <div class="hero-cta-group">
                @if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
                  <a routerLink="/doctor/calling" class="btn btn-primary btn-hero">
                    <i class="bi bi-megaphone"></i> Bàn Gọi Số Khám
                  </a>
                  <a routerLink="/doctor/examination" class="btn btn-outline btn-hero">
                    <i class="bi bi-clipboard2-pulse"></i> Vào Bàn Khám Bệnh
                  </a>
                  <a routerLink="/doctor/schedule" class="btn btn-ghost btn-hero">
                    <i class="bi bi-calendar2-week"></i> Xem Ca Trực
                  </a>
                }
                @if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
                  <a routerLink="/staff/check-in" class="btn btn-primary btn-hero">
                    <i class="bi bi-person-check-fill"></i> Bàn Tiếp Đón &amp; Cấp Số
                  </a>
                  <a routerLink="/staff/queue" class="btn btn-outline btn-hero">
                    <i class="bi bi-sliders"></i> Điều Phối Hàng Đợi
                  </a>
                  <a routerLink="/queue" class="btn btn-ghost btn-hero">
                    <i class="bi bi-tv"></i> Màn Hình TV Sảnh Chờ
                  </a>
                }
                @if (authService.hasRole('ADMIN')) {
                  <a routerLink="/dashboard" class="btn btn-primary btn-hero">
                    <i class="bi bi-speedometer2"></i> Dashboard Quản Trị
                  </a>
                  <a routerLink="/admin/specialties" class="btn btn-outline btn-hero">
                    <i class="bi bi-diagram-3"></i> Quản Lý Chuyên Khoa
                  </a>
                  <a routerLink="/admin/doctors" class="btn btn-outline btn-hero">
                    <i class="bi bi-person-badge"></i> Quản Lý Bác Sĩ
                  </a>
                  <a routerLink="/admin/staff" class="btn btn-outline btn-hero">
                    <i class="bi bi-person-workspace"></i> Quản Lý Lễ Tân
                  </a>
                  <a routerLink="/admin/medicines" class="btn btn-outline btn-hero">
                    <i class="bi bi-capsule"></i> Quản Lý Dược Phẩm
                  </a>
                  <a routerLink="/admin/schedules" class="btn btn-ghost btn-hero">
                    <i class="bi bi-calendar3"></i> Lịch Trực Phòng
                  </a>
                }
                @if (authService.hasRole('PATIENT')) {
                  <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" class="btn btn-primary btn-hero">
                    <i class="bi bi-ticket-perforated-fill"></i> Lấy Số Khám Ngay
                  </a>
                  <a routerLink="/my-tickets" class="btn btn-outline btn-hero">
                    <i class="bi bi-clock-history"></i> Phiếu Khám Của Tôi
                  </a>
                  <a routerLink="/queue" class="btn btn-ghost btn-hero">
                    <i class="bi bi-tv"></i> Màn Hình TV Sảnh
                  </a>
                }
              </div>
            }
          </div>
        </div>

        <!-- 3-Pillar Clinical Overview (Zero Overflow) -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon icon-blue">
                <i class="bi bi-clock-history"></i>
              </div>
              <span class="stat-chip chip-blue">Ước tính AI</span>
            </div>
            <div class="stat-body">
              <div class="stat-value">10 – 15 Phút</div>
              <div class="stat-label">Thời gian chờ dự kiến trung bình tại các phòng</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon icon-teal">
                <i class="bi bi-qr-code-scan"></i>
              </div>
              <span class="stat-chip chip-teal">Đa kênh</span>
            </div>
            <div class="stat-body">
              <div class="stat-value">Cấp Số 1 Chạm</div>
              <div class="stat-label">Tự động qua Kiosk sảnh &amp; Đặt hẹn online</div>
            </div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon icon-indigo">
                <i class="bi bi-robot"></i>
              </div>
              <span class="stat-chip chip-indigo">Hỗ trợ 24/7</span>
            </div>
            <div class="stat-body">
              <div class="stat-value">Tư Vấn AI Thông Minh</div>
              <div class="stat-label">Phân luồng chuyên khoa chính xác theo triệu chứng</div>
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
          @if (!authService.hasRole('ADMIN') && !authService.hasRole('DOCTOR')) {
            <div class="header-right-actions">
              <a routerLink="/queue" class="btn btn-outline btn-sm">
                <i class="bi bi-tv"></i> Mở Màn Hình TV Sảnh Chờ
              </a>
            </div>
          }
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
      <section class="portal-actions-section">
        <div class="section-header">
          <div>
            @if (authService.hasRole('PATIENT')) {
              <h2 class="section-title">Dịch Vụ Dành Cho Bệnh Nhân</h2>
              <p class="section-desc">Truy cập nhanh các tiện ích lấy số trực tuyến và theo dõi tiến độ khám bệnh</p>
            } @else if (authService.hasRole('DOCTOR')) {
              <h2 class="section-title">Bàn Làm Việc Bác Sĩ</h2>
              <p class="section-desc">Truy cập nhanh công cụ gọi khám, bàn khám bệnh lâm sàng và lịch trực</p>
            } @else if (authService.hasRole('STAFF')) {
              <h2 class="section-title">Bàn Tiếp Đón &amp; Điều Phối</h2>
              <p class="section-desc">Công cụ cấp số tiếp đón bệnh nhân và điều phối hàng đợi phòng khám</p>
            } @else if (authService.hasRole('ADMIN')) {
              <h2 class="section-title">Trung Tâm Quản Trị Hệ Thống</h2>
              <p class="section-desc">Quản lý toàn diện cơ sở dữ liệu chuyên khoa, dược phẩm và lịch trực phòng khám</p>
            } @else {
              <h2 class="section-title">Dịch Vụ &amp; Tiện Ích Y Tế</h2>
              <p class="section-desc">Đăng ký lấy số trực tuyến, tra cứu phiếu khám và theo dõi hàng đợi phòng khám</p>
            }
          </div>
        </div>

        <div class="actions-grid">
          @if (!authService.isAuthenticated()) {
            <div class="action-card medical-card">
              <div class="action-icon icon-blue"><i class="bi bi-ticket-perforated-fill"></i></div>
              <h3 class="action-title">Lấy Số Khám Trực Tuyến</h3>
              <p class="action-desc">Đăng ký xếp hàng tự động online trước khi tới phòng khám để không phải xếp hàng bốc số.</p>
              <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" class="btn btn-primary btn-sm">Lấy số ngay <i class="bi bi-arrow-right"></i></a>
            </div>

            <div class="action-card medical-card">
              <div class="action-icon icon-teal"><i class="bi bi-search"></i></div>
              <h3 class="action-title">Tra Cứu Phiếu Khám</h3>
              <p class="action-desc">Nhập mã số vé để theo dõi tiến độ gọi số và thời gian chờ ước tính thời gian thực.</p>
              <a routerLink="/queue/tracking" [queryParams]="{ mode: 'lookup' }" class="btn btn-outline btn-sm">Tra cứu ngay <i class="bi bi-arrow-right"></i></a>
            </div>

            <div class="action-card medical-card">
              <div class="action-icon icon-indigo"><i class="bi bi-display"></i></div>
              <h3 class="action-title">Bảng Gọi Số Sảnh Chờ</h3>
              <p class="action-desc">Theo dõi toàn bộ danh sách phòng khám trên màn hình lớn sảnh bệnh viện.</p>
              <a routerLink="/queue" class="btn btn-outline btn-sm">Mở bảng TV <i class="bi bi-arrow-right"></i></a>
            </div>

            <div class="action-card medical-card">
              <div class="action-icon icon-emerald"><i class="bi bi-box-arrow-in-right"></i></div>
              <h3 class="action-title">Cổng Nhân Viên Y Tế</h3>
              <p class="action-desc">Đăng nhập tài khoản Bác sĩ, Lễ tân hoặc Quản trị viên để bắt đầu ca làm việc.</p>
              <a routerLink="/login" class="btn btn-outline btn-sm">Đăng nhập <i class="bi bi-arrow-right"></i></a>
            </div>
          } @else {
            @if (authService.hasRole('PATIENT')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-ticket-perforated-fill"></i></div>
                <h3 class="action-title">Lấy Số Khám Trực Tuyến</h3>
                <p class="action-desc">Đăng ký xếp hàng tự động online trước khi tới phòng khám để không phải xếp hàng bốc số.</p>
                <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" class="btn btn-primary btn-sm">Lấy số ngay <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-calendar-check"></i></div>
                <h3 class="action-title">Đặt Lịch Khám Online</h3>
                <p class="action-desc">Chọn bác sĩ, chuyên khoa và khung giờ thuận tiện giúp hạn chế tối đa xếp hàng.</p>
                <a routerLink="/booking" class="btn btn-outline btn-sm">Đặt lịch ngay <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-clock-history"></i></div>
                <h3 class="action-title">Phiếu Khám Của Tôi</h3>
                <p class="action-desc">Xem tiến độ gọi số khám của bạn theo thời gian thực và thời gian dự kiến.</p>
                <a routerLink="/my-tickets" class="btn btn-outline btn-sm">Xem tiến độ phiếu <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Bảng Gọi Số Sảnh Chờ</h3>
                <p class="action-desc">Theo dõi toàn bộ danh sách phòng khám trên màn hình lớn sảnh bệnh viện.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Mở bảng TV <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-megaphone"></i></div>
                <h3 class="action-title">Điều Phối &amp; Gọi Số Khám</h3>
                <p class="action-desc">Bấm chuông mời bệnh nhân tiếp theo vào phòng khám hoặc chuyển luồng cấp cứu.</p>
                <a routerLink="/doctor/calling" class="btn btn-primary btn-sm">Vào gọi số <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-clipboard2-pulse"></i></div>
                <h3 class="action-title">Bàn Khám Bệnh &amp; Kê Đơn</h3>
                <p class="action-desc">Ghi nhận chỉ số sinh tồn, chẩn đoán ICD-10 và lập đơn thuốc điện tử cho bệnh nhân.</p>
                <a routerLink="/doctor/examination" class="btn btn-outline btn-sm">Vào bàn khám <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-calendar-week"></i></div>
                <h3 class="action-title">Lịch Trực Ca Bác Sĩ</h3>
                <p class="action-desc">Theo dõi các ca trực được phân công theo tuần và số lượng bệnh nhân đã tiếp nhận.</p>
                <a routerLink="/doctor/schedule" class="btn btn-outline btn-sm">Xem ca trực <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-person-plus"></i></div>
                <h3 class="action-title">Bàn Tiếp Đón &amp; Cấp Số</h3>
                <p class="action-desc">Tiếp đón người bệnh, nhập thông tin, cấp số thứ tự vào phòng khám và gắn cờ cấp cứu.</p>
                <a routerLink="/staff/check-in" class="btn btn-primary btn-sm">Mở bàn tiếp đón <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-sliders"></i></div>
                <h3 class="action-title">Điều Phối Hàng Đợi</h3>
                <p class="action-desc">Theo dõi danh sách bệnh nhân đang chờ, gọi lại lượt bị nhỡ hoặc đổi phòng khám.</p>
                <a routerLink="/staff/queue" class="btn btn-outline btn-sm">Quản lý hàng đợi <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-display"></i></div>
                <h3 class="action-title">Bảng Gọi Số Sảnh Chờ</h3>
                <p class="action-desc">Theo dõi luồng hiển thị trên màn hình TV sảnh bệnh viện theo thời gian thực.</p>
                <a routerLink="/queue" class="btn btn-outline btn-sm">Mở bảng TV <i class="bi bi-arrow-right"></i></a>
              </div>
            }

            @if (authService.hasRole('ADMIN')) {
              <div class="action-card medical-card">
                <div class="action-icon icon-blue"><i class="bi bi-speedometer2"></i></div>
                <h3 class="action-title">Dashboard Thống Kê</h3>
                <p class="action-desc">Chỉ số thời gian chờ, lượt khám thực tế, tỷ lệ hoàn thành và biểu đồ hiệu suất khám.</p>
                <a routerLink="/dashboard" class="btn btn-primary btn-sm">Xem Dashboard <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-diagram-3"></i></div>
                <h3 class="action-title">Danh Mục Chuyên Khoa</h3>
                <p class="action-desc">Quản lý chuyên khoa, cấu hình mô tả và chỉ định bác sĩ phụ trách từng chuyên khoa.</p>
                <a routerLink="/admin/specialties" class="btn btn-outline btn-sm">Quản lý chuyên khoa <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-indigo"><i class="bi bi-person-badge"></i></div>
                <h3 class="action-title">Đội Ngũ Bác Sĩ</h3>
                <p class="action-desc">Thêm bác sĩ mới, cấp tài khoản đăng nhập, phân bổ chuyên khoa và khóa/mở khóa tài khoản.</p>
                <a routerLink="/admin/doctors" class="btn btn-outline btn-sm">Quản lý bác sĩ <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-person-workspace"></i></div>
                <h3 class="action-title">Nhân Viên Lễ Tân</h3>
                <p class="action-desc">Cấp tài khoản cho nhân viên tiếp đón &amp; điều phối hàng đợi, khóa/mở khóa và đặt lại mật khẩu.</p>
                <a routerLink="/admin/staff" class="btn btn-outline btn-sm">Quản lý lễ tân <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-emerald"><i class="bi bi-capsule"></i></div>
                <h3 class="action-title">Dược Phẩm &amp; Thuốc</h3>
                <p class="action-desc">Quản lý danh mục thuốc, hoạt chất, biệt dược và liều dùng tiêu chuẩn bệnh viện.</p>
                <a routerLink="/admin/medicines" class="btn btn-outline btn-sm">Quản lý thuốc <i class="bi bi-arrow-right"></i></a>
              </div>

              <div class="action-card medical-card">
                <div class="action-icon icon-teal"><i class="bi bi-calendar3"></i></div>
                <h3 class="action-title">Cấu Hình Lịch Trực Phòng</h3>
                <p class="action-desc">Xếp lịch làm việc cho bác sĩ, kiểm tra xung đột trùng giờ và thiết lập giới hạn tiếp nhận.</p>
                <a routerLink="/admin/schedules" class="btn btn-outline btn-sm">Cấu hình lịch <i class="bi bi-arrow-right"></i></a>
              </div>
            }
          }
        </div>
      </section>
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

    /* Hero Section - High-End Healthcare Aesthetics */
    .hero-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 2.25rem;
      padding: 3rem 1.5rem 2.5rem;
      background: linear-gradient(180deg, #f0f9ff 0%, #ffffff 85%);
      border-radius: 20px;
      border: 1px solid #e0f2fe;
      box-shadow: 0 10px 30px -5px rgba(2, 132, 199, 0.06);
      position: relative;
      overflow: hidden;
    }

    .hero-ambient-glow {
      position: absolute;
      top: -100px;
      left: 50%;
      transform: translateX(-50%);
      width: 650px;
      height: 300px;
      background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(20, 184, 166, 0.05) 50%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .hero-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      position: relative;
      z-index: 1;
      width: 100%;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background-color: #ffffff;
      color: #0369a1;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.4rem 1.1rem;
      border-radius: var(--radius-full);
      border: 1px solid #bae6fd;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.08);
      letter-spacing: 0.01em;
    }

    .hero-badge.patient-badge {
      background-color: #ecfdf5;
      color: #047857;
      border-color: #a7f3d0;
    }

    .hero-badge.doctor-badge {
      background-color: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .hero-badge.staff-badge {
      background-color: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }

    .hero-badge.admin-badge {
      background-color: #f5f3ff;
      color: #6d28d9;
      border-color: #ddd6fe;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.25);
    }

    .hero-title {
      font-size: 2.55rem;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.25;
      letter-spacing: -0.025em;
      max-width: 860px;
      margin: 0 auto;
    }

    .hero-title-break {
      display: block;
    }

    .hero-gradient-text {
      background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: inline-block;
    }

    .hero-desc {
      font-size: 1.05rem;
      color: #475569;
      max-width: 760px;
      line-height: 1.65;
      margin: 0 auto;
    }

    .hero-actions {
      display: flex;
      justify-content: center;
      width: 100%;
      margin-top: 0.5rem;
    }

    .hero-cta-group {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.85rem;
    }

    .btn-hero {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.45rem;
      font-size: 0.95rem;
      font-weight: 700;
      border-radius: 11px;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      cursor: pointer;
      text-decoration: none;
      white-space: nowrap;
    }

    .btn-hero.btn-primary {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: 1px solid #0284c7;
      box-shadow: 0 4px 14px -2px rgba(2, 132, 199, 0.35);

      &:hover {
        background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
        box-shadow: 0 6px 20px -2px rgba(2, 132, 199, 0.45);
        transform: translateY(-1px);
      }
    }

    .btn-hero.btn-outline {
      background: #ffffff;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

      &:hover {
        background: #f8fafc;
        border-color: #94a3b8;
        color: #0284c7;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
      }
    }

    .btn-hero.btn-ghost {
      background: rgba(255, 255, 255, 0.8);
      color: #334155;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

      &:hover {
        background: #ffffff;
        color: #0284c7;
        border-color: #bae6fd;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08);
      }
    }

    /* Stats 3-Pillar Grid (Robust Zero-Overflow Architecture) */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.25rem;
      width: 100%;
      max-width: 980px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
      box-sizing: border-box;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.25rem 1.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      box-shadow: 0 2px 8px -2px rgba(15, 23, 42, 0.04);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      text-align: left;
      min-width: 0;
      box-sizing: border-box;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 24px -6px rgba(15, 23, 42, 0.08);
        border-color: #cbd5e1;
      }
    }

    .stat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .stat-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .icon-blue {
      background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
      color: #0284c7;
    }

    .icon-teal {
      background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
      color: #0d9488;
    }

    .icon-indigo {
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
      color: #4f46e5;
    }

    .icon-emerald {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #059669;
    }

    .stat-chip {
      font-size: 0.725rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }

    .chip-blue {
      background: #f0f9ff;
      color: #0284c7;
      border: 1px solid #bae6fd;
    }

    .chip-teal {
      background: #f0fdfa;
      color: #0d9488;
      border: 1px solid #99f6e4;
    }

    .chip-indigo {
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
    }

    .stat-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .stat-value {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.015em;
      line-height: 1.3;
      white-space: normal;
      word-break: break-word;
    }

    .stat-label {
      font-size: 0.825rem;
      color: #64748b;
      font-weight: 500;
      line-height: 1.45;
      white-space: normal;
      word-break: break-word;
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

    @media (max-width: 860px) {
      .stats-grid {
        grid-template-columns: 1fr;
        max-width: 480px;
      }
    }

    @media (max-width: 768px) {
      .hero-title {
        font-size: 2rem;
      }
      .hero-section {
        padding: 2.5rem 1.25rem 2rem;
      }
    }

    @media (max-width: 576px) {
      .hero-title {
        font-size: 1.65rem;
      }
      .hero-cta-group {
        flex-direction: column;
        width: 100%;
        .btn-hero {
          width: 100%;
          justify-content: center;
        }
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
