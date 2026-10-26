import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-header">
      <div class="navbar-container">
        <!-- Hospital Brand -->
        <a routerLink="/" class="navbar-brand">
          <div class="brand-icon">
            <i class="bi bi-hospital"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">MedQueue</span>
            <span class="brand-tagline">Tiếp Đón &amp; Hàng Đợi Y Tế</span>
          </div>
        </a>

        <!-- Main Navigation Links (Single-Line Clean Layout) -->
        <nav class="nav-links">
          @if (!authService.isAuthenticated()) {
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
              <i class="bi bi-house"></i> Trang chủ
            </a>
            <a routerLink="/booking" routerLinkActive="active" class="nav-item">
              <i class="bi bi-calendar-plus"></i> Đặt lịch khám
            </a>
            <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" routerLinkActive="active" class="nav-item">
              <i class="bi bi-ticket-perforated"></i> Đăng ký lấy số
            </a>
            <a routerLink="/queue/tracking" [queryParams]="{ mode: 'lookup' }" routerLinkActive="active" class="nav-item">
              <i class="bi bi-search"></i> Tra cứu phiếu
            </a>
            <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
              <i class="bi bi-display"></i> Màn hình TV
            </a>
          } @else {
            @if (authService.hasRole('ADMIN')) {
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
                <i class="bi bi-speedometer2"></i> Dashboard
              </a>
              <a routerLink="/admin/specialties" routerLinkActive="active" class="nav-item">
                <i class="bi bi-diagram-3"></i> Chuyên khoa
              </a>
              <a routerLink="/admin/doctors" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-badge"></i> Bác sĩ
              </a>
              <a routerLink="/admin/staff" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-workspace"></i> Lễ tân
              </a>
              <a routerLink="/admin/medicines" routerLinkActive="active" class="nav-item">
                <i class="bi bi-capsule"></i> Thuốc
              </a>
              <a routerLink="/admin/schedules" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar3"></i> Lịch trực
              </a>
            }
            @if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-house"></i> Trang chủ
              </a>
              <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-item">
                <i class="bi bi-megaphone"></i> Gọi khám
              </a>
              <a routerLink="/doctor/examination" routerLinkActive="active" class="nav-item">
                <i class="bi bi-clipboard2-pulse"></i> Bàn khám bệnh
              </a>
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar2-week"></i> Ca trực
              </a>
            }
            @if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-house"></i> Trang chủ
              </a>
              <a routerLink="/staff/appointments" routerLinkActive="active" class="nav-item">
                <i class="bi bi-journal-check"></i> Lịch hẹn
              </a>
              <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-check-fill"></i> Tiếp đón &amp; Cấp số
              </a>
              <a routerLink="/staff/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-sliders"></i> Điều phối hàng đợi
              </a>
              <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-display"></i> Màn hình TV
              </a>
            }
            @if (authService.hasRole('PATIENT') && !authService.hasRole('ADMIN') && !authService.hasRole('DOCTOR') && !authService.hasRole('STAFF')) {
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-house"></i> Trang chủ
              </a>
              <a routerLink="/booking" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar-plus"></i> Đặt lịch khám
              </a>
              <a routerLink="/my-appointments" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar2-heart"></i> Lịch hẹn của tôi
              </a>
              <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" routerLinkActive="active" class="nav-item">
                <i class="bi bi-ticket-perforated-fill"></i> Lấy số khám online
              </a>
              <a routerLink="/my-tickets" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-clock-history"></i> Phiếu khám của tôi
              </a>
              <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-display"></i> Màn hình TV
              </a>
            }
          }
        </nav>

        <!-- User Controls / Auth Buttons -->
        <div class="nav-actions">
          @if (authService.isAuthenticated()) {
            <div class="user-pill-card">
              <div class="user-main-info">
                <div class="user-avatar-badge">
                  <i class="bi" [ngClass]="getRoleIconClass()"></i>
                </div>
                <div class="user-labels">
                  <span class="user-fullname" [title]="authService.currentUser()?.fullName || ''">
                    {{ authService.currentUser()?.fullName }}
                  </span>
                  <span class="user-role-tag">
                    <span class="online-dot"></span>
                    {{ getPrimaryRoleDisplayName() }}
                  </span>
                </div>
              </div>

              <button (click)="logout()" class="btn-logout-circle" title="Đăng xuất khỏi hệ thống" aria-label="Đăng xuất">
                <i class="bi bi-box-arrow-right"></i>
              </button>
            </div>
          } @else {
            <div class="auth-buttons">
              <a routerLink="/login" class="btn btn-outline btn-sm">
                <i class="bi bi-box-arrow-in-right"></i> Đăng nhập
              </a>
              <a routerLink="/register" class="btn btn-primary btn-sm">
                <i class="bi bi-person-plus"></i> Đăng ký khám
              </a>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
    }

    .navbar-header {
      width: 100%;
      height: 62px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05);
      display: flex;
      align-items: center;
      padding: 0 1.5rem;
      transition: all 0.2s ease;
    }

    .navbar-container {
      width: 100%;
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
    }

    /* Brand */
    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      text-decoration: none;
      flex-shrink: 0;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #0f172a;
      line-height: 1.1;
    }

    .brand-tagline {
      font-size: 0.65rem;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    /* Navigation Links: strictly single-line nowrap */
    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex-wrap: nowrap;
      white-space: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .nav-links::-webkit-scrollbar {
      display: none;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.8rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      border-radius: 6px;
      text-decoration: none;
      transition: all 0.15s ease;
      white-space: nowrap;
    }

    .nav-item i {
      font-size: 0.95rem;
    }

    .nav-item:hover {
      color: #0284c7;
      background-color: #f1f5f9;
    }

    .nav-item.active {
      color: #0284c7;
      background-color: #f0f9ff;
      font-weight: 700;
      box-shadow: inset 0 -2px 0 0 #0284c7;
    }

    /* User Area */
    .nav-actions {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    /* Premium Compact User Pill Card */
    .user-pill-card {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.25rem 0.4rem 0.25rem 0.65rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 9999px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
      transition: all 0.15s ease;
    }

    .user-pill-card:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .user-main-info {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }

    .user-avatar-badge {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      box-shadow: 0 1px 3px rgba(2, 132, 199, 0.25);
      flex-shrink: 0;
    }

    .user-labels {
      display: flex;
      flex-direction: column;
      line-height: 1.15;
    }

    .user-fullname {
      font-size: 0.825rem;
      font-weight: 700;
      color: #0f172a;
      max-width: 170px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role-tag {
      font-size: 0.675rem;
      font-weight: 600;
      color: #0284c7;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      margin-top: 1px;
    }

    .online-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: #10b981;
      flex-shrink: 0;
    }

    .btn-logout-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .btn-logout-circle:hover {
      background: #fee2e2;
      color: #ef4444;
      border-color: #fca5a5;
      transform: scale(1.05);
    }

    @media (max-width: 1080px) {
      .nav-links {
        gap: 0.15rem;
      }
      .nav-item {
        padding: 0.4rem 0.6rem;
        font-size: 0.8rem;
      }
      .user-fullname {
        max-width: 130px;
      }
    }

    @media (max-width: 900px) {
      .nav-links {
        display: none;
      }
    }
  `]
})
export class NavbarComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }

  getRoleIconClass(): string {
    const roles = this.authService.userRoles();
    if (roles.some(r => r.includes('ADMIN'))) return 'bi-shield-check';
    if (roles.some(r => r.includes('DOCTOR'))) return 'bi-person-badge-fill';
    if (roles.some(r => r.includes('STAFF'))) return 'bi-person-check-fill';
    return 'bi-person-fill';
  }

  getPrimaryRoleDisplayName(): string {
    const roles = this.authService.userRoles();
    if (roles.some(r => r.includes('ADMIN'))) return 'Quản trị viên';
    if (roles.some(r => r.includes('DOCTOR'))) return 'Bác sĩ';
    if (roles.some(r => r.includes('STAFF'))) return 'Lễ tân';
    if (roles.some(r => r.includes('PATIENT'))) return 'Bệnh nhân';
    return 'Người dùng';
  }
}
