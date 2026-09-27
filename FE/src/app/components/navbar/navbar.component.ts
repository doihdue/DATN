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
        <!-- Logo -->
        <a routerLink="/" class="navbar-brand">
          <div class="brand-icon">
            <i class="bi bi-hospital-fill"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">MedQueue</span>
            <span class="brand-tagline">Đặt Khám & Hàng Đợi Điện Tử</span>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="nav-links">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
            <i class="bi bi-house-door"></i> Trang chủ
          </a>
          <a routerLink="/queue" routerLinkActive="active" class="nav-item">
            <i class="bi bi-display"></i> Bảng gọi số
          </a>
          @if (authService.isAuthenticated()) {
            @if (authService.hasRole('PATIENT')) {
              <a routerLink="/booking" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar-plus"></i> Đặt lịch khám
              </a>
              <a routerLink="/my-tickets" routerLinkActive="active" class="nav-item">
                <i class="bi bi-ticket-perforated"></i> Phiếu khám của tôi
              </a>
            }
            @if (authService.hasRole('DOCTOR')) {
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar-week"></i> Ca trực của tôi
              </a>
              <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-item">
                <i class="bi bi-megaphone"></i> Gọi khám
              </a>
            }
            @if (authService.hasRole('STAFF')) {
              <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-item">
                <i class="bi bi-person-check"></i> Tiếp đón & Cấp số
              </a>
            }
            @if (authService.hasRole('ADMIN')) {
              <a routerLink="/admin" routerLinkActive="active" class="nav-item">
                <i class="bi bi-gear"></i> Quản trị
              </a>
            }
          }
        </nav>

        <!-- User Controls / Auth Buttons -->
        <div class="nav-actions">
          @if (authService.isAuthenticated()) {
            <div class="user-profile">
              <div class="user-avatar">
                <i class="bi bi-person-circle"></i>
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
              <button (click)="logout()" class="btn btn-outline btn-sm logout-btn" title="Đăng xuất">
                <i class="bi bi-box-arrow-right"></i>
              </button>
            </div>
          } @else {
            <div class="auth-buttons">
              <a routerLink="/login" class="btn btn-outline btn-sm">
                <i class="bi bi-box-arrow-in-right"></i> Đăng nhập
              </a>
              <a routerLink="/register" class="btn btn-primary btn-sm">
                <i class="bi bi-person-plus"></i> Đăng ký
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
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      padding: 0.75rem 1.5rem;
    }

    .navbar-container {
      max-width: 1300px;
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
      width: 42px;
      height: 42px;
      background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-800) 100%);
      color: #ffffff;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-name {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--primary-800);
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
      gap: 0.5rem;
    }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.85rem;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-muted);
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: all 0.2s;
    }

    .nav-item:hover {
      color: var(--primary-700);
      background: var(--primary-50);
    }

    .nav-item.active {
      color: var(--primary-700);
      background: var(--primary-100);
      font-weight: 700;
    }

    .nav-actions {
      display: flex;
      align-items: center;
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.35rem 0.6rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-full);
    }

    .user-avatar {
      font-size: 1.75rem;
      color: var(--primary-600);
      display: flex;
      align-items: center;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .user-name {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      line-height: 1.2;
    }

    .user-badges {
      display: flex;
      gap: 0.25rem;
    }

    .logout-btn {
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius-full);
      color: var(--rose-600);
    }

    .logout-btn:hover {
      background: #ffe4e6;
      border-color: #fca5a5;
      color: var(--rose-600);
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
