import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QueueService } from '../../services/queue.service';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { QueueTicket, RoomQueueOverview } from '../../models/queue.model';
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
            <span class="live-dot"></span> {{ isDoctor() ? 'Bàn Gọi Khám & Điều Phối Bác Sĩ' : 'Bàn Điều Phối Hàng Đợi & Cân Bằng Tải' }}
          </div>
          <h1 class="page-title">{{ isDoctor() ? 'Bàn Gọi Khám Phòng Khám' : 'Điều Phối Hàng Đợi Các Phòng Khám' }}</h1>
          <p class="page-subtitle">
            {{ isDoctor() ? 'Gọi số khám, mời bệnh nhân vào phòng và bắt đầu ca khám bệnh' : 'Giám sát hàng đợi các phòng khám, điều chuyển phòng khi quá tải, gọi số và xử lý ưu tiên' }}
          </p>
        </div>
        @if (!isDoctor()) {
          <div class="header-right">
            <a routerLink="/staff/check-in" class="btn btn-primary">
              <i class="bi bi-person-check-fill"></i> Sang Quầy Tiếp Đón &amp; Cấp Số
            </a>
            <a routerLink="/queue" target="_blank" class="btn btn-outline">
              <i class="bi bi-display"></i> TV Sảnh Chờ
            </a>
          </div>
        }
      </div>

      <!-- Room Selector Strip with Load Count -->
      <div class="room-selector-bar">
        <span class="selector-label"><i class="bi bi-hospital"></i> Phòng Khám:</span>
        <div class="room-pills">
          @for (room of rooms(); track room.id) {
            <button
              class="room-pill-btn"
              [class.active]="selectedRoomId() === room.id"
              (click)="selectRoom(room.id)"
            >
              <span class="pill-number">{{ room.roomNumber }}</span>
              <span class="pill-name">{{ room.roomName }}</span>
              <span class="pill-load" [class.high-load]="getRoomWaitingCount(room.id) >= 5">
                {{ getRoomWaitingCount(room.id) }} chờ
              </span>
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
                <span>Bác sĩ trực: <strong>{{ overview()?.doctorName || 'Đang cập nhật' }}</strong></span>
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
                        @if (overview()!.currentCalledTicket!.patientDob) {
                          <span> • Ngày sinh: {{ overview()!.currentCalledTicket!.patientDob | date:'dd/MM/yyyy' }}</span>
                        } @else if (overview()!.currentCalledTicket!.patientYearOfBirth) {
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

            <!-- Quick Filter Bar -->
            <div class="list-search-bar">
              <div class="search-field-sm">
                <i class="bi bi-search"></i>
                <input
                  type="text"
                  [(ngModel)]="listSearchQuery"
                  placeholder="Lọc theo mã số hoặc tên người bệnh..."
                  class="search-input-sm"
                />
                @if (listSearchQuery) {
                  <button class="clear-sm" (click)="listSearchQuery = ''">×</button>
                }
              </div>
            </div>

            <!-- Tab Content 1: WAITING -->
            @if (activeTab === 'WAITING') {
              <div class="tab-content-list">
                @if (filteredWaitingTickets().length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-check-circle text-success"></i>
                    <p>{{ listSearchQuery ? 'Không tìm thấy bệnh nhân khớp bộ lọc' : 'Hiện không có bệnh nhân nào đang chờ' }}</p>
                  </div>
                } @else {
                  @for (t of filteredWaitingTickets(); track t.id; let idx = $index) {
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
                          @if (t.patientDob) {
                            <span>• NS: {{ t.patientDob | date:'dd/MM/yyyy' }}</span>
                          }
                          <span>• Giờ lấy số: {{ t.checkInTime }}</span>
                          <span>• Điểm: <strong class="num">{{ t.priorityScore }}</strong></span>
                        </div>
                        @if (t.notes) {
                          <div class="row-patient-note">
                            <i class="bi bi-info-circle"></i> {{ t.notes }}
                          </div>
                        }
                      </div>
                      <div class="row-actions">
                        @if (!t.isEmergency) {
                          <button class="btn btn-sm btn-outline-danger" (click)="openEmergencyModal(t)" title="Gắn cờ ưu tiên cấp cứu">
                            <i class="bi bi-lightning-fill"></i> Khẩn cấp
                          </button>
                        }
                        <!-- Chuyển phòng khám (Điều phối tải) -->
                        <button class="btn btn-sm btn-outline-primary" (click)="openTransferModal(t)" title="Chuyển sang phòng khám khác để giảm tải">
                          <i class="bi bi-arrow-left-right"></i> Chuyển phòng
                        </button>
                        <!-- Hủy lượt khám -->
                        <button class="btn btn-sm btn-outline-muted" (click)="openCancelModal(t)" title="Hủy số khám nếu người bệnh xin về">
                          <i class="bi bi-x-circle"></i> Hủy
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Tab Content 2: SKIPPED -->
            @if (activeTab === 'SKIPPED') {
              <div class="tab-content-list">
                @if (filteredSkippedTickets().length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-person-check text-muted"></i>
                    <p>{{ listSearchQuery ? 'Không tìm thấy lượt nhỡ khớp bộ lọc' : 'Không có lượt khám nào bị nhỡ' }}</p>
                  </div>
                } @else {
                  @for (t of filteredSkippedTickets(); track t.id) {
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
                          <span>• Giờ lấy số: {{ t.checkInTime }}</span>
                        </div>
                        @if (t.notes) {
                          <div class="row-patient-note">
                            <i class="bi bi-info-circle"></i> {{ t.notes }}
                          </div>
                        }
                      </div>
                      <div class="row-actions">
                        <button class="btn btn-sm btn-outline" (click)="recallTicket(t.id)" title="Gọi lại số này">
                          <i class="bi bi-arrow-counterclockwise"></i> Gọi lại
                        </button>
                        <button class="btn btn-sm btn-outline-primary" (click)="openTransferModal(t)" title="Chuyển sang phòng khác">
                          <i class="bi bi-arrow-left-right"></i> Chuyển phòng
                        </button>
                        <button class="btn btn-sm btn-outline-muted" (click)="openCancelModal(t)" title="Hủy số khám">
                          <i class="bi bi-x-circle"></i> Hủy
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
                @if (filteredCompletedTickets().length === 0) {
                  <div class="empty-list-state">
                    <i class="bi bi-clipboard-pulse text-muted"></i>
                    <p>Chưa có lượt khám nào hoàn thành hôm nay</p>
                  </div>
                } @else {
                  @for (t of filteredCompletedTickets(); track t.id) {
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

      <!-- Modal Điều Phối: Chuyển Phòng Khám (Transfer Ticket Modal) -->
      @if (showTransferModal() && activeTransferTicket()) {
        <div class="modal-backdrop" (click)="closeTransferModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi bi-arrow-left-right text-primary"></i> Điều Phối Chuyển Phòng Khám
              </h2>
              <button class="modal-close-btn" (click)="closeTransferModal()">×</button>
            </div>
            <div class="modal-body">
              <div class="ticket-info-summary">
                <div class="summary-num num">{{ activeTransferTicket()?.ticketNumber }}</div>
                <div class="summary-details">
                  <div class="summary-name">Bệnh nhân: <strong>{{ activeTransferTicket()?.patientName }}</strong></div>
                  <div class="summary-sub">
                    Phòng hiện tại: <strong>{{ activeTransferTicket()?.roomNumber }} - {{ activeTransferTicket()?.roomName }}</strong>
                  </div>
                </div>
              </div>

              <div class="form-group mt-3">
                <label class="form-label required">Chọn phòng khám chuyển đến:</label>
                <select [(ngModel)]="targetRoomId" class="form-control" required>
                  @for (r of rooms(); track r.id) {
                    @if (r.id !== activeTransferTicket()?.examinationRoomId) {
                      <option [ngValue]="r.id">
                        {{ r.roomNumber }} - {{ r.roomName }} (Đang chờ: {{ getRoomWaitingCount(r.id) }} người)
                      </option>
                    }
                  }
                </select>
                <small class="form-hint">
                  Nên chọn phòng có ít bệnh nhân đang chờ để cân bằng thời gian chờ giữa các phòng
                </small>
              </div>

              <div class="form-group">
                <label class="form-label">Lý do điều chuyển:</label>
                <input
                  type="text"
                  [(ngModel)]="transferReason"
                  placeholder="Ví dụ: Giảm tải phòng khám, Đúng chuyên khoa, Bác sĩ yêu cầu..."
                  class="form-control"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeTransferModal()">Hủy Bỏ</button>
              <button
                class="btn btn-primary"
                [disabled]="submittingTransfer() || !targetRoomId"
                (click)="confirmTransferTicket()"
              >
                @if (submittingTransfer()) {
                  <span class="spinner-sm"></span> Đang chuyển...
                } @else {
                  <i class="bi bi-check-circle-fill"></i> Xác Nhận Chuyển Phòng
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Hủy Lượt Khám (Cancel Ticket Modal) -->
      @if (showCancelModal() && activeCancelTicket()) {
        <div class="modal-backdrop" (click)="closeCancelModal()">
          <div class="modal-dialog modal-sm-custom" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title text-danger">
                <i class="bi bi-exclamation-triangle-fill"></i> Xác Nhận Hủy Lượt Khám
              </h2>
              <button class="modal-close-btn" (click)="closeCancelModal()">×</button>
            </div>
            <div class="modal-body">
              <p class="cancel-prompt">
                Bạn có chắc chắn muốn hủy lượt số <strong>{{ activeCancelTicket()?.ticketNumber }}</strong> của bệnh nhân <strong>{{ activeCancelTicket()?.patientName }}</strong>?
              </p>
              <div class="form-group">
                <label class="form-label">Lý do hủy số:</label>
                <input
                  type="text"
                  [(ngModel)]="cancelReason"
                  placeholder="Ví dụ: Người bệnh xin về, Trùng số, Không khám nữa..."
                  class="form-control"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeCancelModal()">Quay Lại</button>
              <button
                class="btn btn-danger"
                [disabled]="submittingCancel()"
                (click)="confirmCancelTicket()"
              >
                @if (submittingCancel()) {
                  <span class="spinner-sm"></span> Đang hủy...
                } @else {
                  <i class="bi bi-trash-fill"></i> Hủy Lượt Khám
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Kích Hoạt Ưu Tiên Cấp Cứu (Emergency Priority Modal) -->
      @if (showEmergencyModal() && activeEmergencyTicket()) {
        <div class="modal-backdrop" (click)="closeEmergencyModal()">
          <div class="modal-dialog modal-emergency-custom" (click)="$event.stopPropagation()">
            <div class="modal-header modal-header-emergency">
              <div class="modal-emergency-title-box">
                <div class="emergency-icon-circle">
                  <i class="bi bi-exclamation-octagon-fill"></i>
                </div>
                <div>
                  <h2 class="modal-title text-danger">Kích Hoạt Ưu Tiên Cấp Cứu</h2>
                  <span class="emergency-subtitle">Đưa người bệnh lên vị trí số 1 trong hàng đợi</span>
                </div>
              </div>
              <button class="modal-close-btn" (click)="closeEmergencyModal()">×</button>
            </div>
            <div class="modal-body">
              <!-- Thông tin người bệnh tóm tắt -->
              <div class="ticket-info-summary emergency-summary">
                <div class="summary-num num text-danger">{{ activeEmergencyTicket()?.ticketNumber }}</div>
                <div class="summary-details">
                  <div class="summary-name">Bệnh nhân: <strong>{{ activeEmergencyTicket()?.patientName }}</strong></div>
                  <div class="summary-sub">
                    SĐT: <strong>{{ activeEmergencyTicket()?.patientPhone }}</strong>
                    @if (activeEmergencyTicket()?.patientDob) {
                      <span> • Ngày sinh: <strong>{{ activeEmergencyTicket()?.patientDob | date:'dd/MM/yyyy' }}</strong></span>
                    }
                  </div>
                  <div class="summary-sub">
                    Phòng khám: <strong>{{ activeEmergencyTicket()?.roomNumber }} - {{ activeEmergencyTicket()?.roomName }}</strong>
                  </div>
                </div>
              </div>

              <!-- Hộp cảnh báo y tế tác động đến hàng đợi -->
              <div class="emergency-warning-box">
                <div class="warning-header">
                  <i class="bi bi-shield-exclamation text-danger"></i>
                  <strong>Tác động đến thứ tự hàng đợi:</strong>
                </div>
                <ul class="warning-list">
                  <li>Cộng thêm <strong>+100 điểm ưu tiên</strong>, đưa bệnh nhân lên <strong>đầu danh sách chờ (vị trí gọi số tiếp theo)</strong>.</li>
                  <li>Hiển thị cờ đỏ cảnh báo <strong>[CẤP CỨU]</strong> trên màn hình gọi số của bác sĩ và bảng TV sảnh chờ.</li>
                  <li>Lượt khám tiếp theo sẽ ưu tiên mời bệnh nhân này vào phòng khám ngay lập tức.</li>
                </ul>
              </div>

              <p class="emergency-confirm-question">
                Bạn có chắc chắn muốn xác nhận ưu tiên cấp cứu cho bệnh nhân này?
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeEmergencyModal()">Hủy Bỏ</button>
              <button
                class="btn btn-danger btn-lg-emergency"
                [disabled]="submittingEmergency()"
                (click)="confirmEmergency()"
              >
                @if (submittingEmergency()) {
                  <span class="spinner-sm"></span> Đang kích hoạt...
                } @else {
                  <i class="bi bi-lightning-fill"></i> Xác Nhận Cấp Cứu
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

    .header-right {
      display: flex;
      gap: 0.75rem;
      align-items: center;
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
      gap: 0.5rem;
      padding: 0.45rem 0.95rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background-color: var(--bg-main);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s ease;
    }

    .room-pill-btn:hover {
      border-color: var(--primary-300);
      background-color: var(--primary-50);
      color: var(--primary-700);
    }

    .room-pill-btn.active {
      background-color: var(--primary-600);
      border-color: var(--primary-600);
      color: #ffffff;
      box-shadow: 0 2px 4px rgba(2, 132, 199, 0.25);
    }

    .pill-number {
      font-weight: 800;
      letter-spacing: 0.02em;
    }

    .pill-load {
      font-size: 0.725rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      background: rgba(0, 0, 0, 0.06);
    }

    .room-pill-btn.active .pill-load {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .pill-load.high-load {
      background: #fee2e2;
      color: #b91c1c;
      font-weight: 700;
    }

    /* Console Grid */
    .console-grid {
      display: grid;
      grid-template-columns: 1fr 480px;
      gap: 1.25rem;
    }

    @media (max-width: 1100px) {
      .console-grid {
        grid-template-columns: 1fr;
      }
    }

    .medical-card {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
    }

    /* Stage Card */
    .active-stage-card {
      padding: 1.25rem;
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
      font-size: 0.95rem;
      color: var(--text-main);
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
      font-size: 0.825rem;
      color: var(--text-secondary);
      background-color: var(--bg-subtle);
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-color);
    }

    .call-action-box {
      width: 100%;
    }

    .btn-call-next {
      width: 100%;
      background: linear-gradient(135deg, var(--primary-600) 0%, var(--primary-700) 100%);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-md);
      padding: 1.35rem 1.5rem;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
      transition: all 0.2s ease;
      text-align: left;
    }

    .btn-call-next:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(2, 132, 199, 0.45);
      background: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
    }

    .btn-call-next:disabled {
      background: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .call-btn-content {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .call-icon {
      font-size: 2.2rem;
      color: #fef08a;
    }

    .call-text {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .call-title {
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: 0.05em;
    }

    .call-subtitle {
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .status-panels-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 680px) {
      .status-panels-row {
        grid-template-columns: 1fr;
      }
    }

    .ticket-status-panel {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #ffffff;
    }

    .panel-called {
      border-top: 3px solid #0284c7;
    }

    .panel-examining {
      border-top: 3px solid #16a34a;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.65rem 0.85rem;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
    }

    .panel-title {
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .badge-calling {
      background: #e0f2fe;
      color: #0369a1;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-xs);
    }

    .badge-examining {
      background: #dcfce7;
      color: #15803d;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-xs);
    }

    .panel-body {
      padding: 1rem 0.85rem;
      min-height: 140px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .ticket-highlight {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .ticket-num {
      font-size: 1.85rem;
      font-weight: 900;
      color: var(--primary-700);
      line-height: 1;
    }

    .patient-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .patient-info-sub {
      font-size: 0.775rem;
      color: var(--text-muted);
    }

    .panel-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.65rem;
      flex-wrap: wrap;
    }

    .panel-empty {
      text-align: center;
      color: var(--text-muted);
      padding: 1.5rem 0;
    }

    .panel-empty i {
      font-size: 1.8rem;
      display: block;
      margin-bottom: 0.25rem;
    }

    /* Queue Tabs */
    .queue-list-card {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .queue-tabs {
      display: flex;
      background: #f8fafc;
      border-bottom: 1px solid var(--border-color);
    }

    .tab-btn {
      flex: 1;
      padding: 0.75rem 0.5rem;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-size: 0.825rem;
      font-weight: 700;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      transition: all 0.15s;
    }

    .tab-btn.active {
      color: var(--primary-700);
      border-bottom-color: var(--primary-700);
      background: #ffffff;
    }

    .tab-count {
      font-size: 0.725rem;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
      background: #e2e8f0;
      color: #334155;
    }

    .tab-count.count-skipped {
      background: #fee2e2;
      color: #b91c1c;
    }

    .tab-count.count-completed {
      background: #dcfce7;
      color: #15803d;
    }

    .list-search-bar {
      padding: 0.65rem 0.85rem;
      background: #ffffff;
      border-bottom: 1px solid var(--border-subtle);
    }

    .search-field-sm {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-field-sm i {
      position: absolute;
      left: 0.65rem;
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .search-input-sm {
      width: 100%;
      padding: 0.35rem 1.8rem 0.35rem 2rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.825rem;
    }

    .clear-sm {
      position: absolute;
      right: 0.5rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1rem;
    }

    .tab-content-list {
      max-height: 580px;
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .ticket-row-card {
      padding: 0.75rem 0.85rem;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      transition: all 0.15s;
    }

    .ticket-row-card:hover {
      border-color: var(--primary-300);
      box-shadow: var(--shadow-xs);
    }

    .ticket-row-card.emergency-row {
      border-left: 4px solid var(--danger-solid);
      background: #fffaf0;
    }

    .row-order {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .order-idx {
      font-size: 0.775rem;
      color: var(--text-muted);
      font-weight: 700;
    }

    .row-ticket-num {
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--primary-800);
    }

    .row-patient-details {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .row-patient-name {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.9rem;
      color: var(--text-main);
      flex-wrap: wrap;
    }

    .badge-emergency {
      background: #fee2e2;
      color: #991b1b;
      font-size: 0.7rem;
      font-weight: 800;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
    }

    .badge-priority {
      background: #fef3c7;
      color: #92400e;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
    }

    .badge-booked {
      background: #e0e7ff;
      color: #3730a3;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
    }

    .badge-skipped {
      background: #fee2e2;
      color: #b91c1c;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: var(--radius-xs);
    }

    .row-patient-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    .row-patient-note {
      font-size: 0.75rem;
      color: var(--primary-800);
      background: var(--primary-50);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
      margin-top: 0.15rem;
    }

    .row-actions {
      display: flex;
      gap: 0.45rem;
      justify-content: flex-end;
      margin-top: 0.25rem;
      padding-top: 0.35rem;
      border-top: 1px dashed var(--border-subtle);
      flex-wrap: wrap;
    }

    .btn-outline-muted {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
      cursor: pointer;
    }

    .btn-outline-muted:hover {
      background: #fee2e2;
      color: #b91c1c;
      border-color: #fca5a5;
    }

    .btn-outline-primary {
      background: transparent;
      border: 1px solid var(--primary-300);
      color: var(--primary-700);
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
      cursor: pointer;
    }

    .btn-outline-primary:hover {
      background: var(--primary-50);
      border-color: var(--primary-500);
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

    .loading-state {
      padding: 4rem 1rem;
      text-align: center;
      color: var(--text-muted);
    }

    /* Modal styles */
    .ticket-info-summary {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #f8fafc;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
    }

    .summary-num {
      font-size: 1.6rem;
      font-weight: 900;
      color: var(--primary-700);
    }

    .summary-name {
      font-size: 0.95rem;
      color: var(--text-main);
    }

    .summary-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }

    .modal-sm-custom {
      max-width: 420px;
    }

    .cancel-prompt {
      font-size: 0.95rem;
      color: var(--text-main);
      line-height: 1.45;
      margin-bottom: 1rem;
    }

    /* Emergency Confirmation Modal */
    .modal-emergency-custom {
      max-width: 490px;
      border: 2px solid #fecdd3;
      border-radius: var(--radius-md);
      box-shadow: 0 10px 30px rgba(225, 29, 72, 0.2);
    }

    .modal-header-emergency {
      background: #fff1f2;
      border-bottom: 1px solid #fecdd3;
      padding: 1rem 1.25rem;
    }

    .modal-emergency-title-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .emergency-icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #fee2e2;
      color: #e11d48;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .emergency-subtitle {
      font-size: 0.775rem;
      color: #9f1239;
      font-weight: 600;
      display: block;
      margin-top: 0.1rem;
    }

    .emergency-summary {
      border: 1.5px solid #fecdd3;
      background: #fff5f5;
    }

    .emergency-warning-box {
      margin-top: 1rem;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: var(--radius-sm);
      padding: 0.85rem 1rem;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.875rem;
      color: #991b1b;
      margin-bottom: 0.4rem;
    }

    .warning-list {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.825rem;
      color: #7f1d1d;
      line-height: 1.5;
    }

    .emergency-confirm-question {
      margin-top: 1.15rem;
      margin-bottom: 0.25rem;
      font-size: 0.925rem;
      font-weight: 700;
      color: var(--text-main);
      text-align: center;
    }

    .btn-lg-emergency {
      font-weight: 800;
      padding: 0.6rem 1.35rem;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.95rem;
      box-shadow: 0 2px 6px rgba(225, 29, 72, 0.3);
    }
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

  // Transfer Modal State
  readonly showTransferModal = signal(false);
  readonly activeTransferTicket = signal<QueueTicket | null>(null);
  readonly submittingTransfer = signal(false);
  targetRoomId: number = 0;
  transferReason: string = '';

  // Cancel Modal State
  readonly showCancelModal = signal(false);
  readonly activeCancelTicket = signal<QueueTicket | null>(null);
  readonly submittingCancel = signal(false);
  cancelReason: string = '';

  // Emergency Modal State
  readonly showEmergencyModal = signal(false);
  readonly activeEmergencyTicket = signal<QueueTicket | null>(null);
  readonly submittingEmergency = signal(false);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  activeTab: 'WAITING' | 'SKIPPED' | 'COMPLETED' = 'WAITING';
  listSearchQuery: string = '';

  private pollingTimer: any = null;
  roomWaitingCounts = signal<Record<number, number>>({});

  ngOnInit(): void {
    this.loadRooms();
    this.pollingTimer = setInterval(() => {
      if (this.selectedRoomId()) {
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
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
          this.fetchOverview(true);
          this.loadDisplayBoardCounts();
        }
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

  selectRoom(roomId: number): void {
    this.selectedRoomId.set(roomId);
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
        this.loadDisplayBoardCounts();
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
        this.loadDisplayBoardCounts();
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
        this.loadDisplayBoardCounts();
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi hoàn thành khám', 'danger')
    });
  }

  skipTicket(ticketId: number): void {
    this.queueService.skipTicket(ticketId).subscribe({
      next: () => {
        this.showAlert('Đã chuyển số vào danh sách nhỡ lượt (vắng mặt)!', 'success');
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi bỏ qua lượt', 'danger')
    });
  }

  recallTicket(ticketId: number): void {
    this.queueService.recallTicket(ticketId).subscribe({
      next: res => {
        this.showAlert(`Đã gọi lại số nhỡ: ${res.data?.ticketNumber}`, 'success');
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi gọi lại số', 'danger')
    });
  }

  // --- Kích hoạt Ưu tiên cấp cứu (Emergency Priority Modal) ---
  openEmergencyModal(ticket: QueueTicket): void {
    this.activeEmergencyTicket.set(ticket);
    this.showEmergencyModal.set(true);
  }

  closeEmergencyModal(): void {
    this.showEmergencyModal.set(false);
    this.activeEmergencyTicket.set(null);
  }

  confirmEmergency(): void {
    const ticket = this.activeEmergencyTicket();
    if (!ticket) return;

    this.submittingEmergency.set(true);
    this.queueService.setEmergency(ticket.id).subscribe({
      next: res => {
        this.submittingEmergency.set(false);
        this.showAlert(`Đã kích hoạt ưu tiên khẩn cấp cho số ${res.data?.ticketNumber}!`, 'success');
        this.closeEmergencyModal();
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => {
        this.submittingEmergency.set(false);
        this.showAlert(err.error?.message || 'Lỗi khi kích hoạt ưu tiên cấp cứu', 'danger');
      }
    });
  }


  // --- Chuyển phòng khám (Transfer Ticket) ---
  openTransferModal(ticket: QueueTicket): void {
    this.activeTransferTicket.set(ticket);
    const availableRooms = this.rooms().filter(r => r.id !== ticket.examinationRoomId);
    this.targetRoomId = availableRooms.length > 0 ? availableRooms[0].id : 0;
    this.transferReason = 'Điều phối tải phòng khám';
    this.showTransferModal.set(true);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
    this.activeTransferTicket.set(null);
  }

  confirmTransferTicket(): void {
    const ticket = this.activeTransferTicket();
    if (!ticket || !this.targetRoomId) return;

    this.submittingTransfer.set(true);
    this.queueService.transferTicket(ticket.id, this.targetRoomId, this.transferReason).subscribe({
      next: res => {
        this.submittingTransfer.set(false);
        this.showAlert(`Đã chuyển lượt số ${res.data?.ticketNumber} sang phòng ${res.data?.roomNumber}!`, 'success');
        this.closeTransferModal();
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => {
        this.submittingTransfer.set(false);
        this.showAlert(err.error?.message || 'Lỗi khi chuyển phòng khám', 'danger');
      }
    });
  }

  // --- Hủy lượt khám (Cancel Ticket) ---
  openCancelModal(ticket: QueueTicket): void {
    this.activeCancelTicket.set(ticket);
    this.cancelReason = 'Người bệnh xin hủy';
    this.showCancelModal.set(true);
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.activeCancelTicket.set(null);
  }

  confirmCancelTicket(): void {
    const ticket = this.activeCancelTicket();
    if (!ticket) return;

    this.submittingCancel.set(true);
    this.queueService.cancelTicket(ticket.id, this.cancelReason).subscribe({
      next: res => {
        this.submittingCancel.set(false);
        this.showAlert(`Đã hủy lượt khám ${res.data?.ticketNumber}!`, 'success');
        this.closeCancelModal();
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => {
        this.submittingCancel.set(false);
        this.showAlert(err.error?.message || 'Lỗi khi hủy lượt khám', 'danger');
      }
    });
  }

  // --- Search / Filter helpers for tabs ---
  filteredWaitingTickets(): QueueTicket[] {
    const tickets = this.overview()?.waitingTickets || [];
    const q = this.listSearchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.patientName.toLowerCase().includes(q) ||
      (t.patientPhone && t.patientPhone.includes(q))
    );
  }

  filteredSkippedTickets(): QueueTicket[] {
    const tickets = this.overview()?.skippedTickets || [];
    const q = this.listSearchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.patientName.toLowerCase().includes(q) ||
      (t.patientPhone && t.patientPhone.includes(q))
    );
  }

  filteredCompletedTickets(): QueueTicket[] {
    const tickets = this.overview()?.completedTickets || [];
    const q = this.listSearchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.patientName.toLowerCase().includes(q) ||
      (t.patientPhone && t.patientPhone.includes(q))
    );
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
