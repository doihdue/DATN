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
      <div class="clinic-name">Phòng khám MedQueue</div>

      <div class="topbar-right">
        <a routerLink="/queue" target="_blank" class="topbar-link" title="Mở bảng gọi số ở tab mới">
          <i class="bi bi-display"></i>
          <span>Màn hình gọi số</span>
        </a>

        <span class="divider"></span>

        <a routerLink="/profile" class="user" title="Hồ sơ cá nhân">
          <span class="avatar">{{ initials() }}</span>
          <span class="user-text">
            <span class="user-name">{{ authService.currentUser()?.fullName }}</span>
            <span class="user-role">{{ getPrimaryRoleDisplayName() }}</span>
          </span>
        </a>

        <button type="button" class="icon-btn" (click)="logout()" title="Đăng xuất">
          <i class="bi bi-box-arrow-right"></i>
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
      height: var(--topbar-height);
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px 0 28px;
    }

    .clinic-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .topbar-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 13px;
    }

    .topbar-link:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: var(--border-color);
      margin: 0 4px;
    }

    .user {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      color: var(--text-main);
    }

    .user:hover { background: var(--bg-hover); color: var(--text-main); }

    .user-text {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .user-name { font-size: 13px; font-weight: 500; }
    .user-role { font-size: 12px; color: var(--text-muted); }

    @media (max-width: 640px) {
      .topbar-link span, .user-text { display: none; }
    }
  `]
})
export class TopbarComponent {
  readonly authService = inject(AuthService);

  logout(): void {
    this.authService.logout();
  }

  initials(): string {
    const name = (this.authService.currentUser()?.fullName || '').trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    const first = parts.length > 1 ? parts[parts.length - 2][0] : '';
    return (first + parts[parts.length - 1][0]).toUpperCase();
  }

  getPrimaryRoleDisplayName(): string {
    if (this.authService.isAdmin()) return 'Quản trị viên';
    if (this.authService.isDoctor()) return 'Bác sĩ';
    if (this.authService.isLabTech()) return 'Kỹ thuật viên';
    if (this.authService.isStaff()) return 'Lễ tân';
    return 'Nhân viên';
  }
}
