import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { CheckInRequest, QueueTicket, RoomQueueOverview } from '../../models/queue.model';
import { ExaminationRoom } from '../../models/schedule.model';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-queue-control',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="queue-control-page">
      <!-- Top Bar -->
      <div class="control-header">
        <div class="header-left">
          <div class="header-badge">
            <span class="live-pulse"></span> Điều Phối Hàng Đợi Thời Gian Thực
          </div>
          <h1 class="page-title">Bàn Điều Phối & Tiếp Đón Khám Bệnh</h1>
          <p class="page-subtitle">
            Gọi số, chuyển phòng, điều phối lượt khám và phân luồng bệnh nhân ưu tiên
          </p>
        </div>
        <div class="header-right">
          <button class="btn btn-primary" (click)="openCheckInModal()">
            <i class="bi bi-person-plus-fill"></i> Tiếp Đón & Cấp Số Mới
          </button>
        </div>
      </div>

      <!-- Room Selector Bar -->
      <div class="room-selector-bar">
        <label class="selector-label"><i class="bi bi-hospital"></i> Chọn Phòng Khám Điều Phối:</label>
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

      <!-- Feedback Alerts -->
      @if (alertMessage()) {
        <div class="alert" [ngClass]="alertType() === 'success' ? 'alert-success' : 'alert-danger'">
          <i class="bi" [ngClass]="alertType() === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
          <span>{{ alertMessage() }}</span>
          <button type="button" class="alert-close" (click)="alertMessage.set(null)">×</button>
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
          <!-- Left Column: Active Call / Examining Stage -->
          <div class="active-stage-card">
            <div class="stage-header">
              <div class="doctor-badge">
                <i class="bi bi-person-badge"></i>
                <span>Bác sĩ phụ trách: <strong>{{ overview()?.doctorName || 'Đang cập nhật' }}</strong></span>
                <span class="specialty-sub">({{ overview()?.specialtyName }})</span>
              </div>
              <div class="queue-quick-stats">
                <span class="stat-tag"><i class="bi bi-people-fill"></i> Đang chờ: <strong>{{ overview()?.totalWaitingCount }}</strong></span>
                <span class="stat-tag"><i class="bi bi-clock-history"></i> Ước tính: <strong>{{ overview()?.estimatedWaitMinutes }} phút</strong></span>
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
                        Số kế tiếp: {{ overview()!.waitingTickets[0].ticketNumber }} ({{ overview()!.waitingTickets[0].patientName }})
                      } @else {
                        Không có bệnh nhân chờ
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
                      <div class="ticket-num">{{ overview()!.currentCalledTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentCalledTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span>SĐT: {{ overview()!.currentCalledTicket!.patientPhone }}</span>
                        @if (overview()!.currentCalledTicket!.patientYearOfBirth) {
                          <span>• Năm sinh: {{ overview()!.currentCalledTicket!.patientYearOfBirth }}</span>
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
                      <div class="ticket-num text-success">{{ overview()!.currentExaminingTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentExaminingTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span>Bắt đầu lúc: {{ overview()!.currentExaminingTicket!.startTime }}</span>
                      </div>
                      <div class="panel-actions">
                        <a [routerLink]="['/doctor/examination', overview()!.currentExaminingTicket!.id]" class="btn btn-warning btn-sm" style="font-weight: 700;">
                          <i class="bi bi-file-earmark-medical-fill"></i> Mở Bàn Khám & Kê Đơn
                        </a>
                        <button class="btn btn-outline-primary btn-sm" (click)="completeExam(overview()!.currentExaminingTicket!.id)">
                          <i class="bi bi-check-circle-fill"></i> Khám Xong (Nhanh)
                        </button>
                      </div>
                    </div>
                  } @else {
                    <div class="panel-empty">
                      <i class="bi bi-person-dash"></i>
                      <p>Phòng đang trống</p>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Queue Waiting & Skipped Lists -->
          <div class="queue-list-card">
            <!-- Tabs -->
            <div class="queue-tabs">
              <button
                class="tab-btn"
                [class.active]="activeTab === 'WAITING'"
                (click)="activeTab = 'WAITING'"
              >
                <i class="bi bi-hourglass-split"></i> Đang Chờ
                <span class="tab-count">{{ overview()?.waitingTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'SKIPPED'"
                (click)="activeTab = 'SKIPPED'"
              >
                <i class="bi bi-arrow-repeat"></i> Bị Nhỡ Lượt
                <span class="tab-count count-skipped">{{ overview()?.skippedTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'COMPLETED'"
                (click)="activeTab = 'COMPLETED'"
              >
                <i class="bi bi-check2-all"></i> Đã Khám
                <span class="tab-count count-completed">{{ overview()?.completedTickets?.length || 0 }}</span>
              </button>
            </div>

            <!-- Tab Content 1: WAITING -->
            @if (activeTab === 'WAITING') {
              <div class="tab-content-list">
                @if (overview()!.waitingTickets.length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-check-circle text-success"></i>
                    <p>Hiện không có bệnh nhân nào đang chờ!</p>
                  </div>
                } @else {
                  @for (t of overview()!.waitingTickets; track t.id; let idx = $index) {
                    <div class="ticket-row-card" [class.emergency-row]="t.isEmergency">
                      <div class="row-order">
                        <span class="order-idx">#{{ idx + 1 }}</span>
                        <span class="row-ticket-num">{{ t.ticketNumber }}</span>
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
                          <span>• Điểm: <strong>{{ t.priorityScore }}</strong></span>
                        </div>
                      </div>
                      <div class="row-actions">
                        @if (!t.isEmergency) {
                          <button class="btn btn-sm btn-outline-danger" (click)="setEmergency(t.id)" title="Đặt ưu tiên cấp cứu">
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
                    <p>Không có lượt nào bị nhỡ</p>
                  </div>
                } @else {
                  @for (t of overview()!.skippedTickets; track t.id) {
                    <div class="ticket-row-card skipped-row">
                      <div class="row-order">
                        <span class="row-ticket-num text-danger">{{ t.ticketNumber }}</span>
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
                        <button class="btn btn-sm btn-outline-primary" (click)="recallTicket(t.id)">
                          <i class="bi bi-arrow-counterclockwise"></i> Gọi lại ngay
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
                        <span class="row-ticket-num text-muted">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                        </div>
                        <div class="row-patient-meta">
                          <span>Bắt đầu: {{ t.startTime }}</span>
                          <span>• Xong: {{ t.endTime }}</span>
                        </div>
                      </div>
                      <div class="row-status">
                        <span class="badge badge-success"><i class="bi bi-check2"></i> Đã hoàn thành</span>
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
                <i class="bi bi-ticket-perforated-fill text-primary"></i> Tiếp Đón & Cấp Số Thứ Tự
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
                  <small class="form-hint">Dùng để tự động ưu tiên người già & trẻ em</small>
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
                  <span class="checkbox-custom"></span>
                  <span class="checkbox-text text-danger font-bold">
                    <i class="bi bi-exclamation-triangle-fill"></i> Trường hợp khẩn cấp / Cấp cứu (Ưu tiên gọi trước)
                  </span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label">Ghi chú triệu chứng / Lý do khám</label>
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
                  <span class="spinner-sm"></span> Đang sinh số...
                } @else {
                  <i class="bi bi-printer-fill"></i> In Phiếu & Cấp Số Ngay
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
      padding: 1.5rem 0 3rem;
      max-width: 1350px;
      margin: 0 auto;
    }

    .control-header {
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
      gap: 0.5rem;
      padding: 0.25rem 0.75rem;
      background: #eff6ff;
      color: var(--primary-700);
      font-size: 0.8rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.4rem;
      border: 1px solid var(--primary-200);
    }

    .live-pulse {
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
      animation: pulse 1.6s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.3rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 0.95rem;
    }

    .room-selector-bar {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 0.85rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04);
      flex-wrap: wrap;
    }

    .selector-label {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      white-space: nowrap;
    }

    .room-pills {
      display: flex;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .room-pill-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-md);
      background: #f8fafc;
      border: 1px solid var(--border-color);
      cursor: pointer;
      transition: all 0.2s;
    }

    .room-pill-btn:hover {
      background: var(--primary-50);
      border-color: var(--primary-300);
    }

    .room-pill-btn.active {
      background: var(--primary-600);
      color: #ffffff;
      border-color: var(--primary-600);
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
    }

    .pill-number {
      font-family: monospace;
      font-weight: 800;
      font-size: 0.95rem;
    }

    .pill-name {
      font-size: 0.85rem;
      font-weight: 600;
    }

    /* Console Grid */
    .console-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 1.5rem;
    }

    @media (max-width: 1024px) {
      .console-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Active Stage Card */
    .active-stage-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      padding: 1.5rem;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stage-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 1rem;
      border-bottom: 1px solid #f1f5f9;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .doctor-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-main);
      font-size: 0.95rem;
    }

    .specialty-sub {
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    .queue-quick-stats {
      display: flex;
      gap: 0.75rem;
    }

    .stat-tag {
      background: #f1f5f9;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .stat-tag strong {
      color: var(--text-main);
    }

    /* Big Call Button */
    .call-action-box {
      width: 100%;
    }

    .btn-call-next {
      width: 100%;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.4);
      transition: all 0.25s ease;
    }

    .btn-call-next:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 15px 30px -5px rgba(2, 132, 199, 0.55);
    }

    .btn-call-next:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .call-btn-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
    }

    .call-icon {
      font-size: 2.5rem;
      animation: ringing 2s infinite ease-in-out;
    }

    @keyframes ringing {
      0%, 100% { transform: rotate(0); }
      10%, 30% { transform: rotate(-10deg); }
      20%, 40% { transform: rotate(10deg); }
      50% { transform: rotate(0); }
    }

    .call-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }

    .call-title {
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: 0.05em;
    }

    .call-subtitle {
      font-size: 0.85rem;
      opacity: 0.9;
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
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .panel-called {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .panel-examining {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .panel-header {
      padding: 0.75rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    }

    .panel-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .panel-body {
      padding: 1.25rem 1rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .ticket-highlight {
      text-align: center;
    }

    .ticket-num {
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--primary-800);
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 0.4rem;
    }

    .patient-name {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 0.25rem;
    }

    .patient-info-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .panel-actions {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
    }

    .panel-empty {
      text-align: center;
      color: var(--text-muted);
      padding: 1.5rem 0;
    }

    .panel-empty i {
      font-size: 2rem;
      margin-bottom: 0.4rem;
      display: block;
    }

    .panel-empty p {
      margin: 0;
      font-size: 0.85rem;
    }

    /* Right Column: Queue List Card */
    .queue-list-card {
      background: #ffffff;
      border-radius: var(--radius-xl);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      max-height: 650px;
    }

    .queue-tabs {
      display: flex;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
      padding: 0.35rem 0.5rem 0;
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      padding: 0.75rem 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab-btn.active {
      color: var(--primary-700);
      font-weight: 700;
      border-bottom-color: var(--primary-600);
      background: #ffffff;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
    }

    .tab-count {
      background: #e2e8f0;
      color: var(--text-main);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
    }

    .count-skipped { background: #fee2e2; color: #dc2626; }
    .count-completed { background: #dcfce7; color: #15803d; }

    .tab-content-list {
      padding: 1rem;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .ticket-row-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      transition: all 0.2s;
    }

    .ticket-row-card:hover {
      background: #ffffff;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
      border-color: var(--primary-200);
    }

    .emergency-row {
      background: #fff1f2;
      border-color: #fecdd3;
    }

    .skipped-row {
      background: #faf5ff;
      border-color: #f3e8ff;
    }

    .row-order {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .order-idx {
      font-size: 0.85rem;
      font-weight: 800;
      color: var(--text-muted);
      width: 24px;
    }

    .row-ticket-num {
      font-family: monospace;
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--primary-700);
    }

    .row-patient-details {
      flex: 1;
    }

    .row-patient-name {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.95rem;
      color: var(--text-main);
      flex-wrap: wrap;
    }

    .row-patient-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.2rem;
      display: flex;
      gap: 0.4rem;
    }

    .badge-emergency {
      background: #ef4444;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .badge-priority {
      background: #fef08a;
      color: #854d0e;
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .badge-booked {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }

    .badge-skipped {
      background: #fee2e2;
      color: #991b1b;
      font-size: 0.75rem;
      padding: 0.15rem 0.45rem;
      border-radius: 4px;
    }

    .empty-list-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
    }

    .empty-list-state i {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      display: block;
    }

    /* Modal Check-In */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }

    .modal-dialog {
      background: #ffffff;
      border-radius: var(--radius-xl);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 540px;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 1.75rem;
      line-height: 1;
      color: var(--text-muted);
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
      max-height: 70vh;
      overflow-y: auto;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      background: #f8fafc;
    }

    .checkbox-group {
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: var(--radius-md);
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .font-bold { font-weight: 700; }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }

    .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .flex-1 { flex: 1; }
    .form-group { display: flex; flex-direction: column; margin-bottom: 1rem; }
    .form-label { font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem; }
    .form-label.required::after { content: ' *'; color: var(--rose-600); }
    .form-control { padding: 0.65rem 0.85rem; font-size: 0.95rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); }
    .form-control:focus { outline: none; border-color: var(--primary-600); box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15); }
    .form-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }

    .alert { padding: 0.85rem 1.25rem; border-radius: var(--radius-md); display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
    .alert-success { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
    .alert-danger { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
    .alert-close { margin-left: auto; background: none; border: none; font-size: 1.25rem; cursor: pointer; color: inherit; }
  `]
})
export class QueueControlComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);

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
    // Bắt đầu chu kỳ polling cập nhật thời gian thực mỗi 3 giây
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
    return !!(this.checkInForm.patientName?.trim() && this.checkInForm.patientPhone?.trim());
  }

  submitCheckIn(): void {
    if (!this.isCheckInValid()) return;

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
