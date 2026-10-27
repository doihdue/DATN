import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="app-topbar">
      <div class="topbar-left">
        <div class="clinic-badge">
          <i class="bi bi-hospital text-primary"></i>
          <span class="clinic-name">MedQueue Clinic</span>
        </div>
        <div class="live-status-pill">
          <span class="live-dot"></span>
          <span class="live-text">Hệ Thống Trực Tuyến</span>
        </div>
      </div>

      <div class="topbar-right">
        <!-- Nút mở Màn hình TV sảnh nhanh -->
        <a routerLink="/queue" target="_blank" class="tv-link-btn" title="Mở bảng gọi số TV sảnh chờ ở tab mới">
          <i class="bi bi-display"></i>
          <span>Màn hình TV</span>
        </a>

        <!-- User Summary Pill -->
        <div class="user-profile-badge">
          <div class="user-avatar-small">
            <i class="bi" [ngClass]="getRoleIconClass()"></i>
          </div>
          <div class="user-info-text">
            <span class="user-fullname">{{ authService.currentUser()?.fullName }}</span>
            <span class="user-role-label">{{ getPrimaryRoleDisplayName() }}</span>
          </div>
        </div>

        <!-- Logout Action Button duy nhất chuẩn mực -->
        <button (click)="logout()" class="btn-logout" title="Đăng xuất khỏi hệ thống">
          <i class="bi bi-box-arrow-right"></i>
          <span>Đăng xuất</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 1020;
      width: 100%;
    }

    .app-topbar {
      height: 64px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      width: 100%;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-left: 0.25rem;
    }

    .clinic-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.9rem;
      font-weight: 700;
      color: #0f172a;
    }

    .live-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      border-radius: 9999px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      font-size: 0.78rem;
      font-weight: 700;
      color: #047857;
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      animation: pulseDot 2s infinite;
    }

    @keyframes pulseDot {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .tv-link-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 0.84rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s;
    }

    .tv-link-btn:hover {
      background: #f1f5f9;
      color: #0284c7;
      border-color: #0284c7;
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.3rem 0.75rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }

    .user-avatar-small {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
    }

    .user-info-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .user-fullname {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
    }

    .user-role-label {
      font-size: 0.72rem;
      color: #64748b;
    }

    .btn-logout {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      font-size: 0.84rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-logout:hover {
      background: #fee2e2;
      border-color: #ef4444;
      transform: translateY(-1px);
    }
  `]
})
export class TopbarComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }

  getRoleIconClass(): string {
    if (this.authService.isAdmin()) return 'bi-shield-check';
    if (this.authService.isDoctor()) return 'bi-heart-pulse-fill';
    if (this.authService.isLabTech()) return 'bi-eyedropper';
    return 'bi-person-badge';
  }

  getPrimaryRoleDisplayName(): string {
    if (this.authService.isAdmin()) return 'Quản trị viên';
    if (this.authService.isDoctor()) return 'Bác sĩ điều trị';
    if (this.authService.isLabTech()) return 'Kỹ thuật viên xét nghiệm';
    if (this.authService.isStaff()) return 'Lễ tân tiếp đón';
    return 'Nhân viên y tế';
  }
}
