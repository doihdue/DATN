import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="navbar-header">
      <div class="navbar-container">
        <a routerLink="/" class="navbar-brand">
          <span class="brand-mark"><i class="bi bi-plus-lg"></i></span>
          <span class="brand-name">MedQueue</span>
        </a>

        <nav class="nav-links">
          @if (!authService.isAuthenticated()) {
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Trang chủ</a>
            <a routerLink="/booking" routerLinkActive="active" class="nav-item">Đặt lịch khám</a>
            <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" routerLinkActive="active" class="nav-item">Lấy số</a>
            <a routerLink="/queue/tracking" [queryParams]="{ mode: 'lookup' }" routerLinkActive="active" class="nav-item">Tra cứu phiếu</a>
            <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Màn hình gọi số</a>
          } @else {
            @if (authService.hasRole('ADMIN')) {
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">Tổng quan</a>
              <a routerLink="/admin/specialties" routerLinkActive="active" class="nav-item">Chuyên khoa</a>

              <div class="nav-dropdown" [class.dropdown-active]="isPersonnelActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isPersonnelActive()" (click)="togglePersonnelNav($event)">
                  Nhân sự <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isPersonnelNavOpen"></i>
                </button>
                @if (isPersonnelNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/doctors" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">Bác sĩ</a>
                    <a routerLink="/admin/staff" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">Lễ tân</a>
                    <a routerLink="/admin/lab-technicians" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">Kỹ thuật viên</a>
                  </div>
                }
              </div>

              <div class="nav-dropdown" [class.dropdown-active]="isMedicinesActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isMedicinesActive()" (click)="toggleMedicinesNav($event)">
                  Thuốc <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isMedicinesNavOpen"></i>
                </button>
                @if (isMedicinesNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/medicines/list" routerLinkActive="active" (click)="isMedicinesNavOpen = false" class="dropdown-item">Danh mục thuốc</a>
                    <a routerLink="/admin/medicines/categories" routerLinkActive="active" (click)="isMedicinesNavOpen = false" class="dropdown-item">Nhóm thuốc</a>
                  </div>
                }
              </div>

              <div class="nav-dropdown" [class.dropdown-active]="isScheduleActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isScheduleActive()" (click)="toggleScheduleNav($event)">
                  Lịch trực <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isScheduleNavOpen"></i>
                </button>
                @if (isScheduleNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/schedules/doctors" routerLinkActive="active" (click)="isScheduleNavOpen = false" class="dropdown-item">Bác sĩ</a>
                    <a routerLink="/admin/schedules/technicians" routerLinkActive="active" (click)="isScheduleNavOpen = false" class="dropdown-item">Kỹ thuật viên</a>
                  </div>
                }
              </div>
            }
            @if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
              <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-item">Gọi khám</a>
              <a routerLink="/doctor/examination" routerLinkActive="active" class="nav-item">Khám bệnh</a>
              <a routerLink="/doctor/history" routerLinkActive="active" class="nav-item">Lịch sử khám</a>
              <a routerLink="/doctor/medicines" routerLinkActive="active" class="nav-item">Tra cứu thuốc</a>
              <a routerLink="/lab/services" routerLinkActive="active" class="nav-item">Danh mục XN</a>
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">Ca trực</a>
            }
            @if (authService.isLabTech() && !authService.hasRole('ADMIN')) {
              <a routerLink="/lab" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Xét nghiệm</a>
              <a routerLink="/lab/services" routerLinkActive="active" class="nav-item">Danh mục XN</a>
              <a routerLink="/lab/my-shifts" routerLinkActive="active" class="nav-item">Ca trực</a>
            } @else if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Trang chủ</a>
              <a routerLink="/staff/appointments" routerLinkActive="active" class="nav-item">Lịch hẹn</a>
              <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-item">Tiếp đón</a>
              <a routerLink="/staff/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Hàng đợi</a>
              <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Màn hình gọi số</a>
            }
            @if (authService.hasRole('PATIENT') && !authService.hasRole('ADMIN') && !authService.hasRole('DOCTOR') && !authService.hasRole('STAFF')) {
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Trang chủ</a>
              <a routerLink="/booking" routerLinkActive="active" class="nav-item">Đặt lịch khám</a>
              <a routerLink="/my-appointments" routerLinkActive="active" class="nav-item">Lịch hẹn của tôi</a>
              <a routerLink="/queue/tracking" [queryParams]="{ mode: 'checkin' }" routerLinkActive="active" class="nav-item">Lấy số</a>
              <a routerLink="/my-tickets" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Phiếu khám của tôi</a>
              <a routerLink="/queue" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">Màn hình gọi số</a>
            }
          }
        </nav>

        <div class="nav-actions">
          @if (authService.isAuthenticated()) {
            <a routerLink="/profile" class="user-link" title="Hồ sơ cá nhân">
              <span class="avatar">{{ initials() }}</span>
              <span class="user-text">
                <span class="user-name" [title]="authService.currentUser()?.fullName || ''">{{ authService.currentUser()?.fullName }}</span>
                <span class="user-role">{{ getPrimaryRoleDisplayName() }}</span>
              </span>
            </a>
            <button type="button" (click)="logout()" class="icon-btn" title="Đăng xuất" aria-label="Đăng xuất">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          } @else {
            <div class="auth-buttons">
              <a routerLink="/login" class="btn btn-secondary btn-sm">Đăng nhập</a>
              <a routerLink="/register" class="btn btn-primary btn-sm">Đăng ký</a>
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
      height: 56px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      padding: 0 24px;
    }

    .navbar-container {
      width: 100%;
      max-width: 1200px;
      height: 100%;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-main);
      flex-shrink: 0;
    }

    .navbar-brand:hover { color: var(--text-main); }

    .brand-mark {
      width: 24px;
      height: 24px;
      border-radius: var(--radius-md);
      background: var(--primary-600);
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .brand-name {
      font-size: 16px;
      font-weight: 600;
    }

    .nav-links {
      flex: 1;
      height: 100%;
      display: flex;
      align-items: stretch;
      gap: 4px;
      white-space: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .nav-links::-webkit-scrollbar { display: none; }

    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0 10px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-secondary);
      border-bottom: 2px solid transparent;
      transition: color 0.12s ease, border-color 0.12s ease;
      white-space: nowrap;
    }

    .nav-item:hover { color: var(--text-main); }

    .nav-item.active {
      color: var(--primary-600);
      border-bottom-color: var(--primary-600);
    }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 8px;
      border-radius: var(--radius-md);
      color: var(--text-main);
    }

    .user-link:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .user-text {
      display: flex;
      flex-direction: column;
      line-height: 1.25;
    }

    .user-name {
      font-size: 13px;
      font-weight: 500;
      max-width: 170px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Menu thả xuống (bố cục quản trị) */
    .nav-dropdown {
      position: relative;
      display: inline-flex;
      align-items: stretch;
    }

    .nav-dropdown-toggle {
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
    }

    .dropdown-arrow {
      font-size: 11px;
      transition: transform 0.12s ease;
    }

    .dropdown-arrow.rotated { transform: rotate(180deg); }

    .nav-dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      min-width: 180px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
      padding: 4px;
      display: flex;
      flex-direction: column;
      z-index: 1050;
    }

    .dropdown-item {
      padding: 7px 10px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 14px;
    }

    .dropdown-item:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .dropdown-item.active {
      background: var(--primary-50);
      color: var(--primary-700);
      font-weight: 500;
    }

    @media (max-width: 1080px) {
      .navbar-container { gap: 16px; }
      .nav-item { padding: 0 8px; font-size: 13px; }
      .user-name { max-width: 130px; }
    }

    @media (max-width: 900px) {
      .nav-links { display: none; }
    }

    @media (max-width: 576px) {
      .navbar-header { padding: 0 16px; }
      .user-text { display: none; }
    }
  `]
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isPersonnelNavOpen = false;
  isMedicinesNavOpen = false;
  isScheduleNavOpen = false;
  currentUrl = signal<string>(this.router.url);

  readonly isPersonnelActive = computed(() => {
    const url = this.currentUrl();
    return (
      url.includes('/admin/doctors') ||
      url.includes('/admin/staff') ||
      url.includes('/admin/lab-technicians') ||
      url.includes('/admin/lab-techs') ||
      url.includes('/admin/personnel')
    );
  });

  readonly isMedicinesActive = computed(() => this.currentUrl().includes('/admin/medicines'));
  readonly isScheduleActive = computed(() => this.currentUrl().includes('/admin/schedules'));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects || e.url);
        this.isPersonnelNavOpen = false;
        this.isMedicinesNavOpen = false;
        this.isScheduleNavOpen = false;
      });
  }

  togglePersonnelNav(event: Event): void {
    event.stopPropagation();
    this.isPersonnelNavOpen = !this.isPersonnelNavOpen;
    if (this.isPersonnelNavOpen) {
      this.isMedicinesNavOpen = false;
      this.isScheduleNavOpen = false;
    }
  }

  toggleMedicinesNav(event: Event): void {
    event.stopPropagation();
    this.isMedicinesNavOpen = !this.isMedicinesNavOpen;
    if (this.isMedicinesNavOpen) {
      this.isPersonnelNavOpen = false;
      this.isScheduleNavOpen = false;
    }
  }

  toggleScheduleNav(event: Event): void {
    event.stopPropagation();
    this.isScheduleNavOpen = !this.isScheduleNavOpen;
    if (this.isScheduleNavOpen) {
      this.isPersonnelNavOpen = false;
      this.isMedicinesNavOpen = false;
    }
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.isPersonnelNavOpen = false;
    this.isMedicinesNavOpen = false;
    this.isScheduleNavOpen = false;
  }

  logout(): void {
    this.authService.logout();
  }

  /** Chữ viết tắt tên người dùng cho ô avatar. */
  initials(): string {
    const parts = (this.authService.currentUser()?.fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const last = parts[parts.length - 1][0];
    return parts.length > 1 ? (parts[parts.length - 2][0] + last).toUpperCase() : last.toUpperCase();
  }

  getRoleIconClass(): string {
    if (this.authService.isLabTech()) return 'bi-eyedropper';
    const roles = this.authService.userRoles();
    if (roles.some(r => r.includes('ADMIN'))) return 'bi-shield-check';
    if (roles.some(r => r.includes('DOCTOR'))) return 'bi-person-badge-fill';
    if (roles.some(r => r.includes('STAFF'))) return 'bi-person-check-fill';
    return 'bi-person-fill';
  }

  getPrimaryRoleDisplayName(): string {
    if (this.authService.isLabTech()) return 'Kỹ thuật viên';
    const roles = this.authService.userRoles();
    if (roles.some(r => r.includes('ADMIN'))) return 'Quản trị viên';
    if (roles.some(r => r.includes('DOCTOR'))) return 'Bác sĩ';
    if (roles.some(r => r.includes('STAFF'))) return 'Lễ tân';
    if (roles.some(r => r.includes('PATIENT'))) return 'Bệnh nhân';
    return 'Người dùng';
  }
}
