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
            <span class="brand-tagline">Tiếp Đón & Hàng Đợi Y Tế</span>
          </div>
        </a>

        <!-- Main Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <i class="bi bi-house-door"></i> Trang chủ
          </a>
          <a routerLink="/queue" routerLinkActive="active" class="nav-item">
            <i class="bi bi-display"></i> Bảng gọi số TV
          </a>
          <a routerLink="/queue/tracking" routerLinkActive="active" class="nav-item">
            <i class="bi bi-ticket-perforated"></i> Tra cứu phiếu
          </a>
          @if (!authService.isAuthenticated() || authService.hasRole('PATIENT')) {
            <a routerLink="/booking" routerLinkActive="active" class="nav-item">
              <i class="bi bi-calendar-plus"></i> Đặt lịch khám
            </a>
          }

          @if (authService.isAuthenticated()) {
            @if (authService.hasRole('ADMIN')) {
              <a routerLink="/admin/specialties" routerLinkActive="active" class="nav-item">
                <i class="bi bi-diagram-3"></i> Chuyên khoa
              </a>
              <a routerLink="/admin/medicines" routerLinkActive="active" class="nav-item">
                <i class="bi bi-capsule"></i> Thuốc
              </a>
              <a routerLink="/admin/schedules" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar3"></i> Lịch trực
              </a>
              <a routerLink="/staff/appointments" routerLinkActive="active" class="nav-item">
                <i class="bi bi-journal-check"></i> Lịch hẹn
              </a>
              <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-check-fill"></i> Tiếp đón &amp; Cấp số
              </a>
              <a routerLink="/staff/queue" routerLinkActive="active" class="nav-item">
                <i class="bi bi-sliders"></i> Điều phối
              </a>
            }
            @if (authService.hasRole('PATIENT')) {
              <a routerLink="/my-appointments" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar2-heart"></i> Lịch hẹn của tôi
              </a>
            }
            @if (authService.hasRole('DOCTOR')) {
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar-week"></i> Ca trực của tôi
              </a>
              <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-item">
                <i class="bi bi-megaphone"></i> Gọi khám
              </a>
              <a routerLink="/doctor/examination" routerLinkActive="active" class="nav-item">
                <i class="bi bi-clipboard2-pulse"></i> Bàn khám bệnh
              </a>
            }
            @if (authService.hasRole('STAFF')) {
              <a routerLink="/staff/appointments" routerLinkActive="active" class="nav-item">
                <i class="bi bi-journal-check"></i> Lịch hẹn
              </a>
              <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-check-fill"></i> Tiếp đón &amp; Cấp số
              </a>
              <a routerLink="/staff/queue" routerLinkActive="active" class="nav-item">
                <i class="bi bi-sliders"></i> Điều phối hàng đợi
              </a>
            }
          }
        </nav>

        <!-- User Controls / Auth Buttons -->
        <div class="nav-actions">
          @if (authService.isAuthenticated()) {
            <div class="user-profile">
              <div class="user-avatar">
                <i class="bi bi-person-fill"></i>
              </div>
              <div class="user-details">
                <span class="user-name">{{ authService.currentUser()?.fullName }}</span>
                <div class="user-badges">
                  @for (role of authService.userRoles(); track role) {
                    <span class="badge" [ngClass]="getRoleBadgeClass(role)">
                      {{ getRoleDisplayName(role) }}
                    </span>
                  }
                </div>
              </div>
              <button (click)="logout()" class="btn-logout" title="Đăng xuất khỏi hệ thống">
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
    .navbar-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.05);
      padding: 0.65rem 1.5rem;
    }

    .navbar-container {
      max-width: 1360px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }

    .brand-icon {
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, var(--primary-700) 0%, var(--primary-600) 100%);
      color: #ffffff;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      box-shadow: 0 2px 5px rgba(2, 132, 199, 0.25);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--primary-900);
      line-height: 1.1;
    }

    .brand-tagline {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.8rem;
      font-size: 0.885rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-item:hover {
      color: var(--primary-700);
      background-color: var(--bg-subtle);
    }

    .nav-item.active {
      color: var(--primary-700);
      background-color: var(--primary-50);
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      align-items: center;
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.3rem 0.65rem;
      background-color: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
    }

    .user-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background-color: var(--primary-100);
      color: var(--primary-700);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.05rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .user-name {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-badges {
      display: flex;
      gap: 0.25rem;
    }

    .btn-logout {
      background: none;
      border: none;
      padding: 0.35rem 0.5rem;
      border-radius: 50%;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-logout:hover {
      background-color: var(--danger-bg);
      color: var(--danger-solid);
    }

    @media (max-width: 992px) {
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
