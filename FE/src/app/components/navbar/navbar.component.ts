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

              <!-- Dropdown Nhóm Nhân Sự (Gộp Bác sĩ, Lễ tân, Kỹ thuật viên) -->
              <div class="nav-dropdown" [class.dropdown-active]="isPersonnelActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isPersonnelActive()" (click)="togglePersonnelNav($event)">
                  <i class="bi bi-people-fill"></i> Nhân sự <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isPersonnelNavOpen"></i>
                </button>
                @if (isPersonnelNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/doctors" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">
                      <i class="bi bi-person-badge"></i> Bác sĩ
                    </a>
                    <a routerLink="/admin/staff" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">
                      <i class="bi bi-person-workspace"></i> Lễ tân
                    </a>
                    <a routerLink="/admin/lab-technicians" routerLinkActive="active" (click)="isPersonnelNavOpen = false" class="dropdown-item">
                      <i class="bi bi-eyedropper"></i> Kỹ thuật viên
                    </a>
                  </div>
                }
              </div>

              <!-- Dropdown Nhóm Kho Dược & Thuốc -->
              <div class="nav-dropdown" [class.dropdown-active]="isMedicinesActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isMedicinesActive()" (click)="toggleMedicinesNav($event)">
                  <i class="bi bi-capsule"></i> Thuốc <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isMedicinesNavOpen"></i>
                </button>
                @if (isMedicinesNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/medicines/list" routerLinkActive="active" (click)="isMedicinesNavOpen = false" class="dropdown-item">
                      <i class="bi bi-capsule-pill"></i> Kho thuốc &amp; Biệt dược
                    </a>
                    <a routerLink="/admin/medicines/categories" routerLinkActive="active" (click)="isMedicinesNavOpen = false" class="dropdown-item">
                      <i class="bi bi-folder2-open"></i> Nhóm &amp; Danh mục thuốc
                    </a>
                  </div>
                }
              </div>

              <!-- Dropdown Nhóm Lịch Trực (Gộp Bác sĩ, Kỹ thuật viên) -->
              <div class="nav-dropdown" [class.dropdown-active]="isScheduleActive()">
                <button type="button" class="nav-item nav-dropdown-toggle" [class.active]="isScheduleActive()" (click)="toggleScheduleNav($event)">
                  <i class="bi bi-calendar3"></i> Lịch trực <i class="bi bi-chevron-down dropdown-arrow" [class.rotated]="isScheduleNavOpen"></i>
                </button>
                @if (isScheduleNavOpen) {
                  <div class="nav-dropdown-menu" (click)="$event.stopPropagation()">
                    <a routerLink="/admin/schedules/doctors" routerLinkActive="active" (click)="isScheduleNavOpen = false" class="dropdown-item">
                      <i class="bi bi-person-badge"></i> Bác sĩ
                    </a>
                    <a routerLink="/admin/schedules/technicians" routerLinkActive="active" (click)="isScheduleNavOpen = false" class="dropdown-item">
                      <i class="bi bi-eyedropper"></i> Kỹ thuật viên
                    </a>
                  </div>
                }
              </div>
            }
            @if (authService.hasRole('DOCTOR') && !authService.hasRole('ADMIN')) {
              <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-item">
                <i class="bi bi-megaphone"></i> Gọi khám
              </a>
              <a routerLink="/doctor/examination" routerLinkActive="active" class="nav-item">
                <i class="bi bi-clipboard2-pulse"></i> Bàn khám bệnh
              </a>
              <a routerLink="/doctor/history" routerLinkActive="active" class="nav-item">
                <i class="bi bi-clock-history"></i> Lịch sử ca khám
              </a>
              <a routerLink="/doctor/medicines" routerLinkActive="active" class="nav-item">
                <i class="bi bi-capsule"></i> Tra cứu Dược
              </a>
              <a routerLink="/lab/services" routerLinkActive="active" class="nav-item">
                <i class="bi bi-journal-medical"></i> Danh mục XN
              </a>
              <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar2-week"></i> Ca trực
              </a>
            }
            @if (authService.isLabTech() && !authService.hasRole('ADMIN')) {
              <a routerLink="/lab" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-item">
                <i class="bi bi-eyedropper"></i> Bàn làm việc XN
              </a>
              <a routerLink="/lab/services" routerLinkActive="active" class="nav-item">
                <i class="bi bi-journal-medical"></i> Danh mục &amp; Chỉ số
              </a>
              <a routerLink="/lab/my-shifts" routerLinkActive="active" class="nav-item">
                <i class="bi bi-calendar2-week"></i> Ca trực
              </a>
            } @else if (authService.hasRole('STAFF') && !authService.hasRole('ADMIN')) {
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

    /* Dropdown Quản lý Nhân sự */
    .nav-dropdown {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .nav-dropdown-toggle {
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
    }

    .dropdown-arrow {
      font-size: 0.68rem;
      margin-left: 0.35rem;
      transition: transform 0.2s ease;
    }

    .dropdown-arrow.rotated {
      transform: rotate(180deg);
    }

    .nav-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      min-width: 175px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.15);
      padding: 0.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      z-index: 1050;
      animation: dropdownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes dropdownFade {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.85rem;
      border-radius: 6px;
      text-decoration: none;
      color: #475569;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s;
    }

    .dropdown-item:hover {
      background: #f0f9ff;
      color: #0284c7;
    }

    .dropdown-item.active {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
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
