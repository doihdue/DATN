import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { CheckInRequest, QueueTicket, PatientLookup } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';
import { toIsoDate } from '../../utils/date.utils';

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Tiếp đón &amp; cấp số</h1>
          <p class="page-subtitle">{{ recentTickets().length }} phiếu đã cấp hôm nay</p>
        </div>
        <div class="page-actions">
          <a routerLink="/staff/queue" class="btn btn-secondary">Điều phối hàng đợi</a>
          <a routerLink="/queue" target="_blank" class="btn btn-secondary">
            <i class="bi bi-box-arrow-up-right"></i> Màn hình sảnh chờ
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
        <!-- Cột trái: tiếp đón -->
        <div class="reception-form-section">
          <!-- Tra cứu hồ sơ -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Tra cứu hồ sơ bệnh nhân</h2>
              @if (selectedPatient()) {
                <button class="btn btn-sm btn-secondary" (click)="resetFormToNew()">Tiếp đón người mới</button>
              }
            </div>
            <div class="panel-body">
              <div class="search-input-group">
                <div class="search-field">
                  <i class="bi bi-search search-icon"></i>
                  <input
                    type="text"
                    [(ngModel)]="searchKeyword"
                    (input)="onSearchInput()"
                    (keyup.enter)="executePatientLookup()"
                    placeholder="Số điện thoại, họ tên hoặc CCCD"
                    class="form-control search-input"
                  />
                  @if (searchKeyword) {
                    <button class="clear-btn" (click)="clearSearch()" title="Xoá từ khoá" aria-label="Xoá từ khoá">
                      <i class="bi bi-x-lg"></i>
                    </button>
                  }
                </div>
                <button
                  class="btn btn-secondary search-btn"
                  [disabled]="isSearching() || !searchKeyword.trim()"
                  (click)="executePatientLookup()"
                >
                  @if (isSearching()) {
                    <span class="spinner-sm"></span> Đang tìm...
                  } @else {
                    Tìm kiếm
                  }
                </button>
              </div>

              @if (lookupResults().length > 0) {
                <div class="lookup-results-list">
                  <div class="results-title">{{ lookupResults().length }} hồ sơ phù hợp</div>
                  @for (p of lookupResults(); track p.id) {
                    <div class="lookup-item" (click)="selectPatient(p)">
                      <div class="lookup-item-main">
                        <span class="lookup-name">{{ p.fullName }}</span>
                        @if (p.gender) {
                          <span class="lookup-meta">{{ p.gender }}</span>
                        }
                        @if (p.dateOfBirth) {
                          <span class="lookup-meta mono">{{ p.dateOfBirth | date:'dd/MM/yyyy' }}</span>
                        }
                      </div>
                      <div class="lookup-item-sub">
                        <span class="mono">{{ p.phoneNumber || 'Chưa có SĐT' }}</span>
                        @if (p.nationalId) {
                          <span class="mono">CCCD {{ p.nationalId }}</span>
                        }
                        @if (p.address) {
                          <span>{{ p.address }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else if (hasSearched() && !isSearching()) {
                <div class="search-empty-hint">
                  Không tìm thấy hồ sơ. Nhập thông tin bên dưới để tiếp đón bệnh nhân mới.
                </div>
              }

              @if (selectedPatient()) {
                <div class="selected-patient-banner">
                  <div class="banner-content">
                    <div class="banner-title">
                      <strong>{{ selectedPatient()?.fullName }}</strong>
                      <span class="mono text-muted">Mã HS {{ selectedPatient()?.id }}</span>
                    </div>
                    <div class="banner-details">
                      SĐT {{ selectedPatient()?.phoneNumber || '—' }} ·
                      Ngày sinh {{ selectedPatient()?.dateOfBirth ? (selectedPatient()?.dateOfBirth | date:'dd/MM/yyyy') : '—' }} ·
                      {{ selectedPatient()?.gender || '—' }}
                      @if (selectedPatient()?.allergies) {
                        <span class="allergy-text"> · Dị ứng: {{ selectedPatient()?.allergies }}</span>
                      }
                    </div>
                  </div>
                  <button class="icon-btn danger" (click)="resetFormToNew()" title="Bỏ chọn hồ sơ" aria-label="Bỏ chọn hồ sơ">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- Thông tin tiếp đón -->
          <div class="panel">
            <div class="panel-header">
              <h2 class="panel-title">Thông tin tiếp đón</h2>
            </div>
            <div class="panel-body">
              <form (ngSubmit)="submitCheckIn()" #f="ngForm">
                <div class="form-row">
                  <div class="form-group flex-2">
                    <label class="form-label required">Họ và tên</label>
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
                    <label class="form-label required">Giới tính</label>
                    <select [(ngModel)]="form.patientGender" name="patientGender" class="form-control" required>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
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
                    <label class="form-label required">Ngày sinh</label>
                    <input
                      type="date"
                      [(ngModel)]="form.patientDob"
                      name="patientDob"
                      (change)="onDobChange()"
                      [max]="todayString"
                      class="form-control"
                      required
                    />
                    <small class="form-hint">Dùng để tính tuổi và diện ưu tiên.</small>
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label">Tuổi / diện ưu tiên</label>
                    <div class="age-display-box">
                      @if (calculatedAge() !== null) {
                        <span class="age-val"><strong class="mono">{{ calculatedAge() }}</strong> tuổi</span>
                        @if (isPriorityElderly()) {
                          <span class="status warning">Người cao tuổi (≥70)</span>
                        } @else if (isPriorityChild()) {
                          <span class="status warning">Trẻ nhỏ (≤6)</span>
                        } @else {
                          <span class="status">Không ưu tiên</span>
                        }
                      } @else {
                        <span class="text-muted">Chưa nhập ngày sinh</span>
                      }
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label required">Phòng khám</label>
                  <select
                    [(ngModel)]="form.examinationRoomId"
                    name="examinationRoomId"
                    class="form-control"
                    required
                  >
                    @for (floor of availableFloors(); track floor) {
                      <optgroup [label]="'Tầng ' + floor">
                        @for (r of getRoomsByFloor(floor); track r.id) {
                          <option [ngValue]="r.id">
                            {{ r.roomNumber }} - {{ r.roomName }} (đang chờ {{ getRoomWaitingCount(r.id) }})
                          </option>
                        }
                      </optgroup>
                    }
                  </select>
                </div>

                <div class="emergency-toggle-card" [class.checked]="form.isEmergency">
                  <label class="toggle-container">
                    <input type="checkbox" [(ngModel)]="form.isEmergency" name="isEmergency" />
                    <span class="toggle-text">
                      <strong>Cấp cứu</strong>
                      <span class="toggle-sub">Ưu tiên số 1, đưa lên đầu hàng đợi của phòng.</span>
                    </span>
                  </label>
                </div>

                <div class="form-group">
                  <label class="form-label">Lý do khám / triệu chứng</label>
                  <textarea
                    [(ngModel)]="form.notes"
                    name="notes"
                    rows="2"
                    placeholder="Ví dụ: đau đầu 3 ngày, sốt 38 độ, ho khan"
                    class="form-control"
                  ></textarea>
                </div>

                <div class="form-action-bar">
                  <button type="button" class="btn btn-secondary" (click)="resetFormToNew()">Nhập lại</button>
                  <button
                    type="submit"
                    class="btn btn-primary submit-checkin-btn"
                    [disabled]="submitting() || !isFormValid()"
                  >
                    @if (submitting()) {
                      <span class="spinner-sm"></span> Đang cấp số...
                    } @else {
                      Cấp số &amp; in phiếu
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Cột phải: phiếu đã cấp -->
        <div class="recent-tickets-section">
          <div class="panel recent-panel">
            <div class="panel-header">
              <h2 class="panel-title">Phiếu đã cấp hôm nay</h2>
              <button class="icon-btn" (click)="loadRecentTickets()" title="Tải lại" aria-label="Tải lại">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
            @if (recentLoading()) {
              <div class="loading-state-sm">
                <div class="spinner-sm"></div>
                <span>Đang tải...</span>
              </div>
            } @else if (recentTickets().length === 0) {
              <div class="empty-state-card">
                <p>Chưa có phiếu nào được cấp hôm nay.</p>
              </div>
            } @else {
              <div class="recent-tickets-list">
                @for (t of recentTickets(); track t.id) {
                  <div class="recent-ticket-card" [class.emergency-card]="t.isEmergency">
                    <div class="recent-ticket-top">
                      <span class="ticket-badge mono">{{ t.ticketNumber }}</span>
                      @if (t.isEmergency) {
                        <span class="status danger">Cấp cứu</span>
                      }
                      <span class="status ticket-status-pill" [ngClass]="getStatusClass(t.status)">
                        {{ getStatusLabel(t.status) }}
                      </span>
                    </div>
                    <div class="recent-patient-info">
                      <div class="patient-name">{{ t.patientName }}</div>
                      <div class="patient-meta-row">
                        <span class="mono">{{ t.patientPhone }}</span>
                        <span class="mono">{{ t.checkInTime | slice:0:5 }}</span>
                      </div>
                      <div class="patient-room-info">{{ t.roomNumber }} - {{ t.roomName }}</div>
                    </div>
                    <div class="recent-ticket-actions">
                      <button class="icon-btn" (click)="openThermalPrintModal(t)" title="In lại phiếu" aria-label="In lại phiếu">
                        <i class="bi bi-printer"></i>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Phiếu in nhiệt -->
      @if (showPrintModal() && printedTicket()) {
        <div class="modal-backdrop" (click)="closePrintModal()">
          <div class="modal-dialog print-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Phiếu khám bệnh</h2>
              <button class="modal-close-btn" (click)="closePrintModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body print-modal-body">
              <div class="thermal-receipt" id="thermal-receipt-element">
                <div class="receipt-header">
                  <div class="receipt-hospital-name">Phòng khám đa khoa MedQueue</div>
                  <div class="receipt-address">123 Đường Y Tế, Quận Đống Đa, Hà Nội</div>
                  <div class="receipt-hotline">Hotline: 1900 6868 · medqueue.vn</div>
                  <div class="receipt-divider">================================</div>
                  <div class="receipt-title">Phiếu đăng ký khám bệnh</div>
                </div>

                <div class="receipt-ticket-number">
                  <span class="number-label">Số thứ tự</span>
                  <span class="number-big mono">{{ printedTicket()?.ticketNumber }}</span>
                </div>

                @if (printedTicket()?.isEmergency) {
                  <div class="receipt-emergency-banner">Ưu tiên cấp cứu</div>
                }

                <div class="receipt-body">
                  <div class="receipt-row">
                    <span class="r-label">Người bệnh:</span>
                    <span class="r-val font-bold">{{ printedTicket()?.patientName }}</span>
                  </div>
                  <div class="receipt-row">
                    <span class="r-label">Giới tính:</span>
                    <span class="r-val">{{ printedTicket()?.patientGender || '---' }}</span>
                  </div>
                  <div class="receipt-row">
                    <span class="r-label">Ngày sinh:</span>
                    <span class="r-val">
                      {{ printedTicket()?.patientDob ? (printedTicket()?.patientDob | date:'dd/MM/yyyy') : (printedTicket()?.patientYearOfBirth || '---') }}
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
                    Vui lòng theo dõi bảng gọi số tại sảnh chờ.<br />
                    Xuất trình phiếu này tại phòng khám khi được gọi.
                  </div>
                  <div class="receipt-code">
                    Mã tra cứu: <strong>{{ printedTicket()?.ticketNumber }}</strong>
                  </div>
                  <div class="receipt-thanks">Cảm ơn quý khách</div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closePrintModal()">Đóng</button>
              <button class="btn btn-primary" (click)="triggerBrowserPrint()">In phiếu</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .main-layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 16px;
      align-items: start;
    }

    .reception-form-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Tra cứu */
    .search-input-group {
      display: flex;
      gap: 8px;
    }

    .search-field {
      position: relative;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-light);
      font-size: 14px;
    }

    .search-input {
      padding-left: 32px;
      padding-right: 32px;
    }

    .clear-btn {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-light);
      cursor: pointer;
      font-size: 12px;
    }

    .clear-btn:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .search-btn { min-width: 96px; }

    .lookup-results-list {
      margin-top: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      max-height: 280px;
      overflow-y: auto;
    }

    .results-title {
      padding: 8px 12px;
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-color);
    }

    .lookup-item {
      padding: 8px 12px;
      border-bottom: 1px solid var(--border-color);
      cursor: pointer;
      transition: background-color 0.12s ease;
    }

    .lookup-item:last-child { border-bottom: none; }
    .lookup-item:hover { background: var(--bg-hover); }

    .lookup-item-main {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }

    .lookup-name { font-weight: 500; color: var(--text-main); }

    .lookup-meta {
      font-size: 13px;
      color: var(--text-muted);
    }

    .lookup-item-sub {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .search-empty-hint {
      margin-top: 12px;
      padding: 8px 12px;
      font-size: 13px;
      color: var(--text-secondary);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
    }

    .selected-patient-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid var(--primary-200);
      background: var(--primary-50);
      border-radius: var(--radius-md);
    }

    .banner-content { flex: 1; min-width: 0; }

    .banner-title {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 14px;
    }

    .banner-title strong { font-weight: 600; }
    .banner-title .mono { font-size: 12px; }

    .banner-details {
      font-size: 13px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .allergy-text {
      color: var(--danger-text);
      font-weight: 500;
    }

    /* Form */
    .form-row {
      display: flex;
      gap: 16px;
    }

    .flex-1 { flex: 1; min-width: 0; }
    .flex-2 { flex: 2; min-width: 0; }

    .form-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .age-display-box {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 36px;
      padding: 0 10px;
      border: 1px solid var(--border-color);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
      font-size: 14px;
    }

    .age-val strong { font-weight: 600; }

    .emergency-toggle-card {
      margin-bottom: 1.15rem;
      padding: 10px 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .emergency-toggle-card.checked {
      border-color: var(--danger-border);
      background: var(--danger-bg);
    }

    .toggle-container {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
    }

    .toggle-container input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--danger-solid);
      cursor: pointer;
    }

    .toggle-text {
      display: flex;
      flex-direction: column;
      font-size: 14px;
    }

    .toggle-text strong { font-weight: 500; color: var(--text-main); }
    .emergency-toggle-card.checked .toggle-text strong { color: var(--danger-text); }

    .toggle-sub {
      font-size: 12px;
      color: var(--text-muted);
    }

    .form-action-bar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .submit-checkin-btn { min-width: 160px; }

    /* Phiếu đã cấp */
    .recent-panel {
      position: sticky;
      top: calc(var(--topbar-height) + 16px);
    }

    .recent-panel .panel-header { padding: 8px 8px 8px 16px; }

    .recent-tickets-list {
      max-height: calc(100vh - 220px);
      overflow-y: auto;
    }

    .recent-ticket-card {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-wrap: wrap;
      padding: 10px 8px 10px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .recent-ticket-card:last-child { border-bottom: none; }
    .recent-ticket-card.emergency-card { box-shadow: inset 3px 0 0 var(--danger-solid); }

    .recent-ticket-top {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
    }

    .ticket-badge {
      font-weight: 600;
      font-size: 14px;
      color: var(--text-main);
      margin-right: auto;
    }

    .recent-patient-info {
      flex: 1;
      min-width: 0;
      font-size: 13px;
    }

    .patient-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-main);
    }

    .patient-meta-row {
      display: flex;
      gap: 12px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .patient-room-info {
      color: var(--text-secondary);
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .recent-ticket-actions { align-self: flex-end; }

    /* Trạng thái phiếu (lớp từ getStatusClass) */
    .status.status-waiting { background: var(--warning-bg); color: var(--warning-text); }
    .status.status-called { background: var(--info-bg); color: var(--info-text); }
    .status.status-progress { background: var(--info-bg); color: var(--info-text); }
    .status.status-completed { background: var(--success-bg); color: var(--success-text); }
    .status.status-skipped,
    .status.status-cancelled { background: var(--bg-subtle); color: var(--text-muted); }

    .empty-state-card,
    .loading-state-sm {
      padding: 32px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    .loading-state-sm {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    /* Phiếu in nhiệt */
    .print-dialog { max-width: 420px; }

    .print-modal-body {
      background-color: var(--bg-subtle);
      padding: 20px;
      display: flex;
      justify-content: center;
    }

    .thermal-receipt {
      background: #ffffff;
      width: 100%;
      max-width: 320px;
      padding: 20px 18px;
      border: 1px solid var(--border-color);
      font-family: 'Courier New', Courier, monospace;
      color: #111111;
      font-size: 13px;
      line-height: 1.4;
      border-radius: var(--radius-sm);
    }

    .receipt-header {
      text-align: center;
      margin-bottom: 10px;
    }

    .receipt-hospital-name {
      font-weight: 700;
      font-size: 15px;
    }

    .receipt-address,
    .receipt-hotline {
      font-size: 11px;
      color: #555555;
    }

    .receipt-divider {
      overflow: hidden;
      white-space: nowrap;
      margin: 6px 0;
      color: #999999;
    }

    .receipt-title {
      font-weight: 700;
      font-size: 14px;
    }

    .receipt-ticket-number {
      text-align: center;
      margin: 12px 0;
      padding: 8px 0;
      border-top: 1px dashed #bbbbbb;
      border-bottom: 1px dashed #bbbbbb;
    }

    .number-label {
      display: block;
      font-size: 12px;
      color: #555555;
    }

    .number-big {
      display: block;
      font-size: 34px;
      font-weight: 700;
      color: #000000;
    }

    .receipt-emergency-banner {
      background: #000000;
      color: #ffffff;
      text-align: center;
      font-weight: 700;
      padding: 4px 0;
      margin-bottom: 10px;
    }

    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 13px;
    }

    .r-label {
      color: #555555;
      min-width: 90px;
    }

    .r-val {
      text-align: right;
      color: #000000;
    }

    .font-bold { font-weight: 700; }

    .receipt-footer {
      text-align: center;
      margin-top: 12px;
      border-top: 1px dashed #bbbbbb;
      padding-top: 10px;
    }

    .receipt-note {
      font-size: 11px;
      color: #555555;
      line-height: 1.35;
      margin-bottom: 8px;
    }

    .receipt-code {
      font-size: 12px;
      margin-bottom: 6px;
    }

    .receipt-thanks {
      font-weight: 700;
      font-size: 12px;
    }

    @media (max-width: 1100px) {
      .main-layout-grid { grid-template-columns: 1fr; }
      .recent-panel { position: static; }
      .recent-tickets-list { max-height: 420px; }
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .form-row { flex-direction: column; gap: 0; }
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
        border: none;
        box-shadow: none;
        padding: 0;
        margin: 0;
      }
    }
  `]})
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

  readonly todayString = toIsoDate(new Date());

  form: CheckInRequest = {
    patientName: '',
    patientPhone: '',
    patientDob: '',
    patientYearOfBirth: undefined,
    patientGender: 'Nam',
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

  readonly selectedFloorFilter = signal<number | null>(null);

  readonly availableFloors = computed(() => {
    const list = this.rooms().map(r => r.floor);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  });

  readonly filteredRooms = computed(() => {
    const f = this.selectedFloorFilter();
    if (f === null) return this.rooms();
    return this.rooms().filter(r => r.floor === f);
  });

  getRoomsByFloor(floor: number): ExaminationRoom[] {
    return this.rooms().filter(r => r.floor === floor);
  }

  getSelectedRoom(): ExaminationRoom | undefined {
    return this.rooms().find(r => r.id === this.form.examinationRoomId);
  }

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
    if (p.gender) {
      this.form.patientGender = p.gender;
    }
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
      patientGender: 'Nam',
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
