import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { CheckInRequest, QueueTicket, PatientLookup } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="check-in-page">
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="live-dot"></span> Bàn Tiếp Đón &amp; Cấp Số Thứ Tự
          </div>
          <h1 class="page-title">Tiếp Đón Bệnh Nhân &amp; Phát Số Khám</h1>
          <p class="page-subtitle">
            Tra cứu hồ sơ y tế cũ hoặc đăng ký bệnh nhân mới, lựa chọn phòng khám và phát phiếu in nhiệt cho người bệnh
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/staff/queue" class="btn btn-outline">
            <i class="bi bi-sliders"></i> Sang Bàn Điều Phối Hàng Đợi
          </a>
          <a routerLink="/queue" target="_blank" class="btn btn-outline">
            <i class="bi bi-display"></i> Mở TV Sảnh Chờ
          </a>
        </div>
      </div>

      <!-- Alerts (Floating Toast) -->
      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
            <div class="toast-icon">
              <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
            </div>
            <div class="toast-content">
              <div class="toast-title">{{ alertType() === 'success' ? 'Thành công' : 'Thông báo' }}</div>
              <div class="toast-message">{{ alertMessage() }}</div>
            </div>
            <button type="button" class="btn-close-toast" (click)="alertMessage.set(null)" title="Đóng thông báo" aria-label="Đóng">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
      }

      <div class="main-layout-grid">
        <!-- Left Column: Patient Reception Form -->
        <div class="reception-form-section">
          <!-- Step 1: Patient Search Card -->
          <div class="card-box mb-4">
            <div class="card-box-header">
              <div class="card-box-title">
                <i class="bi bi-search text-primary"></i> 1. Tra Cứu Hồ Sơ Bệnh Nhân Cũ (Nếu có)
              </div>
              @if (selectedPatient()) {
                <button class="btn btn-sm btn-outline" (click)="resetFormToNew()">
                  <i class="bi bi-plus-circle"></i> Đăng Ký Người Mới
                </button>
              }
            </div>
            <div class="card-box-body">
              <div class="search-input-group">
                <div class="search-field">
                  <i class="bi bi-search search-icon"></i>
                  <input
                    type="text"
                    [(ngModel)]="searchKeyword"
                    (input)="onSearchInput()"
                    (keyup.enter)="executePatientLookup()"
                    placeholder="Nhập Số điện thoại, Họ tên hoặc CCCD để tra cứu nhanh..."
                    class="form-control search-input"
                  />
                  @if (searchKeyword) {
                    <button class="clear-btn" (click)="clearSearch()">
                      <i class="bi bi-x-circle-fill"></i>
                    </button>
                  }
                </div>
                <button
                  class="btn btn-primary-outline search-btn"
                  [disabled]="isSearching() || !searchKeyword.trim()"
                  (click)="executePatientLookup()"
                >
                  @if (isSearching()) {
                    <span class="spinner-sm"></span> Đang tìm...
                  } @else {
                    <i class="bi bi-search"></i> Tìm kiếm
                  }
                </button>
              </div>

              <!-- Search Results Dropdown/List -->
              @if (lookupResults().length > 0) {
                <div class="lookup-results-list">
                  <div class="results-title">
                    <i class="bi bi-people-fill"></i> Tìm thấy {{ lookupResults().length }} hồ sơ bệnh nhân phù hợp:
                  </div>
                  @for (p of lookupResults(); track p.id) {
                    <div class="lookup-item" (click)="selectPatient(p)">
                      <div class="lookup-item-main">
                        <span class="lookup-name">{{ p.fullName }}</span>
                        @if (p.gender) {
                          <span class="lookup-badge gender-badge">{{ p.gender }}</span>
                        }
                        @if (p.dateOfBirth) {
                          <span class="lookup-meta">Sinh ngày: {{ p.dateOfBirth | date:'dd/MM/yyyy' }}</span>
                        }
                      </div>
                      <div class="lookup-item-sub">
                        <span><i class="bi bi-telephone"></i> {{ p.phoneNumber || 'Chưa có SĐT' }}</span>
                        @if (p.nationalId) {
                          <span><i class="bi bi-card-heading"></i> CCCD: {{ p.nationalId }}</span>
                        }
                        @if (p.address) {
                          <span><i class="bi bi-geo-alt"></i> {{ p.address }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else if (hasSearched() && !isSearching()) {
                <div class="search-empty-hint">
                  <i class="bi bi-info-circle"></i> Không tìm thấy hồ sơ trùng khớp. Vui lòng điền thông tin bên dưới để tiếp đón như bệnh nhân mới.
                </div>
              }

              @if (selectedPatient()) {
                <div class="selected-patient-banner">
                  <div class="banner-icon">
                    <i class="bi bi-person-check-fill"></i>
                  </div>
                  <div class="banner-content">
                    <div class="banner-title">
                      Đã chọn hồ sơ: <strong>{{ selectedPatient()?.fullName }}</strong> (Mã HS: #{{ selectedPatient()?.id }})
                    </div>
                    <div class="banner-details">
                      SĐT: {{ selectedPatient()?.phoneNumber || 'N/A' }} • 
                      Ngày sinh: {{ selectedPatient()?.dateOfBirth ? (selectedPatient()?.dateOfBirth | date:'dd/MM/yyyy') : 'N/A' }} • 
                      Giới tính: {{ selectedPatient()?.gender || 'N/A' }}
                      @if (selectedPatient()?.allergies) {
                        <span class="text-danger font-bold"> • Dị ứng: {{ selectedPatient()?.allergies }}</span>
                      }
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline-danger" (click)="resetFormToNew()" title="Hủy liên kết hồ sơ">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Step 2: Check-in Form -->
          <div class="card-box">
            <div class="card-box-header">
              <div class="card-box-title">
                <i class="bi bi-card-checklist text-primary"></i> 2. Thông Tin Khám Bệnh &amp; Chỉ Định Phòng
              </div>
            </div>
            <div class="card-box-body">
              <form (ngSubmit)="submitCheckIn()" #f="ngForm">
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label class="form-label required">Họ và tên bệnh nhân</label>
                    <input
                      type="text"
                      [(ngModel)]="form.patientName"
                      name="patientName"
                      placeholder="Ví dụ: Nguyễn Văn An"
                      class="form-control"
                      required
                    />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label required">Số điện thoại</label>
                    <input
                      type="tel"
                      [(ngModel)]="form.patientPhone"
                      name="patientPhone"
                      placeholder="0912345678"
                      class="form-control"
                      required
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label required">
                      Ngày tháng năm sinh
                    </label>
                    <input
                      type="date"
                      [(ngModel)]="form.patientDob"
                      name="patientDob"
                      (change)="onDobChange()"
                      [max]="todayString"
                      class="form-control"
                      required
                    />
                    <small class="form-hint">
                      Chọn đầy đủ ngày, tháng, năm để hệ thống tự động xác định tuổi &amp; áp dụng chính sách ưu tiên
                    </small>
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">Tuổi &amp; Diện ưu tiên độ tuổi</label>
                    <div class="age-display-box">
                      @if (calculatedAge() !== null) {
                        <span class="age-val"><strong>{{ calculatedAge() }}</strong> tuổi</span>
                        @if (isPriorityElderly()) {
                          <span class="badge badge-elderly"><i class="bi bi-star-fill"></i> Người cao tuổi (≥70)</span>
                        } @else if (isPriorityChild()) {
                          <span class="badge badge-child"><i class="bi bi-star-fill"></i> Trẻ nhỏ (≤6)</span>
                        } @else {
                          <span class="badge badge-normal">Độ tuổi thông thường</span>
                        }
                      } @else {
                        <span class="text-muted">Chưa nhập ngày sinh</span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Room Selection with live load indicators -->
                <div class="form-group">
                  <label class="form-label required">Phòng khám tiếp nhận</label>
                  <div class="room-cards-grid">
                    @for (r of rooms(); track r.id) {
                      <div
                        class="room-select-card"
                        [class.selected]="form.examinationRoomId === r.id"
                        (click)="selectRoom(r.id)"
                      >
                        <div class="room-card-top">
                          <span class="room-number-tag">{{ r.roomNumber }}</span>
                          <span class="room-floor-tag">Tầng {{ r.floor }}</span>
                        </div>
                        <div class="room-name-text">{{ r.roomName }}</div>
                        <div class="room-status-indicator">
                          <span class="waiting-indicator">
                            <i class="bi bi-people"></i>
                            Đang chờ: <strong>{{ getRoomWaitingCount(r.id) }}</strong> ca
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                </div>

                <!-- Emergency Priority Checkbox -->
                <div class="emergency-toggle-card">
                  <label class="toggle-container">
                    <input type="checkbox" [(ngModel)]="form.isEmergency" name="isEmergency" />
                    <span class="toggle-text">
                      <strong class="text-danger">
                        <i class="bi bi-exclamation-octagon-fill"></i> Cấp cứu / Khẩn cấp (Ưu tiên số 1)
                      </strong>
                      <span class="toggle-sub">Đánh dấu nếu bệnh nhân cần cấp cứu khẩn cấp hoặc tình trạng chuyển nặng</span>
                    </span>
                  </label>
                </div>

                <!-- Initial Symptoms / Notes -->
                <div class="form-group">
                  <label class="form-label">Lý do khám / Triệu chứng ban đầu</label>
                  <textarea
                    [(ngModel)]="form.notes"
                    name="notes"
                    rows="2"
                    placeholder="Ví dụ: Đau đầu kéo dài 3 ngày, sốt nhẹ 38 độ, ho khan..."
                    class="form-control"
                  ></textarea>
                </div>

                <!-- Submit Button -->
                <div class="form-action-bar">
                  <button
                    type="submit"
                    class="btn btn-primary btn-lg submit-checkin-btn"
                    [disabled]="submitting() || !isFormValid()"
                  >
                    @if (submitting()) {
                      <span class="spinner-sm"></span> Đang tạo phiếu khám...
                    } @else {
                      <i class="bi bi-printer-fill"></i> Cấp Số Thứ Tự &amp; In Phiếu Khám
                    }
                  </button>
                  <button type="button" class="btn btn-outline" (click)="resetFormToNew()">
                    <i class="bi bi-arrow-counterclockwise"></i> Làm Mới Form
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Right Column: Recent Issued Tickets & Quick Print -->
        <div class="recent-tickets-section">
          <div class="card-box h-full">
            <div class="card-box-header">
              <div class="card-box-title">
                <i class="bi bi-clock-history text-primary"></i> Phiếu Đã Cấp Gần Nhất Hôm Nay
              </div>
              <button class="btn btn-sm btn-outline" (click)="loadRecentTickets()" title="Tải lại danh sách">
                <i class="bi bi-arrow-clockwise"></i> Làm mới
              </button>
            </div>
            <div class="card-box-body p-0">
              @if (recentLoading()) {
                <div class="loading-state-sm">
                  <div class="spinner-sm"></div>
                  <span>Đang tải lịch sử cấp số...</span>
                </div>
              } @else if (recentTickets().length === 0) {
                <div class="empty-state-card">
                  <i class="bi bi-ticket-detailed"></i>
                  <p>Hôm nay chưa có phiếu khám nào được cấp</p>
                </div>
              } @else {
                <div class="recent-tickets-list">
                  @for (t of recentTickets(); track t.id) {
                    <div class="recent-ticket-card" [class.emergency-card]="t.isEmergency">
                      <div class="recent-ticket-top">
                        <span class="ticket-badge num">{{ t.ticketNumber }}</span>
                        <span class="ticket-status-pill" [ngClass]="getStatusClass(t.status)">
                          {{ getStatusLabel(t.status) }}
                        </span>
                      </div>
                      <div class="recent-patient-info">
                        <strong class="patient-name">{{ t.patientName }}</strong>
                        <div class="patient-meta-row">
                          <span><i class="bi bi-telephone"></i> {{ t.patientPhone }}</span>
                          <span><i class="bi bi-clock"></i> {{ t.checkInTime }}</span>
                        </div>
                        <div class="patient-room-info">
                          <i class="bi bi-door-closed"></i> Phòng: <strong>{{ t.roomNumber }} - {{ t.roomName }}</strong>
                        </div>
                      </div>
                      <div class="recent-ticket-actions">
                        <button class="btn btn-sm btn-outline-primary" (click)="openThermalPrintModal(t)" title="In lại phiếu khám">
                          <i class="bi bi-printer"></i> In lại
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Thermal Ticket Print Modal -->
      @if (showPrintModal() && printedTicket()) {
        <div class="modal-backdrop" (click)="closePrintModal()">
          <div class="modal-dialog print-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-printer-fill text-primary"></i> Phiếu Khám Bệnh In Nhiệt
              </h2>
              <button class="modal-close-btn" (click)="closePrintModal()">×</button>
            </div>
            <div class="modal-body print-modal-body">
              <!-- Thermal Paper Simulation -->
              <div class="thermal-receipt" id="thermal-receipt-element">
                <div class="receipt-header">
                  <div class="receipt-hospital-name">PHÒNG KHÁM ĐA KHOA MEDQUEUE</div>
                  <div class="receipt-address">123 Đường Y Tế, Quận Đống Đa, Hà Nội</div>
                  <div class="receipt-hotline">Hotline: 1900 6868 • Website: medqueue.vn</div>
                  <div class="receipt-divider">================================</div>
                  <div class="receipt-title">PHIẾU ĐĂNG KÝ KHÁM BỆNH</div>
                </div>

                <div class="receipt-ticket-number">
                  <span class="number-label">SỐ THỨ TỰ</span>
                  <span class="number-big num">{{ printedTicket()?.ticketNumber }}</span>
                </div>

                @if (printedTicket()?.isEmergency) {
                  <div class="receipt-emergency-banner">
                    *** ƯU TIÊN CẤP CỨU ***
                  </div>
                }

                <div class="receipt-body">
                  <div class="receipt-row">
                    <span class="r-label">Người bệnh:</span>
                    <span class="r-val font-bold">{{ printedTicket()?.patientName }}</span>
                  </div>
                  <div class="receipt-row">
                    <span class="r-label">Ngày sinh:</span>
                    <span class="r-val">
                      {{ printedTicket()?.patientDob ? (printedTicket()?.patientDob | date:'dd/MM/yyyy') : (printedTicket()?.patientYearOfBirth || 'N/A') }}
                    </span>
                  </div>
                  <div class="receipt-row">
                    <span class="r-label">Điện thoại:</span>
                    <span class="r-val">{{ printedTicket()?.patientPhone }}</span>
                  </div>
                  <div class="receipt-divider">--------------------------------</div>
                  <div class="receipt-row">
                    <span class="r-label">Phòng khám:</span>
                    <span class="r-val font-bold">{{ printedTicket()?.roomNumber }} - {{ printedTicket()?.roomName }}</span>
                  </div>
                  @if (printedTicket()?.doctorName) {
                    <div class="receipt-row">
                      <span class="r-label">Bác sĩ khám:</span>
                      <span class="r-val">{{ printedTicket()?.doctorName }}</span>
                    </div>
                  }
                  @if (printedTicket()?.specialtyName) {
                    <div class="receipt-row">
                      <span class="r-label">Chuyên khoa:</span>
                      <span class="r-val">{{ printedTicket()?.specialtyName }}</span>
                    </div>
                  }
                  <div class="receipt-row">
                    <span class="r-label">Giờ lấy số:</span>
                    <span class="r-val">{{ printedTicket()?.checkInTime }} ({{ printedTicket()?.ticketDate | date:'dd/MM/yyyy' }})</span>
                  </div>
                  <div class="receipt-divider">--------------------------------</div>
                  <div class="receipt-row">
                    <span class="r-label">Ước tính chờ:</span>
                    <span class="r-val">~{{ printedTicket()?.estimatedWaitingMinutes || 15 }} phút</span>
                  </div>
                </div>

                <div class="receipt-footer">
                  <div class="receipt-note">
                    * Quý khách vui lòng theo dõi bảng điện tử tại sảnh chờ.<br />
                    * Khi được gọi số, vui lòng xuất trình phiếu này tại phòng khám.
                  </div>
                  <div class="receipt-code">
                    Mã tra cứu trực tuyến: <strong>{{ printedTicket()?.ticketNumber }}</strong>
                  </div>
                  <div class="receipt-thanks">CẢM ƠN QUÝ KHÁCH ĐÃ TIN TƯỞNG!</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closePrintModal()">Đóng</button>
              <button class="btn btn-primary" (click)="triggerBrowserPrint()">
                <i class="bi bi-printer-fill"></i> In Phiếu (Print)
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .check-in-page {
      padding: 1.5rem 1.5rem 3.5rem;
      max-width: 1360px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background-color: var(--primary-50);
      color: var(--primary-800);
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.4rem;
      border: 1px solid var(--primary-200);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      background-color: var(--success-solid);
      border-radius: 50%;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.25rem;
      letter-spacing: -0.01em;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 0.925rem;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    /* Main Grid Layout */
    .main-layout-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .main-layout-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Card Box */
    .card-box {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }

    .card-box.h-full {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .card-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.9rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
    }

    .card-box-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-box-body {
      padding: 1.25rem;
    }

    .card-box-body.p-0 {
      padding: 0;
    }

    .mb-4 {
      margin-bottom: 1.25rem;
    }

    /* Step 1 Search */
    .search-input-group {
      display: flex;
      gap: 0.65rem;
    }

    .search-field {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .search-input {
      padding-left: 2.35rem;
      padding-right: 2.2rem;
    }

    .clear-btn {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0;
      font-size: 0.9rem;
    }

    .clear-btn:hover {
      color: var(--danger-solid);
    }

    .btn-primary-outline {
      background: transparent;
      border: 1.5px solid var(--primary-600);
      color: var(--primary-600);
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }

    .btn-primary-outline:hover:not(:disabled) {
      background: var(--primary-50);
    }

    /* Lookup Results */
    .lookup-results-list {
      margin-top: 0.85rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: #ffffff;
      max-height: 240px;
      overflow-y: auto;
    }

    .results-title {
      padding: 0.5rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--primary-800);
      background: var(--primary-50);
      border-bottom: 1px solid var(--border-color);
    }

    .lookup-item {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .lookup-item:hover {
      background-color: var(--bg-subtle);
    }

    .lookup-item-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.2rem;
    }

    .lookup-name {
      font-weight: 700;
      color: var(--text-main);
      font-size: 0.9rem;
    }

    .lookup-badge {
      font-size: 0.725rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      font-weight: 600;
    }

    .gender-badge {
      background: #e2e8f0;
      color: #334155;
    }

    .lookup-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .lookup-item-sub {
      font-size: 0.8rem;
      color: var(--text-secondary);
      display: flex;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .search-empty-hint {
      margin-top: 0.75rem;
      padding: 0.6rem 0.85rem;
      background: #f1f5f9;
      border-radius: var(--radius-sm);
      font-size: 0.825rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .selected-patient-banner {
      margin-top: 0.85rem;
      padding: 0.75rem 1rem;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .banner-icon {
      font-size: 1.4rem;
      color: var(--success-solid);
    }

    .banner-content {
      flex: 1;
    }

    .banner-title {
      font-size: 0.875rem;
      color: #065f46;
    }

    .banner-details {
      font-size: 0.8rem;
      color: #047857;
      margin-top: 0.15rem;
    }

    /* Form Rows */
    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .flex-1 { flex: 1; }
    .flex-2 { flex: 2; }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.35rem;
    }

    .form-label.required::after {
      content: " *";
      color: var(--danger-solid);
    }

    .form-hint {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.3rem;
    }

    .age-display-box {
      height: 38px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0 0.85rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
    }

    .age-val {
      font-size: 0.9rem;
      color: var(--text-main);
    }

    .badge-elderly {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fde68a;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
    }

    .badge-child {
      background: #e0e7ff;
      color: #3730a3;
      border: 1px solid #c7d2fe;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
    }

    .badge-normal {
      background: #f1f5f9;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
    }

    /* Room Cards Grid */
    .room-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
      margin-top: 0.4rem;
    }

    .room-select-card {
      padding: 0.75rem 0.85rem;
      background: #ffffff;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .room-select-card:hover {
      border-color: var(--primary-400);
      background-color: var(--primary-50);
    }

    .room-select-card.selected {
      border-color: var(--primary-600);
      background-color: #f0f9ff;
      box-shadow: 0 0 0 1px var(--primary-600);
    }

    .room-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .room-number-tag {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--primary-700);
      background: #e0f2fe;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-xs);
    }

    .room-floor-tag {
      font-size: 0.725rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .room-name-text {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 0.35rem;
    }

    .room-status-indicator {
      font-size: 0.775rem;
      color: var(--text-secondary);
    }

    .waiting-indicator strong {
      color: var(--primary-700);
    }

    /* Emergency Toggle */
    .emergency-toggle-card {
      background: #fff1f2;
      border: 1.5px solid #fecdd3;
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin-bottom: 1.25rem;
    }

    .toggle-container {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
    }

    .toggle-container input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 0.15rem;
      accent-color: var(--danger-solid);
      cursor: pointer;
    }

    .toggle-text {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .toggle-sub {
      font-size: 0.775rem;
      color: #9f1239;
    }

    .font-bold { font-weight: 700; }
    .text-danger { color: var(--danger-solid); }

    .form-action-bar {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }

    .submit-checkin-btn {
      flex: 1;
      padding: 0.75rem 1.5rem;
      font-size: 1.05rem;
      font-weight: 700;
    }

    /* Recent Tickets Right Column */
    .recent-tickets-list {
      max-height: 640px;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .recent-ticket-card {
      padding: 0.75rem 0.85rem;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: all 0.15s ease;
    }

    .recent-ticket-card:hover {
      border-color: var(--primary-300);
      box-shadow: var(--shadow-xs);
    }

    .recent-ticket-card.emergency-card {
      border-left: 4px solid var(--danger-solid);
      background-color: #fffaf0;
    }

    .recent-ticket-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ticket-badge {
      font-size: 1rem;
      font-weight: 800;
      color: var(--primary-800);
      background: var(--primary-50);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-xs);
      border: 1px solid var(--primary-200);
    }

    .ticket-status-pill {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-xs);
    }

    .status-waiting { background: #fef3c7; color: #92400e; }
    .status-called { background: #e0f2fe; color: #0369a1; }
    .status-progress { background: #dcfce7; color: #15803d; }
    .status-completed { background: #f1f5f9; color: #475569; }
    .status-skipped { background: #fee2e2; color: #b91c1c; }
    .status-cancelled { background: #e2e8f0; color: #64748b; }

    .patient-name {
      font-size: 0.9rem;
      color: var(--text-main);
    }

    .patient-meta-row {
      font-size: 0.775rem;
      color: var(--text-muted);
      display: flex;
      gap: 0.75rem;
      margin-top: 0.2rem;
    }

    .patient-room-info {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.2rem;
    }

    .recent-ticket-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.35rem;
      padding-top: 0.35rem;
      border-top: 1px dashed var(--border-subtle);
    }

    .empty-state-card {
      padding: 3rem 1rem;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state-card i {
      font-size: 2.5rem;
      display: block;
      margin-bottom: 0.5rem;
    }

    .loading-state-sm {
      padding: 2rem 1rem;
      text-align: center;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    /* Thermal Receipt Simulation Modal */
    .print-dialog {
      max-width: 440px;
    }

    .print-modal-body {
      background-color: #f1f5f9;
      padding: 1.5rem;
      display: flex;
      justify-content: center;
    }

    .thermal-receipt {
      background: #ffffff;
      width: 100%;
      max-width: 320px;
      padding: 1.5rem 1.25rem;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      font-family: 'Courier New', Courier, monospace;
      color: #1e293b;
      font-size: 0.85rem;
      line-height: 1.4;
      border-radius: 4px;
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 0.75rem;
    }

    .receipt-hospital-name {
      font-weight: 800;
      font-size: 0.95rem;
      letter-spacing: -0.01em;
    }

    .receipt-address, .receipt-hotline {
      font-size: 0.725rem;
      color: #64748b;
    }

    .receipt-divider {
      overflow: hidden;
      white-space: nowrap;
      margin: 0.4rem 0;
      color: #94a3b8;
    }

    .receipt-title {
      font-weight: 700;
      font-size: 0.875rem;
      letter-spacing: 0.05em;
    }

    .receipt-ticket-number {
      text-align: center;
      margin: 0.85rem 0;
      padding: 0.5rem 0;
      border-top: 1px dashed #cbd5e1;
      border-bottom: 1px dashed #cbd5e1;
    }

    .number-label {
      display: block;
      font-size: 0.775rem;
      color: #64748b;
      font-weight: 600;
    }

    .number-big {
      display: block;
      font-size: 2.2rem;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.03em;
    }

    .receipt-emergency-banner {
      background: #000;
      color: #fff;
      text-align: center;
      font-weight: 900;
      padding: 0.25rem 0;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
    }

    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
      font-size: 0.825rem;
    }

    .r-label {
      color: #64748b;
      min-width: 90px;
    }

    .r-val {
      text-align: right;
      color: #0f172a;
    }

    .receipt-footer {
      text-align: center;
      margin-top: 0.85rem;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.75rem;
    }

    .receipt-note {
      font-size: 0.725rem;
      color: #64748b;
      line-height: 1.35;
      margin-bottom: 0.5rem;
    }

    .receipt-code {
      font-size: 0.775rem;
      margin-bottom: 0.4rem;
    }

    .receipt-thanks {
      font-weight: 700;
      font-size: 0.75rem;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      #thermal-receipt-element, #thermal-receipt-element * {
        visibility: visible;
      }
      #thermal-receipt-element {
        position: absolute;
        left: 0;
        top: 0;
        width: 80mm;
        box-shadow: none;
        padding: 0;
        margin: 0;
      }
    }
  `]
})
export class CheckInComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);
  readonly authService = inject(AuthService);

  readonly rooms = signal<ExaminationRoom[]>([]);
  readonly recentTickets = signal<QueueTicket[]>([]);
  readonly lookupResults = signal<PatientLookup[]>([]);
  readonly selectedPatient = signal<PatientLookup | null>(null);

  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly submitting = signal(false);
  readonly recentLoading = signal(false);

  readonly showPrintModal = signal(false);
  readonly printedTicket = signal<QueueTicket | null>(null);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  searchKeyword: string = '';
  private searchDebounceTimer: any = null;
  private pollingTimer: any = null;

  readonly todayString = new Date().toISOString().split('T')[0];

  form: CheckInRequest = {
    patientName: '',
    patientPhone: '',
    patientDob: '',
    patientYearOfBirth: undefined,
    examinationRoomId: 1,
    isEmergency: false,
    notes: '',
    patientId: undefined
  };

  calculatedAge = signal<number | null>(null);
  isPriorityElderly = computed(() => (this.calculatedAge() ?? 0) >= 70);
  isPriorityChild = computed(() => (this.calculatedAge() !== null && (this.calculatedAge() ?? 99) <= 6));

  // Map room id to waiting count for room card indicator
  roomWaitingCounts = signal<Record<number, number>>({});

  ngOnInit(): void {
    this.loadRooms();
    this.loadRecentTickets();
    this.loadDisplayBoardCounts();

    // Poll recent tickets and room loads every 6s
    this.pollingTimer = setInterval(() => {
      this.loadRecentTickets(false);
      this.loadDisplayBoardCounts();
    }, 6000);
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) clearInterval(this.pollingTimer);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
  }

  loadRooms(): void {
    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.rooms.set(res.data);
          if (!this.form.examinationRoomId) {
            this.form.examinationRoomId = res.data[0].id;
          }
        }
      }
    });
  }

  loadRecentTickets(showLoading = true): void {
    if (showLoading) this.recentLoading.set(true);
    this.queueService.getRecentTicketsToday().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.recentTickets.set(res.data);
        }
        if (showLoading) this.recentLoading.set(false);
      },
      error: () => {
        if (showLoading) this.recentLoading.set(false);
      }
    });
  }

  loadDisplayBoardCounts(): void {
    this.queueService.getDisplayBoard().subscribe({
      next: res => {
        if (res.success && res.data) {
          const counts: Record<number, number> = {};
          for (const item of res.data) {
            counts[item.roomId] = item.waitingCount;
          }
          this.roomWaitingCounts.set(counts);
        }
      }
    });
  }

  getRoomWaitingCount(roomId: number): number {
    return this.roomWaitingCounts()[roomId] || 0;
  }

  onSearchInput(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    const kw = this.searchKeyword.trim();
    if (!kw) {
      this.lookupResults.set([]);
      this.hasSearched.set(false);
      return;
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.executePatientLookup();
    }, 400);
  }

  executePatientLookup(): void {
    const kw = this.searchKeyword.trim();
    if (!kw) return;
    this.isSearching.set(true);
    this.hasSearched.set(true);

    this.queueService.lookupPatient(kw).subscribe({
      next: res => {
        this.lookupResults.set(res.data || []);
        this.isSearching.set(false);
      },
      error: () => {
        this.lookupResults.set([]);
        this.isSearching.set(false);
      }
    });
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.lookupResults.set([]);
    this.hasSearched.set(false);
  }

  selectPatient(p: PatientLookup): void {
    this.selectedPatient.set(p);
    this.form.patientId = p.id;
    this.form.patientName = p.fullName;
    this.form.patientPhone = p.phoneNumber || '';
    if (p.dateOfBirth) {
      this.form.patientDob = p.dateOfBirth;
      this.onDobChange();
    }
    this.lookupResults.set([]);
    this.searchKeyword = p.fullName;
    this.showAlert(`Đã điền thông tin bệnh nhân: ${p.fullName}`, 'success');
  }

  resetFormToNew(): void {
    this.selectedPatient.set(null);
    this.clearSearch();
    this.form = {
      patientName: '',
      patientPhone: '',
      patientDob: '',
      patientYearOfBirth: undefined,
      examinationRoomId: this.rooms().length > 0 ? this.rooms()[0].id : 1,
      isEmergency: false,
      notes: '',
      patientId: undefined
    };
    this.calculatedAge.set(null);
  }

  selectRoom(roomId: number): void {
    this.form.examinationRoomId = roomId;
  }

  onDobChange(): void {
    if (!this.form.patientDob) {
      this.calculatedAge.set(null);
      this.form.patientYearOfBirth = undefined;
      return;
    }
    const dob = new Date(this.form.patientDob);
    const today = new Date();
    if (isNaN(dob.getTime()) || dob > today) {
      this.calculatedAge.set(null);
      return;
    }
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    this.calculatedAge.set(age);
    this.form.patientYearOfBirth = dob.getFullYear();
  }

  isFormValid(): boolean {
    return !!(
      this.form.patientName?.trim() &&
      this.form.patientPhone?.trim() &&
      this.form.patientDob &&
      this.form.examinationRoomId
    );
  }

  submitCheckIn(): void {
    if (!this.form.patientName?.trim()) {
      this.showAlert('Vui lòng nhập họ và tên bệnh nhân!', 'danger');
      return;
    }

    if (!this.form.patientPhone?.trim()) {
      this.showAlert('Vui lòng nhập số điện thoại bệnh nhân!', 'danger');
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(this.form.patientPhone.trim())) {
      this.showAlert('Số điện thoại không hợp lệ (cần 10 chữ số, VD: 0912345678)!', 'danger');
      return;
    }

    if (!this.form.patientDob) {
      this.showAlert('Vui lòng chọn ngày tháng năm sinh của bệnh nhân!', 'danger');
      return;
    }

    const dob = new Date(this.form.patientDob);
    const today = new Date();
    if (isNaN(dob.getTime()) || dob > today) {
      this.showAlert('Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại!', 'danger');
      return;
    }
    this.form.patientYearOfBirth = dob.getFullYear();

    if (!this.form.examinationRoomId) {
      this.showAlert('Vui lòng chọn phòng khám tiếp nhận!', 'danger');
      return;
    }

    this.submitting.set(true);
    this.queueService.checkIn(this.form).subscribe({
      next: res => {
        const ticket = res.data;
        this.submitting.set(false);
        this.showAlert(`Đã cấp thành công số thứ tự ${ticket?.ticketNumber} cho bệnh nhân ${ticket?.patientName}!`, 'success');

        // Show thermal receipt modal
        if (ticket) {
          this.printedTicket.set(ticket);
          this.showPrintModal.set(true);
        }

        // Reset form for next patient
        this.resetFormToNew();

        // Refresh recent tickets
        this.loadRecentTickets(false);
        this.loadDisplayBoardCounts();
      },
      error: err => {
        this.submitting.set(false);
        this.showAlert(err.error?.message || 'Lỗi khi cấp số thứ tự khám bệnh', 'danger');
      }
    });
  }

  openThermalPrintModal(ticket: QueueTicket): void {
    this.printedTicket.set(ticket);
    this.showPrintModal.set(true);
  }

  closePrintModal(): void {
    this.showPrintModal.set(false);
  }

  triggerBrowserPrint(): void {
    window.print();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'WAITING': return 'status-waiting';
      case 'CALLED': return 'status-called';
      case 'IN_PROGRESS': return 'status-progress';
      case 'COMPLETED': return 'status-completed';
      case 'SKIPPED': return 'status-skipped';
      case 'CANCELLED': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'WAITING': return 'Đang chờ';
      case 'CALLED': return 'Đang gọi';
      case 'IN_PROGRESS': return 'Đang khám';
      case 'COMPLETED': return 'Hoàn tất';
      case 'SKIPPED': return 'Nhỡ lượt';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
