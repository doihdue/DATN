import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      class="app-sidebar"
      [class.is-pinned]="isPinned()"
    >
      <!-- Brand & Header -->
      <div class="sidebar-header">
        <a routerLink="/" class="brand-link" title="MedQueue - Hệ thống quản lý phòng khám thông minh">
          <div class="brand-logo-circle">
            <i class="bi bi-hospital-fill"></i>
          </div>
          <div class="brand-info">
            <span class="brand-name">Med<span class="brand-accent">Queue</span></span>
            <span class="brand-sub">Smart Clinic HIS</span>
          </div>
        </a>

        <!-- Nút ghim cố định tròn <-> -->
        <button
          type="button"
          class="pin-toggle-btn"
          [class.pinned]="isPinned()"
          (click)="togglePin()"
          [title]="isPinned() ? 'Bỏ ghim (tự thu nhỏ khi rời chuột)' : 'Ghim cố định thanh menu'"
        >
          <i class="bi bi-arrow-left-right"></i>
        </button>
      </div>

      <!-- Navigation List (Đã bỏ dấu > theo yêu cầu) -->
      <nav class="sidebar-nav">
        <!-- 1. ADMIN MENU (Toàn quyền quản trị & điều hành toàn viện) -->
        @if (isAdmin()) {
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeAllDropdowns()" class="nav-link-item" title="Tổng quan hệ thống">
            <div class="nav-icon"><i class="bi bi-speedometer2"></i></div>
            <span class="nav-label">TỔNG QUAN HỆ THỐNG</span>
          </a>
          <a routerLink="/admin/specialties" routerLinkActive="active" (click)="closeAllDropdowns()" class="nav-link-item" title="Quản lý chuyên khoa">
            <div class="nav-icon"><i class="bi bi-diagram-3"></i></div>
            <span class="nav-label">QUẢN LÝ CHUYÊN KHOA</span>
          </a>

          <!-- Nhóm 1: QUẢN LÝ NHÂN SỰ gộp 3 chức năng: Bác sĩ, Lễ tân, Kỹ thuật viên (Accordion Collapsible) -->
          <div class="nav-group-item" [class.has-active-child]="isPersonnelActive()" [class.is-expanded]="isPersonnelOpen()">
            <button
              type="button"
              class="nav-link-item nav-parent-btn"
              [class.active-parent]="isPersonnelActive()"
              (click)="togglePersonnel($event)"
              title="Quản lý nhân sự toàn viện"
            >
              <div class="nav-icon"><i class="bi bi-people-fill"></i></div>
              <span class="nav-label">QUẢN LÝ NHÂN SỰ</span>
              <i class="bi bi-chevron-down submenu-arrow" [class.rotated]="isPersonnelOpen()"></i>
            </button>

            <div class="submenu-wrapper" [class.is-open]="isPersonnelOpen()">
              <div class="submenu-inner">
                <div class="submenu-container">
                  <a routerLink="/admin/doctors" routerLinkActive="active" class="sub-link-item" title="Quản lý bác sĩ">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Bác sĩ</span>
                  </a>
                  <a routerLink="/admin/staff" routerLinkActive="active" class="sub-link-item" title="Quản lý lễ tân">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Lễ tân</span>
                  </a>
                  <a routerLink="/admin/lab-technicians" routerLinkActive="active" class="sub-link-item" title="Quản lý kỹ thuật viên cận lâm sàng">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Kỹ thuật viên</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Nhóm 2: KHO DƯỢC & THUỐC (Accordion Collapsible y hệt Quản lý nhân sự) -->
          <div class="nav-group-item" [class.has-active-child]="isMedicinesActive()" [class.is-expanded]="isMedicinesOpen()">
            <button
              type="button"
              class="nav-link-item nav-parent-btn"
              [class.active-parent]="isMedicinesActive()"
              (click)="toggleMedicines($event)"
              title="Quản lý kho dược phẩm & danh mục thuốc"
            >
              <div class="nav-icon"><i class="bi bi-capsule"></i></div>
              <span class="nav-label">KHO DƯỢC &amp; THUỐC</span>
              <i class="bi bi-chevron-down submenu-arrow" [class.rotated]="isMedicinesOpen()"></i>
            </button>

            <div class="submenu-wrapper" [class.is-open]="isMedicinesOpen()">
              <div class="submenu-inner">
                <div class="submenu-container">
                  <a routerLink="/admin/medicines/list" routerLinkActive="active" class="sub-link-item" title="Kho thuốc & biệt dược">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Kho thuốc &amp; Biệt dược</span>
                  </a>
                  <a routerLink="/admin/medicines/categories" routerLinkActive="active" class="sub-link-item" title="Nhóm & danh mục thuốc">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Nhóm &amp; Danh mục thuốc</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Nhóm 2: LỊCH TRỰC TOÀN VIỆN (Accordion Collapsible y hệt Quản lý nhân sự) -->
          <div class="nav-group-item" [class.has-active-child]="isScheduleActive()" [class.is-expanded]="isScheduleOpen()">
            <button
              type="button"
              class="nav-link-item nav-parent-btn"
              [class.active-parent]="isScheduleActive()"
              (click)="toggleSchedule($event)"
              title="Lịch phân ca trực toàn viện"
            >
              <div class="nav-icon"><i class="bi bi-calendar3"></i></div>
              <span class="nav-label">LỊCH TRỰC TOÀN VIỆN</span>
              <i class="bi bi-chevron-down submenu-arrow" [class.rotated]="isScheduleOpen()"></i>
            </button>

            <div class="submenu-wrapper" [class.is-open]="isScheduleOpen()">
              <div class="submenu-inner">
                <div class="submenu-container">
                  <a routerLink="/admin/schedules/doctors" routerLinkActive="active" class="sub-link-item" title="Lịch trực Bác sĩ">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Bác sĩ</span>
                  </a>
                  <a routerLink="/admin/schedules/technicians" routerLinkActive="active" class="sub-link-item" title="Lịch trực Kỹ thuật viên">
                    <span class="sub-link-dot"></span>
                    <span class="sub-label">Kỹ thuật viên</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <a routerLink="/lab/services" routerLinkActive="active" (click)="closeAllDropdowns()" class="nav-link-item" title="Quản lý danh mục kỹ thuật y khoa & xét nghiệm">
            <div class="nav-icon"><i class="bi bi-journal-medical"></i></div>
            <span class="nav-label">DANH MỤC XÉT NGHIỆM</span>
          </a>
        } @else if (isDoctor()) {
          <!-- 2. DOCTOR MENU -->
          <a routerLink="/doctor/calling" routerLinkActive="active" class="nav-link-item" title="Bàn gọi số khám bệnh">
            <div class="nav-icon"><i class="bi bi-megaphone-fill"></i></div>
            <span class="nav-label">BÀN GỌI KHÁM BỆNH</span>
          </a>
          <a routerLink="/doctor/examination" routerLinkActive="active" class="nav-link-item" title="Bàn khám bệnh & kê đơn">
            <div class="nav-icon"><i class="bi bi-clipboard2-pulse-fill"></i></div>
            <span class="nav-label">BÀN KHÁM &amp; KÊ ĐƠN</span>
          </a>
          <a routerLink="/doctor/history" routerLinkActive="active" class="nav-link-item" title="Lịch sử ca khám bệnh">
            <div class="nav-icon"><i class="bi bi-clock-history"></i></div>
            <span class="nav-label">LỊCH SỬ CA KHÁM</span>
          </a>
          <a routerLink="/doctor/medicines" routerLinkActive="active" class="nav-link-item" title="Tra cứu danh mục Dược & tồn kho">
            <div class="nav-icon"><i class="bi bi-capsule"></i></div>
            <span class="nav-label">TRA CỨU DƯỢC PHẨM</span>
          </a>
          <a routerLink="/lab/services" routerLinkActive="active" class="nav-link-item" title="Danh mục & chỉ số tham chiếu XN">
            <div class="nav-icon"><i class="bi bi-journal-medical"></i></div>
            <span class="nav-label">DANH MỤC XÉT NGHIỆM</span>
          </a>
          <a routerLink="/doctor/schedule" routerLinkActive="active" class="nav-link-item" title="Ca trực của tôi">
            <div class="nav-icon"><i class="bi bi-calendar2-week-fill"></i></div>
            <span class="nav-label">CA TRỰC CỦA TÔI</span>
          </a>
        } @else if (isLabTech()) {
          <!-- 3. LAB TECH MENU (Kỹ thuật viên xét nghiệm) -->
          <a routerLink="/lab" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link-item" title="Bàn làm việc xét nghiệm">
            <div class="nav-icon"><i class="bi bi-eyedropper"></i></div>
            <span class="nav-label">BÀN LÀM VIỆC XN</span>
          </a>
          <a routerLink="/lab/services" routerLinkActive="active" class="nav-link-item" title="Danh mục & chỉ số chuẩn">
            <div class="nav-icon"><i class="bi bi-journal-medical"></i></div>
            <span class="nav-label">DANH MỤC &amp; CHỈ SỐ</span>
          </a>
          <a routerLink="/lab/my-shifts" routerLinkActive="active" class="nav-link-item" title="Ca trực của tôi">
            <div class="nav-icon"><i class="bi bi-calendar2-week-fill"></i></div>
            <span class="nav-label">CA TRỰC CỦA TÔI</span>
          </a>
        } @else {
          <!-- 4. STAFF / CHUNG MENU (Lễ tân, Điều phối hoặc Fallback an toàn) -->
          <a routerLink="/staff/check-in" routerLinkActive="active" class="nav-link-item" title="Tiếp đón & cấp số">
            <div class="nav-icon"><i class="bi bi-person-check-fill"></i></div>
            <span class="nav-label">TIẾP ĐÓN &amp; CẤP SỐ</span>
          </a>
          <a routerLink="/staff/queue" routerLinkActive="active" class="nav-link-item" title="Điều phối hàng đợi phòng khám">
            <div class="nav-icon"><i class="bi bi-sliders"></i></div>
            <span class="nav-label">ĐIỀU PHỐI HÀNG ĐỢI</span>
          </a>
          <a routerLink="/lab/services" routerLinkActive="active" class="nav-link-item" title="Bảng giá kỹ thuật cận lâm sàng">
            <div class="nav-icon"><i class="bi bi-journal-medical"></i></div>
            <span class="nav-label">BẢNG GIÁ DỊCH VỤ</span>
          </a>
        }
      </nav>

      <!-- Sidebar Bottom Area -->
      <div class="sidebar-footer">
        <button type="button" class="sidebar-bottom-btn" title="Thông báo hệ thống">
          <i class="bi bi-bell"></i>
          <span class="badge-dot"></span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Giao diện Sáng (Light Medical Sidebar) tiệp màu 100% với giao diện MedQueue */
    .app-sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 68px;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      color: #64748b;
      display: flex;
      flex-direction: column;
      z-index: 1040;
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      overflow-x: hidden;
      box-shadow: 2px 0 12px rgba(15, 23, 42, 0.05);
      user-select: none;
    }

    /* Khi mở rộng: Rê chuột (:hover) HOẶC Ghim cố định (.is-pinned) */
    .app-sidebar:hover,
    .app-sidebar.is-pinned {
      width: 250px;
      box-shadow: 8px 0 30px rgba(15, 23, 42, 0.12);
    }

    /* ========================================================
       1. HEADER & LOGO (Trắng sáng, cân đối tuyệt đối)
       ======================================================== */
    .sidebar-header {
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding: 0 13px;
      border-bottom: 1px solid #f1f5f9;
      position: relative;
      flex-shrink: 0;
    }

    .brand-link {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      text-decoration: none;
      color: #0f172a;
      gap: 0.75rem;
    }

    .brand-logo-circle {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #ffffff;
      font-size: 1.25rem;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: transform 0.2s;
    }

    .brand-logo-circle:hover {
      transform: scale(1.05);
    }

    .brand-info {
      display: none;
      flex-direction: column;
      white-space: nowrap;
      overflow: hidden;
    }

    .app-sidebar:hover .brand-info,
    .app-sidebar.is-pinned .brand-info {
      display: flex;
    }

    .brand-name {
      font-size: 1.18rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.15;
      letter-spacing: -0.01em;
    }

    .brand-accent {
      color: #0284c7;
    }

    .brand-sub {
      font-size: 0.68rem;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Nút Pin ghim <-> */
    .pin-toggle-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #475569;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      cursor: pointer;
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
      transition: all 0.2s;
    }

    .app-sidebar:hover .pin-toggle-btn,
    .app-sidebar.is-pinned .pin-toggle-btn {
      display: flex;
    }

    .pin-toggle-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
      transform: translateY(-50%) scale(1.1);
    }

    .pin-toggle-btn.pinned {
      background: #0284c7;
      color: #ffffff;
      border-color: #0369a1;
    }

    /* ========================================================
       2. NAVIGATION MENU ITEMS (Chuẩn tone màu sáng, đã bỏ >)
       ======================================================== */
    .sidebar-nav {
      flex: 1;
      padding: 0.85rem 11px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }

    .sidebar-nav::-webkit-scrollbar {
      display: none;
    }

    /* Icon luôn cố định tại cùng vị trí (11px nav + 7px item), chỉ phần chữ được mở ra */
    .nav-link-item {
      width: 100%;
      height: 46px;
      padding: 0 7px;
      margin: 0 0 0.45rem 0;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      color: #64748b;
      text-decoration: none;
      transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
      position: relative;
      background: transparent;
    }

    /* Item khi Mở Rộng: Kéo dài 100% bề ngang thanh menu */
    .nav-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      flex-shrink: 0;
      color: #64748b;
      transition: all 0.2s;
    }

    .nav-label {
      flex: 1;
      margin-left: 0.75rem;
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #334155;
      display: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .app-sidebar:hover .nav-label,
    .app-sidebar.is-pinned .nav-label {
      display: block;
    }

    /* Hover State */
    .nav-link-item:hover {
      background: #f0f9ff;
      color: #0284c7;
    }

    .nav-link-item:hover .nav-icon {
      color: #0284c7;
      transform: scale(1.1);
    }

    .nav-link-item:hover .nav-label {
      color: #0284c7;
    }

    /* ACTIVE State - Nền xanh nhẹ viền xanh đậm hài hòa */
    .nav-link-item.active {
      background: #e0f2fe;
      color: #0369a1;
    }

    .nav-link-item.active .nav-icon {
      color: #0284c7;
    }

    .nav-link-item.active .nav-label {
      color: #0369a1;
      font-weight: 800;
    }

    /* Khi thu gọn (không hover và không ghim), active có bo tròn nổi bật */
    .app-sidebar:not(:hover):not(.is-pinned) .nav-link-item.active {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      box-shadow: 0 3px 10px rgba(2, 132, 199, 0.35);
    }

    .app-sidebar:not(:hover):not(.is-pinned) .nav-link-item.active .nav-icon {
      color: #ffffff;
    }

    /* ========================================================
       Submenu Collapsible Group: QUẢN LÝ NHÂN SỰ
       ======================================================== */
    .nav-group-item {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin: 0 0 0.35rem 0;
    }

    .nav-parent-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      font-family: inherit;
      width: 100%;
      text-align: left;
    }

    .submenu-arrow {
      font-size: 0.72rem;
      color: #94a3b8;
      display: none;
      margin-left: auto;
      margin-right: 8px;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s ease;
    }

    .app-sidebar:hover .submenu-arrow,
    .app-sidebar.is-pinned .submenu-arrow {
      display: block;
    }

    .submenu-arrow.rotated {
      transform: rotate(180deg);
      color: #0284c7;
    }

    .nav-parent-btn:hover .submenu-arrow {
      color: #0284c7;
    }

    .nav-parent-btn.active-parent {
      color: #0369a1;
      background: #f0f9ff;
    }

    .nav-parent-btn.active-parent .nav-icon {
      color: #0284c7;
    }

    .nav-parent-btn.active-parent .nav-label {
      color: #0369a1;
      font-weight: 800;
    }

    /* Khi sidebar thu nhỏ (mini mode 68px): active parent có background nổi bật */
    .app-sidebar:not(:hover):not(.is-pinned) .nav-parent-btn.active-parent {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      box-shadow: 0 3px 10px rgba(2, 132, 199, 0.35);
    }

    .app-sidebar:not(:hover):not(.is-pinned) .nav-parent-btn.active-parent .nav-icon {
      color: #ffffff;
    }

    /* Accordion Wrapper: Chuyển động đóng/mở mượt mà bằng CSS Grid transition */
    .submenu-wrapper {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s;
      visibility: hidden;
    }

    .submenu-wrapper.is-open {
      grid-template-rows: 1fr;
      visibility: visible;
      transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s;
    }

    .submenu-inner {
      overflow: hidden;
      opacity: 0;
      transform: translateY(-4px);
      transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .submenu-wrapper.is-open .submenu-inner {
      opacity: 1;
      transform: translateY(0);
    }

    /* Submenu Container */
    .submenu-container {
      display: flex;
      flex-direction: column;
      padding: 0.15rem 0 0.45rem 0;
      gap: 0.2rem;
    }

    /* Khi sidebar thu nhỏ không hover/pinned: ẩn danh sách con để không tràn */
    .app-sidebar:not(:hover):not(.is-pinned) .submenu-wrapper {
      display: none;
    }

    .sub-link-item {
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 12px 0 46px;
      text-decoration: none;
      color: #475569;
      font-size: 0.84rem;
      font-weight: 600;
      transition: all 0.2s;
      white-space: nowrap;
      position: relative;
    }

    .sub-link-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #cbd5e1;
      margin-right: 12px;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .sub-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sub-link-item:hover {
      background: #f1f5f9;
      color: #0284c7;
      padding-left: 50px;
    }

    .sub-link-item:hover .sub-link-dot {
      background: #0284c7;
      transform: scale(1.4);
    }

    /* Kiểu dáng Active như trong hình (Lệnh sản xuất): Pill bo góc nổi bật */
    .sub-link-item.active {
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
    }

    .sub-link-item.active .sub-link-dot {
      background: #0284c7;
      width: 7px;
      height: 7px;
      box-shadow: 0 0 6px rgba(2, 132, 199, 0.6);
    }

    /* ========================================================
       3. FOOTER AREA (Chuông thông báo sáng đẹp)
       ======================================================== */
    .sidebar-footer {
      padding: 0.85rem 13px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      background: #f8fafc;
    }

    .sidebar-bottom-btn {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
      margin: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .sidebar-bottom-btn:hover {
      background: #f0f9ff;
      color: #0284c7;
      border-color: #0284c7;
      transform: scale(1.08);
    }

    .badge-dot {
      position: absolute;
      top: 9px;
      right: 10px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 5px rgba(239, 68, 68, 0.8);
    }
  `]
})
export class SidebarComponent {
  readonly authService = inject(AuthService);
  readonly sidebarService = inject(SidebarService);
  private readonly router = inject(Router);

  readonly isPinned = this.sidebarService.isPinned;

  readonly isAdmin = this.authService.isAdmin;
  readonly isDoctor = this.authService.isDoctor;
  readonly isLabTech = this.authService.isLabTech;
  readonly isStaff = this.authService.isStaff;

  currentUrl = signal<string>(this.router.url);
  isPersonnelOpen = signal<boolean>(this.isPersonnelRoute(this.router.url));
  isMedicinesOpen = signal<boolean>(this.isMedicinesRoute(this.router.url));
  isScheduleOpen = signal<boolean>(this.isScheduleRoute(this.router.url));

  readonly isPersonnelActive = computed(() => this.isPersonnelRoute(this.currentUrl()));
  readonly isMedicinesActive = computed(() => this.isMedicinesRoute(this.currentUrl()));
  readonly isScheduleActive = computed(() => this.isScheduleRoute(this.currentUrl()));

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects || e.url;
        this.currentUrl.set(url);
        // Tự động mở menu tương ứng với route hiện tại và đóng các menu còn lại
        const inPersonnel = this.isPersonnelRoute(url);
        const inMedicines = this.isMedicinesRoute(url);
        const inSchedule = this.isScheduleRoute(url);
        this.isPersonnelOpen.set(inPersonnel);
        this.isMedicinesOpen.set(inMedicines);
        this.isScheduleOpen.set(inSchedule);
      });
  }

  isPersonnelRoute(url: string): boolean {
    if (!url) return false;
    return (
      url.includes('/admin/doctors') ||
      url.includes('/admin/staff') ||
      url.includes('/admin/lab-technicians') ||
      url.includes('/admin/lab-techs') ||
      url.includes('/admin/personnel')
    );
  }

  isMedicinesRoute(url: string): boolean {
    if (!url) return false;
    return url.includes('/admin/medicines');
  }

  isScheduleRoute(url: string): boolean {
    if (!url) return false;
    return url.includes('/admin/schedules');
  }

  togglePersonnel(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nextState = !this.isPersonnelOpen();
    this.isPersonnelOpen.set(nextState);
    if (nextState) {
      this.isMedicinesOpen.set(false);
      this.isScheduleOpen.set(false);
    }
  }

  toggleMedicines(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nextState = !this.isMedicinesOpen();
    this.isMedicinesOpen.set(nextState);
    if (nextState) {
      this.isPersonnelOpen.set(false);
      this.isScheduleOpen.set(false);
    }
  }

  toggleSchedule(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const nextState = !this.isScheduleOpen();
    this.isScheduleOpen.set(nextState);
    if (nextState) {
      this.isPersonnelOpen.set(false);
      this.isMedicinesOpen.set(false);
    }
  }

  closeAllDropdowns(): void {
    this.isPersonnelOpen.set(false);
    this.isMedicinesOpen.set(false);
    this.isScheduleOpen.set(false);
  }

  closePersonnel(): void {
    this.closeAllDropdowns();
  }

  togglePin(): void {
    this.sidebarService.togglePin();
  }
}
