import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { CheckInRequest, QueueTicket, RoomQueueOverview } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-queue-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="queue-control-page">
      <!-- Top Control Header -->
      <div class="control-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="live-dot"></span> {{ isDoctor() ? 'Bàn Gọi Khám & Điều Phối Bác Sĩ' : 'Hệ Thống Điều Phối Tiếp Đón Khám Bệnh' }}
          </div>
          <h1 class="page-title">{{ isDoctor() ? 'Bàn Gọi Khám Phòng Khám' : 'Bàn Điều Phối & Tiếp Đón Hàng Đợi' }}</h1>
          <p class="page-subtitle">
            {{ isDoctor() ? 'Gọi số khám, mời bệnh nhân vào phòng và bắt đầu ca khám bệnh' : 'Tiếp nhận người bệnh, cấp số thứ tự vào phòng khám và điều phối ưu tiên' }}
          </p>
        </div>
        @if (!isDoctor()) {
          <div class="header-right">
            <button class="btn btn-primary" (click)="openCheckInModal()">
              <i class="bi bi-person-plus-fill"></i> Tiếp Đón &amp; Cấp Số Mới
            </button>
          </div>
        }
      </div>

      <!-- Room Selector Strip -->
      <div class="room-selector-bar">
        <span class="selector-label"><i class="bi bi-hospital"></i> Chọn Phòng Khám:</span>
        <div class="room-pills">
          @for (room of rooms(); track room.id) {
            <button
              class="room-pill-btn"
              [class.active]="selectedRoomId() === room.id"
              (click)="selectRoom(room.id)"
            >
              <span class="pill-number">{{ room.roomNumber }}</span>
              <span class="pill-name">{{ room.roomName }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Alerts (Top-Right Floating Toast) -->
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

      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Đang tải dữ liệu hàng đợi phòng khám...</p>
        </div>
      } @else if (overview()) {
        <!-- Main Console Layout -->
        <div class="console-grid">
          <!-- Left Column: Primary Calling & Examining Operations -->
          <div class="active-stage-card medical-card">
            <!-- Stage Header Info -->
            <div class="stage-header">
              <div class="doctor-badge">
                <i class="bi bi-person-badge-fill text-primary"></i>
                <span>Bác sĩ phụ trách: <strong>{{ overview()?.doctorName || 'Đang cập nhật' }}</strong></span>
                <span class="specialty-sub">({{ overview()?.specialtyName }})</span>
              </div>
              <div class="queue-quick-stats">
                <span class="stat-tag"><i class="bi bi-people-fill"></i> Đang chờ: <strong class="num">{{ overview()?.totalWaitingCount }}</strong></span>
                <span class="stat-tag"><i class="bi bi-clock-history"></i> Ước tính: <strong class="num">{{ overview()?.estimatedWaitMinutes }} phút</strong></span>
              </div>
            </div>

            <!-- Central Call Control -->
            <div class="call-action-box">
              <button
                class="btn-call-next"
                [disabled]="calling() || overview()!.waitingTickets.length === 0"
                (click)="callNext()"
              >
                <div class="call-btn-content">
                  <i class="bi bi-megaphone-fill call-icon"></i>
                  <div class="call-text">
                    <span class="call-title">GỌI SỐ TIẾP THEO</span>
                    <span class="call-subtitle">
                      @if (overview()!.waitingTickets.length > 0) {
                        Số kế tiếp: {{ overview()!.waitingTickets[0].ticketNumber }} — {{ overview()!.waitingTickets[0].patientName }}
                      } @else {
                        Hiện không có bệnh nhân nào trong hàng chờ
                      }
                    </span>
                  </div>
                </div>
              </button>
            </div>

            <!-- Current States Panels -->
            <div class="status-panels-row">
              <!-- Panel 1: Đang Được Gọi (CALLED) -->
              <div class="ticket-status-panel panel-called">
                <div class="panel-header">
                  <span class="panel-title"><i class="bi bi-bell-fill"></i> Đang Gọi Vào Phòng</span>
                  @if (overview()?.currentCalledTicket) {
                    <span class="badge badge-calling">Mời vào</span>
                  }
                </div>
                <div class="panel-body">
                  @if (overview()?.currentCalledTicket) {
                    <div class="ticket-highlight">
                      <div class="ticket-num num">{{ overview()!.currentCalledTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentCalledTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span>SĐT: {{ overview()!.currentCalledTicket!.patientPhone }}</span>
                        @if (overview()!.currentCalledTicket!.patientYearOfBirth) {
                          <span> • Năm sinh: {{ overview()!.currentCalledTicket!.patientYearOfBirth }}</span>
                        }
                      </div>
                      <div class="panel-actions">
                        <button class="btn btn-success btn-sm" (click)="startExam(overview()!.currentCalledTicket!.id)">
                          <i class="bi bi-play-circle-fill"></i> Vào Khám
                        </button>
                        <button class="btn btn-outline-danger btn-sm" (click)="skipTicket(overview()!.currentCalledTicket!.id)">
                          <i class="bi bi-skip-forward-fill"></i> Bỏ Qua (Vắng mặt)
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="panel-empty">
                      <i class="bi bi-bell-slash"></i>
                      <p>Chưa có số nào đang gọi</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Panel 2: Đang Khám (IN_PROGRESS) -->
              <div class="ticket-status-panel panel-examining">
                <div class="panel-header">
                  <span class="panel-title"><i class="bi bi-heart-pulse-fill"></i> Đang Khám Bệnh</span>
                  @if (overview()?.currentExaminingTicket) {
                    <span class="badge badge-examining">Đang khám</span>
                  }
                </div>
                <div class="panel-body">
                  @if (overview()?.currentExaminingTicket) {
                    <div class="ticket-highlight">
                      <div class="ticket-num text-success num">{{ overview()!.currentExaminingTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentExaminingTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span>Bắt đầu lúc: {{ overview()!.currentExaminingTicket!.startTime }}</span>
                      </div>
                      <div class="panel-actions">
                        @if (isDoctor()) {
                          <a [routerLink]="['/doctor/examination', overview()!.currentExaminingTicket!.id]" 
                             [state]="{ ticket: overview()!.currentExaminingTicket }"
                             (click)="onOpenExamination(overview()!.currentExaminingTicket!)" 
                             class="btn btn-primary btn-sm">
                            <i class="bi bi-file-earmark-medical-fill"></i> Bàn Khám &amp; Kê Đơn
                          </a>
                        }
                        <button class="btn btn-outline btn-sm" (click)="completeExam(overview()!.currentExaminingTicket!.id)">
                          <i class="bi bi-check-circle-fill text-success"></i> Xong Nhanh
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="panel-empty">
                      <i class="bi bi-door-open"></i>
                      <p>Phòng khám đang trống</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Queue Waiting & Skipped Lists -->
          <div class="queue-list-card medical-card">
            <!-- Tabs Bar -->
            <div class="queue-tabs">
              <button
                class="tab-btn"
                [class.active]="activeTab === 'WAITING'"
                (click)="activeTab = 'WAITING'"
              >
                <i class="bi bi-hourglass-split"></i> Đang Chờ
                <span class="tab-count num">{{ overview()?.waitingTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'SKIPPED'"
                (click)="activeTab = 'SKIPPED'"
              >
                <i class="bi bi-arrow-repeat"></i> Bị Nhỡ Lượt
                <span class="tab-count count-skipped num">{{ overview()?.skippedTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'COMPLETED'"
                (click)="activeTab = 'COMPLETED'"
              >
                <i class="bi bi-check2-all"></i> Đã Khám
                <span class="tab-count count-completed num">{{ overview()?.completedTickets?.length || 0 }}</span>
              </button>
            </div>

            <!-- Tab Content 1: WAITING -->
            @if (activeTab === 'WAITING') {
              <div class="tab-content-list">
                @if (overview()!.waitingTickets.length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-check-circle text-success"></i>
                    <p>Hiện không có bệnh nhân nào đang chờ</p>
                  </div>
                } @else {
                  @for (t of overview()!.waitingTickets; track t.id; let idx = $index) {
                    <div class="ticket-row-card" [class.emergency-row]="t.isEmergency">
                      <div class="row-order">
                        <span class="order-idx num">#{{ idx + 1 }}</span>
                        <span class="row-ticket-num num">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          @if (t.isEmergency) {
                            <span class="badge badge-emergency"><i class="bi bi-exclamation-octagon-fill"></i> CẤP CỨU</span>
                          }
                          @if (t.priorityScore >= 30 && !t.isEmergency) {
                            <span class="badge badge-priority"><i class="bi bi-star-fill"></i> Ưu tiên</span>
                          }
                          @if (t.hasAppointment) {
                            <span class="badge badge-booked"><i class="bi bi-calendar-check"></i> Đặt trước</span>
                          }
                        </div>
                        <div class="row-patient-meta">
                          <span>SĐT: {{ t.patientPhone }}</span>
                          <span>• Giờ lấy số: {{ t.checkInTime }}</span>
                          <span>• Điểm: <strong class="num">{{ t.priorityScore }}</strong></span>
                        </div>
                      </div>
                      <div class="row-actions">
                        @if (!t.isEmergency) {
                          <button class="btn btn-sm btn-outline-danger" (click)="setEmergency(t.id)" title="Gắn cờ ưu tiên cấp cứu">
                            <i class="bi bi-lightning-fill"></i> Khẩn cấp
                          </button>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Tab Content 2: SKIPPED -->
            @if (activeTab === 'SKIPPED') {
              <div class="tab-content-list">
                @if (overview()!.skippedTickets.length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-person-check text-muted"></i>
                    <p>Không có lượt khám nào bị nhỡ</p>
                  </div>
                } @else {
                  @for (t of overview()!.skippedTickets; track t.id) {
                    <div class="ticket-row-card skipped-row">
                      <div class="row-order">
                        <span class="row-ticket-num text-danger num">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          <span class="badge badge-skipped">Vắng mặt</span>
                        </div>
                        <div class="row-patient-meta">
                          <span>SĐT: {{ t.patientPhone }}</span>
                        </div>
                      </div>
                      <div class="row-actions">
                        <button class="btn btn-sm btn-outline" (click)="recallTicket(t.id)">
                          <i class="bi bi-arrow-counterclockwise"></i> Gọi lại
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Tab Content 3: COMPLETED -->
            @if (activeTab === 'COMPLETED') {
              <div class="tab-content-list">
                @if (overview()!.completedTickets.length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-clipboard-pulse text-muted"></i>
                    <p>Chưa có lượt khám nào hoàn thành hôm nay</p>
                  </div>
                } @else {
                  @for (t of overview()!.completedTickets; track t.id) {
                    <div class="ticket-row-card completed-row">
                      <div class="row-order">
                        <span class="row-ticket-num text-muted num">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                        </div>
                        <div class="row-patient-meta">
                          <span>Bắt đầu: {{ t.startTime }}</span>
                          <span> • Xong: {{ t.endTime }}</span>
                        </div>
                      </div>
                      <div class="row-status">
                        <span class="badge badge-success"><i class="bi bi-check2"></i> Đã hoàn tất</span>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal Tiếp Đón & Cấp Số Thứ Tự (Check-In) -->
      @if (showCheckInModal()) {
        <div class="modal-backdrop" (click)="closeCheckInModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-ticket-perforated-fill text-primary"></i> Tiếp Đón &amp; Cấp Số Khám
              </h2>
              <button class="modal-close-btn" (click)="closeCheckInModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label required">Họ và tên bệnh nhân</label>
                <input
                  type="text"
                  [(ngModel)]="checkInForm.patientName"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  class="form-control"
                  required
                />
              </div>

              <div class="form-row">
                <div class="form-group flex-1">
                  <label class="form-label required">Số điện thoại</label>
                  <input
                    type="tel"
                    [(ngModel)]="checkInForm.patientPhone"
                    placeholder="0912345678"
                    class="form-control"
                    required
                  />
                </div>
                <div class="form-group flex-1">
                  <label class="form-label">Năm sinh</label>
                  <input
                    type="number"
                    [(ngModel)]="checkInForm.patientYearOfBirth"
                    placeholder="1990"
                    min="1920"
                    max="2026"
                    class="form-control"
                  />
                  <small class="form-hint">Dùng để ưu tiên tự động cho người già &amp; trẻ nhỏ</small>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Phòng khám tiếp nhận</label>
                <select [(ngModel)]="checkInForm.examinationRoomId" class="form-control" required>
                  @for (room of rooms(); track room.id) {
                    <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }} (Tầng {{ room.floor }})</option>
                  }
                </select>
              </div>

              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="checkInForm.isEmergency" />
                  <span class="checkbox-text text-danger font-bold">
                    <i class="bi bi-exclamation-triangle-fill"></i> Trường hợp khẩn cấp / Cấp cứu (Ưu tiên gọi đầu tiên)
                  </span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label">Ghi chú triệu chứng ban đầu</label>
                <textarea
                  [(ngModel)]="checkInForm.notes"
                  rows="2"
                  placeholder="Ví dụ: Đau đầu, sốt nhẹ, đau tức ngực..."
                  class="form-control"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeCheckInModal()">Hủy</button>
              <button
                class="btn btn-primary"
                [disabled]="submittingCheckIn() || !isCheckInValid()"
                (click)="submitCheckIn()"
              >
                @if (submittingCheckIn()) {
                  <span class="spinner-sm"></span> Đang tạo số...
                } @else {
                  <i class="bi bi-printer"></i> In Phiếu &amp; Cấp Số
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .queue-control-page {
      padding: 1.5rem 1.5rem 3.5rem;
      max-width: 1360px;
      margin: 0 auto;
    }

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.2rem 0.65rem;
      background-color: var(--primary-50);
      color: var(--primary-800);
      font-size: 0.775rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.35rem;
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

    /* Room Selector Bar */
    .room-selector-bar {
      background-color: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
      box-shadow: var(--shadow-xs);
      flex-wrap: wrap;
    }

    .selector-label {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
    }

    .room-pills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .room-pill-btn {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      background-color: var(--bg-subtle);
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.15s ease;
      color: var(--text-secondary);
    }

    .room-pill-btn:hover {
      background-color: var(--primary-50);
      border-color: var(--primary-300);
      color: var(--primary-800);
    }

    .room-pill-btn.active {
      background-color: var(--primary-600);
      color: #ffffff;
      border-color: var(--primary-600);
      box-shadow: 0 1px 3px rgba(2, 132, 199, 0.3);
    }

    .pill-number {
      font-family: monospace;
      font-weight: 800;
      font-size: 0.9rem;
    }

    .pill-name {
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* Console Grid */
    .console-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 1024px) {
      .console-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Active Stage Card */
    .active-stage-card {
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .doctor-badge {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--text-main);
      font-size: 0.925rem;
    }

    .specialty-sub {
      color: var(--text-muted);
      font-size: 0.825rem;
    }

    .queue-quick-stats {
      display: flex;
      gap: 0.5rem;
    }

    .stat-tag {
      background-color: var(--bg-subtle);
      border: 1px solid var(--border-color);
      padding: 0.3rem 0.6rem;
      border-radius: var(--radius-xs);
      font-size: 0.775rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .stat-tag strong {
      color: var(--text-main);
    }

    /* Call Button */
    .call-action-box {
      width: 100%;
    }

    .btn-call-next {
      width: 100%;
      background-color: var(--primary-600);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      padding: 1.15rem 1.5rem;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);
      transition: all 0.15s ease;
    }

    .btn-call-next:hover:not(:disabled) {
      background-color: var(--primary-700);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }

    .btn-call-next:disabled {
      background-color: #cbd5e1;
      color: #64748b;
      cursor: not-allowed;
      box-shadow: none;
    }

    .call-btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
    }

    .call-icon {
      font-size: 2rem;
    }

    .call-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .call-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .call-subtitle {
      font-size: 0.85rem;
      opacity: 0.95;
    }

    /* Panels Row */
    .status-panels-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .status-panels-row {
        grid-template-columns: 1fr;
      }
    }

    .ticket-status-panel {
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
    }

    .panel-called {
      background-color: #f0f9ff;
      border-color: #bae6fd;
    }

    .panel-examining {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }

    .panel-header {
      padding: 0.65rem 0.95rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .panel-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .panel-body {
      padding: 1.15rem 0.95rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .ticket-highlight {
      text-align: center;
    }

    .ticket-num {
      font-size: 2.15rem;
      font-weight: 900;
      color: var(--primary-800);
      letter-spacing: 0.02em;
      line-height: 1;
      margin-bottom: 0.35rem;
    }

    .patient-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.2rem;
    }

    .patient-info-sub {
      font-size: 0.785rem;
      color: var(--text-muted);
      margin-bottom: 0.85rem;
    }

    .panel-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .panel-empty {
      text-align: center;
      color: var(--text-muted);
      padding: 1.25rem 0;
    }

    .panel-empty i {
      font-size: 1.85rem;
      margin-bottom: 0.35rem;
      display: block;
      color: var(--text-light);
    }

    .panel-empty p {
      margin: 0;
      font-size: 0.825rem;
    }

    /* Right Column: Queue List Card */
    .queue-list-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      max-height: 650px;
    }

    .queue-tabs {
      display: flex;
      background-color: var(--bg-main);
      border-bottom: 1px solid var(--border-color);
      padding: 0.35rem 0.5rem 0;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 0.65rem 0.5rem;
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      border-bottom: 2px solid transparent;
      transition: all 0.15s ease;
    }

    .tab-btn.active {
      color: var(--primary-700);
      font-weight: 700;
      border-bottom-color: var(--primary-600);
      background-color: #ffffff;
      border-radius: var(--radius-sm) var(--radius-sm) 0 0;
    }

    .tab-count {
      background-color: #e2e8f0;
      color: var(--text-main);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      font-size: 0.725rem;
      font-weight: 700;
    }

    .count-skipped { background-color: var(--danger-bg); color: var(--danger-solid); }
    .count-completed { background-color: var(--success-bg); color: var(--success-solid); }

    .tab-content-list {
      padding: 0.85rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ticket-row-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      background-color: var(--bg-main);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      transition: all 0.15s ease;
    }

    .ticket-row-card:hover {
      background-color: #ffffff;
      border-color: #cbd5e1;
      box-shadow: var(--shadow-xs);
    }

    .emergency-row {
      background-color: #fff1f2;
      border-color: #fecdd3;
    }

    .skipped-row {
      background-color: #fffbeb;
      border-color: #fde68a;
    }

    .row-order {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .order-idx {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      width: 22px;
    }

    .row-ticket-num {
      font-family: monospace;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--primary-700);
    }

    .row-patient-details {
      flex: 1;
    }

    .row-patient-name {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.9rem;
      color: var(--text-main);
      flex-wrap: wrap;
    }

    .row-patient-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
      display: flex;
      gap: 0.35rem;
    }

    .badge-emergency {
      background-color: var(--danger-solid);
      color: #ffffff;
      font-size: 0.675rem;
      font-weight: 800;
      padding: 0.15rem 0.35rem;
      border-radius: 3px;
    }

    .badge-priority {
      background-color: #fef08a;
      color: #854d0e;
      font-size: 0.675rem;
      padding: 0.15rem 0.35rem;
      border-radius: 3px;
    }

    .badge-booked {
      background-color: var(--primary-100);
      color: var(--primary-800);
      font-size: 0.675rem;
      padding: 0.15rem 0.35rem;
      border-radius: 3px;
    }

    .badge-skipped {
      background-color: var(--danger-bg);
      color: var(--danger-solid);
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 3px;
    }

    .empty-list-state {
      text-align: center;
      padding: 2.5rem 1rem;
      color: var(--text-muted);
    }

    .empty-list-state i {
      font-size: 2.2rem;
      margin-bottom: 0.4rem;
      display: block;
    }

    .checkbox-group {
      margin-bottom: 1rem;
      padding: 0.65rem 0.85rem;
      background-color: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: var(--radius-sm);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .font-bold { font-weight: 700; }
    .text-danger { color: var(--danger-solid); }
    .text-success { color: var(--success-solid); }
    .text-primary { color: var(--primary-600); }

    .form-row { display: flex; gap: 0.85rem; margin-bottom: 0.85rem; }
    .flex-1 { flex: 1; }
  `]
})
export class QueueControlComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);
  readonly authService = inject(AuthService);

  readonly isDoctor = computed(() => this.authService.hasRole('DOCTOR'));
  readonly isStaff = computed(() => this.authService.hasRole('STAFF'));

  readonly rooms = signal<ExaminationRoom[]>([]);
  readonly selectedRoomId = signal<number>(1);
  readonly overview = signal<RoomQueueOverview | null>(null);

  readonly loading = signal(true);
  readonly calling = signal(false);
  readonly submittingCheckIn = signal(false);
  readonly showCheckInModal = signal(false);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  activeTab: 'WAITING' | 'SKIPPED' | 'COMPLETED' = 'WAITING';
  private pollingTimer: any = null;

  checkInForm: CheckInRequest = {
    patientName: '',
    patientPhone: '',
    patientYearOfBirth: undefined,
    examinationRoomId: 1,
    isEmergency: false,
    notes: ''
  };

  ngOnInit(): void {
    this.loadRooms();
    this.pollingTimer = setInterval(() => {
      if (this.selectedRoomId()) {
        this.fetchOverview(false);
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }

  loadRooms(): void {
    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.rooms.set(res.data);
          this.selectedRoomId.set(res.data[0].id);
          this.checkInForm.examinationRoomId = res.data[0].id;
          this.fetchOverview(true);
        }
      }
    });
  }

  selectRoom(roomId: number): void {
    this.selectedRoomId.set(roomId);
    this.checkInForm.examinationRoomId = roomId;
    this.fetchOverview(true);
  }

  fetchOverview(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.queueService.getRoomQueue(this.selectedRoomId()).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.overview.set(res.data);
        }
        if (showLoading) this.loading.set(false);
      },
      error: err => {
        if (showLoading) {
          this.showAlert(err.error?.message || 'Không thể tải hàng đợi phòng', 'danger');
          this.loading.set(false);
        }
      }
    });
  }

  callNext(): void {
    this.calling.set(true);
    this.queueService.callNext(this.selectedRoomId()).subscribe({
      next: res => {
        this.showAlert(`Đã gọi số: ${res.data?.ticketNumber} (${res.data?.patientName})`, 'success');
        this.calling.set(false);
        this.fetchOverview(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể gọi số tiếp theo', 'danger');
        this.calling.set(false);
      }
    });
  }

  startExam(ticketId: number): void {
    this.queueService.startExamination(ticketId).subscribe({
      next: () => {
        this.showAlert('Bệnh nhân đã vào phòng khám!', 'success');
        this.fetchOverview(false);
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi bắt đầu khám', 'danger')
    });
  }

  onOpenExamination(ticket: QueueTicket): void {
    try {
      sessionStorage.setItem('currentExaminingTicket', JSON.stringify(ticket));
    } catch {}
  }

  completeExam(ticketId: number): void {
    this.queueService.completeExamination(ticketId).subscribe({
      next: () => {
        this.showAlert('Đã hoàn thành lượt khám bệnh!', 'success');
        this.fetchOverview(false);
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi hoàn thành khám', 'danger')
    });
  }

  skipTicket(ticketId: number): void {
    this.queueService.skipTicket(ticketId).subscribe({
      next: () => {
        this.showAlert('Đã chuyển số vào danh sách nhỡ lượt (vắng mặt)!', 'success');
        this.fetchOverview(false);
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi bỏ qua lượt', 'danger')
    });
  }

  recallTicket(ticketId: number): void {
    this.queueService.recallTicket(ticketId).subscribe({
      next: res => {
        this.showAlert(`Đã gọi lại số nhỡ: ${res.data?.ticketNumber}`, 'success');
        this.fetchOverview(false);
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi gọi lại số', 'danger')
    });
  }

  setEmergency(ticketId: number): void {
    if (confirm('Xác nhận kích hoạt mức Ưu tiên cấp cứu cho bệnh nhân này?')) {
      this.queueService.setEmergency(ticketId).subscribe({
        next: () => {
          this.showAlert('Đã nâng mức ưu tiên khẩn cấp!', 'success');
          this.fetchOverview(false);
        },
        error: err => this.showAlert(err.error?.message || 'Lỗi khi đặt ưu tiên', 'danger')
      });
    }
  }

  openCheckInModal(): void {
    this.checkInForm = {
      patientName: '',
      patientPhone: '',
      patientYearOfBirth: undefined,
      examinationRoomId: this.selectedRoomId(),
      isEmergency: false,
      notes: ''
    };
    this.showCheckInModal.set(true);
  }

  closeCheckInModal(): void {
    this.showCheckInModal.set(false);
  }

  isCheckInValid(): boolean {
    return !!(this.checkInForm.patientName?.trim() && this.checkInForm.patientPhone?.trim() && this.checkInForm.examinationRoomId);
  }

  submitCheckIn(): void {
    if (!this.checkInForm.patientName?.trim()) {
      this.showAlert('Vui lòng nhập họ và tên người bệnh!', 'danger');
      return;
    }

    if (!this.checkInForm.patientPhone?.trim()) {
      this.showAlert('Vui lòng nhập số điện thoại người bệnh!', 'danger');
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(this.checkInForm.patientPhone.trim())) {
      this.showAlert('Số điện thoại không hợp lệ (cần 10 chữ số, VD: 0912345678)!', 'danger');
      return;
    }

    if (!this.checkInForm.examinationRoomId) {
      this.showAlert('Vui lòng chọn phòng khám tiếp nhận!', 'danger');
      return;
    }

    if (this.checkInForm.patientYearOfBirth) {
      const currentYear = new Date().getFullYear();
      if (this.checkInForm.patientYearOfBirth < 1900 || this.checkInForm.patientYearOfBirth > currentYear) {
        this.showAlert(`Năm sinh không hợp lệ (từ 1900 đến ${currentYear})!`, 'danger');
        return;
      }
    }

    this.submittingCheckIn.set(true);
    this.queueService.checkIn(this.checkInForm).subscribe({
      next: res => {
        this.showAlert(`Đã cấp số ${res.data?.ticketNumber} cho bệnh nhân ${res.data?.patientName}`, 'success');
        this.submittingCheckIn.set(false);
        this.closeCheckInModal();
        this.fetchOverview(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Lỗi khi cấp số thứ tự', 'danger');
        this.submittingCheckIn.set(false);
      }
    });
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
