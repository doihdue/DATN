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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ isDoctor() ? 'Gọi khám' : 'Điều phối hàng đợi' }}</h1>
          <p class="page-subtitle">
            {{ isDoctor() ? 'Gọi số, mời bệnh nhân vào phòng và bắt đầu khám' : 'Theo dõi hàng đợi từng phòng, chuyển phòng, xử lý ưu tiên và nhỡ lượt' }}
          </p>
        </div>
        @if (!isDoctor()) {
          <div class="page-actions">
            <a routerLink="/staff/check-in" class="btn btn-secondary">Tiếp đón &amp; cấp số</a>
            <a routerLink="/queue" target="_blank" class="btn btn-secondary">
              <i class="bi bi-box-arrow-up-right"></i> Màn hình sảnh chờ
            </a>
          </div>
        }
      </div>

      <!-- Chọn phòng -->
      <div class="panel room-filter-bar">
        <div class="room-filter-left">
          <label for="roomSelectControl" class="room-filter-label">Phòng khám</label>
          @if (isDoctor()) {
            <!-- Bác sĩ chỉ được gọi số tại phòng mình có ca trực hôm nay -->
            <span class="room-filter-static">
              @if (overview(); as ov) {
                {{ ov.roomNumber }} - {{ ov.roomName }}
              } @else {
                Chưa có phòng trực
              }
            </span>
          } @else {
            <select
              id="roomSelectControl"
              class="room-filter-select"
              [ngModel]="selectedRoomId()"
              (ngModelChange)="selectRoom($event)"
            >
              @for (floor of availableFloors(); track floor) {
                <optgroup [label]="'Tầng ' + floor">
                  @for (room of getRoomsByFloor(floor); track room.id) {
                    <option [ngValue]="room.id">
                      {{ room.roomNumber }} - {{ room.roomName }}
                    </option>
                  }
                </optgroup>
              }
            </select>
          }
        </div>

        @if (isDoctor() ? overview() : selectedRoom()) {
          <div class="room-filter-right">
            <span class="room-stat">Đang chờ <strong class="mono">{{ currentRoomWaitingCount() }}</strong></span>
            <button type="button" class="icon-btn" (click)="fetchOverview(true)" title="Làm mới" aria-label="Làm mới">
              <i class="bi bi-arrow-clockwise" [class.spin-active]="loading()"></i>
            </button>
          </div>
        }
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
        <div class="panel loading-state">
          <div class="spinner"></div>
          <p>Đang tải hàng đợi...</p>
        </div>
      } @else if (myRoomError()) {
        <div class="panel loading-state">
          <p>{{ myRoomError() }}</p>
        </div>
      } @else if (overview()) {
        <div class="console-grid">
          <!-- Cột trái: đang gọi / đang khám -->
          <div class="active-stage-card panel">
            <div class="stage-header">
              <div class="doctor-badge">
                <span class="text-muted">Bác sĩ trực</span>
                <strong>{{ overview()?.doctorName || 'Chưa cập nhật' }}</strong>
                @if (overview()?.specialtyName) {
                  <span class="specialty-sub">{{ overview()?.specialtyName }}</span>
                }
              </div>
              <dl class="queue-quick-stats">
                <div><dt>Đang chờ</dt><dd class="mono">{{ overview()?.totalWaitingCount }}</dd></div>
                <div><dt>Ước tính chờ</dt><dd class="mono">{{ overview()?.estimatedWaitMinutes }} phút</dd></div>
              </dl>
            </div>

            <!-- Chỉ bác sĩ trực phòng mới gọi số vào phòng khám -->
            @if (isDoctor()) {
              <div class="call-action-box">
                <button
                  class="btn btn-primary btn-lg btn-call-next"
                  [disabled]="calling() || overview()!.waitingTickets.length === 0"
                  (click)="callNext()"
                >
                  <i class="bi bi-megaphone"></i> Gọi số tiếp theo
                </button>
                <div class="call-subtitle">
                  @if (overview()!.waitingTickets.length > 0) {
                    Kế tiếp: <strong class="mono">{{ overview()!.waitingTickets[0].ticketNumber }}</strong> · {{ overview()!.waitingTickets[0].patientName }}
                  } @else {
                    Không có bệnh nhân trong hàng chờ
                  }
                </div>
              </div>
            } @else {
              <div class="call-action-box">
                <p class="call-note">
                  Bác sĩ trực phòng gọi số mời bệnh nhân vào khám. Quầy điều phối chuyển phòng, đánh dấu ưu tiên và xử lý nhỡ lượt.
                </p>
              </div>
            }

            <div class="status-panels-row">
              <!-- Đang gọi (CALLED) -->
              <div class="ticket-status-panel panel-called">
                <div class="panel-header">
                  <span class="panel-title">Đang gọi vào phòng</span>
                  @if (overview()?.currentCalledTicket) {
                    <span class="status info">Mời vào</span>
                  }
                </div>
                <div class="panel-body">
                  @if (overview()?.currentCalledTicket) {
                    <div class="ticket-highlight">
                      <div class="ticket-num mono">{{ overview()!.currentCalledTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentCalledTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span class="mono">{{ overview()!.currentCalledTicket!.patientPhone }}</span>
                        @if (overview()!.currentCalledTicket!.patientDob) {
                          <span> · NS {{ overview()!.currentCalledTicket!.patientDob | date:'dd/MM/yyyy' }}</span>
                        } @else if (overview()!.currentCalledTicket!.patientYearOfBirth) {
                          <span> · NS {{ overview()!.currentCalledTicket!.patientYearOfBirth }}</span>
                        }
                      </div>
                      @if (isDoctor()) {
                        <div class="panel-actions">
                          <button class="btn btn-primary btn-sm" (click)="startExam(overview()!.currentCalledTicket!.id)">
                            Bắt đầu khám
                          </button>
                          <button class="btn btn-secondary btn-sm" (click)="skipTicket(overview()!.currentCalledTicket!.id)">
                            Bỏ qua (vắng mặt)
                          </button>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="panel-empty">Chưa có số nào đang gọi</div>
                  }
                </div>
              </div>

              <!-- Đang khám (IN_PROGRESS) -->
              <div class="ticket-status-panel panel-examining">
                <div class="panel-header">
                  <span class="panel-title">Đang khám</span>
                  @if (overview()?.currentExaminingTicket) {
                    <span class="status success">Đang khám</span>
                  }
                </div>
                <div class="panel-body">
                  @if (overview()?.currentExaminingTicket) {
                    <div class="ticket-highlight">
                      <div class="ticket-num mono">{{ overview()!.currentExaminingTicket!.ticketNumber }}</div>
                      <div class="patient-name">{{ overview()!.currentExaminingTicket!.patientName }}</div>
                      <div class="patient-info-sub">
                        <span>Bắt đầu <span class="mono">{{ overview()!.currentExaminingTicket!.startTime }}</span></span>
                      </div>
                      @if (isDoctor()) {
                        <div class="panel-actions">
                          <a [routerLink]="['/doctor/examination', overview()!.currentExaminingTicket!.id]"
                             [state]="{ ticket: overview()!.currentExaminingTicket }"
                             (click)="onOpenExamination(overview()!.currentExaminingTicket!)"
                             class="btn btn-primary btn-sm">
                            Mở phiếu khám
                          </a>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="panel-empty">Phòng đang trống</div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Cột phải: danh sách hàng đợi -->
          <div class="queue-list-card panel">
            <div class="queue-tabs" role="tablist">
              <button
                class="tab-btn"
                [class.active]="activeTab === 'RESULTS_READY'"
                (click)="activeTab = 'RESULTS_READY'"
                title="Bệnh nhân đã có kết quả cận lâm sàng"
              >
                <span class="tab-text">Có kết quả CLS</span>
                <span class="tab-count mono">{{ overview()?.resultsReadyTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'WAITING'"
                (click)="activeTab = 'WAITING'"
                title="Bệnh nhân chờ khám lần đầu"
              >
                <span class="tab-text">Chờ khám</span>
                <span class="tab-count mono">{{ overview()?.waitingTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'WAITING_FOR_RESULTS'"
                (click)="activeTab = 'WAITING_FOR_RESULTS'"
                title="Bệnh nhân đang làm xét nghiệm cận lâm sàng"
              >
                <span class="tab-text">Đang làm XN</span>
                <span class="tab-count mono">{{ overview()?.waitingForResultsTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'SKIPPED'"
                (click)="activeTab = 'SKIPPED'"
                title="Bệnh nhân nhỡ lượt gọi"
              >
                <span class="tab-text">Nhỡ lượt</span>
                <span class="tab-count mono">{{ overview()?.skippedTickets?.length || 0 }}</span>
              </button>
              <button
                class="tab-btn"
                [class.active]="activeTab === 'COMPLETED'"
                (click)="activeTab = 'COMPLETED'"
                title="Bệnh nhân đã khám xong"
              >
                <span class="tab-text">Đã khám</span>
                <span class="tab-count mono">{{ overview()?.completedTickets?.length || 0 }}</span>
              </button>
            </div>

            <div class="list-search-bar">
              <div class="search-field-sm">
                <i class="bi bi-search"></i>
                <input
                  type="text"
                  [(ngModel)]="listSearchQuery"
                  placeholder="Lọc theo số phiếu hoặc tên bệnh nhân"
                  class="search-input-sm"
                />
                @if (listSearchQuery) {
                  <button class="clear-sm" (click)="listSearchQuery = ''" title="Xoá bộ lọc" aria-label="Xoá bộ lọc">×</button>
                }
              </div>
            </div>

            <!-- Có kết quả CLS -->
            @if (activeTab === 'RESULTS_READY') {
              <div class="tab-content-list">
                @if (filteredResultsReadyTickets().length === 0) {
                  <div class="empty-list-state">
                    <p>{{ listSearchQuery ? 'Không có bệnh nhân khớp bộ lọc' : 'Chưa có bệnh nhân nào có kết quả CLS' }}</p>
                  </div>
                } @else {
                  @for (t of filteredResultsReadyTickets(); track t.id; let idx = $index) {
                    <div class="ticket-row-card results-ready-row" [class.emergency-row]="t.isEmergency">
                      <div class="row-order">
                        <span class="order-idx mono">{{ idx + 1 }}</span>
                        <span class="row-ticket-num mono">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          <span class="status success">Đã có kết quả CLS</span>
                          @if (t.isEmergency) {
                            <span class="status danger">Cấp cứu</span>
                          }
                        </div>
                        <div class="row-patient-meta">
                          <span class="mono">{{ t.patientPhone }}</span>
                          @if (t.patientDob) {
                            <span>NS {{ t.patientDob | date:'dd/MM/yyyy' }}</span>
                          }
                          <span>Chờ đọc kết quả và kê đơn</span>
                        </div>
                      </div>
                      <div class="row-actions">
                        @if (isDoctor()) {
                          <button class="btn btn-sm btn-primary" (click)="startExam(t.id)" title="Mời bệnh nhân vào phòng đọc kết quả">
                            Mời vào đọc KQ
                          </button>
                        } @else {
                          <span class="row-hint">Chờ bác sĩ mời vào</span>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Chờ khám -->
            @if (activeTab === 'WAITING') {
              <div class="tab-content-list">
                @if (filteredWaitingTickets().length === 0) {
                  <div class="empty-list-state">
                    <p>{{ listSearchQuery ? 'Không có bệnh nhân khớp bộ lọc' : 'Không có bệnh nhân đang chờ' }}</p>
                  </div>
                } @else {
                  @for (t of filteredWaitingTickets(); track t.id; let idx = $index) {
                    <div class="ticket-row-card" [class.emergency-row]="t.isEmergency">
                      <div class="row-order">
                        <span class="order-idx mono">{{ idx + 1 }}</span>
                        <span class="row-ticket-num mono">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          @if (t.isEmergency) {
                            <span class="status danger">Cấp cứu</span>
                          }
                          @if (t.priorityScore >= 30 && !t.isEmergency) {
                            <span class="status warning">Ưu tiên</span>
                          }
                          @if (t.hasAppointment) {
                            <span class="status info">Đặt trước</span>
                          }
                        </div>
                        <div class="row-patient-meta">
                          <span class="mono">{{ t.patientPhone }}</span>
                          @if (t.patientDob) {
                            <span>NS {{ t.patientDob | date:'dd/MM/yyyy' }}</span>
                          }
                          <span>Lấy số <span class="mono">{{ t.checkInTime | slice:0:5 }}</span></span>
                          <span>Điểm <span class="mono">{{ t.priorityScore }}</span></span>
                        </div>
                        @if (t.notes) {
                          <div class="row-patient-note">{{ t.notes }}</div>
                        }
                      </div>
                      <div class="row-actions">
                        @if (!t.isEmergency) {
                          <button class="btn btn-sm btn-secondary" (click)="openEmergencyModal(t)" title="Đánh dấu ưu tiên cấp cứu">
                            Cấp cứu
                          </button>
                        }
                        <button class="btn btn-sm btn-secondary" (click)="openTransferModal(t)" title="Chuyển sang phòng khác để giảm tải">
                          Chuyển phòng
                        </button>
                        <button class="icon-btn danger" (click)="openCancelModal(t)" title="Hủy số khám" aria-label="Hủy số khám">
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Đang làm xét nghiệm -->
            @if (activeTab === 'WAITING_FOR_RESULTS') {
              <div class="tab-content-list">
                @if (filteredWaitingForResultsTickets().length === 0) {
                  <div class="empty-list-state">
                    <p>{{ listSearchQuery ? 'Không có bệnh nhân khớp bộ lọc' : 'Không có bệnh nhân đang làm xét nghiệm' }}</p>
                  </div>
                } @else {
                  @for (t of filteredWaitingForResultsTickets(); track t.id; let idx = $index) {
                    <div class="ticket-row-card waiting-lab-row">
                      <div class="row-order">
                        <span class="order-idx mono">{{ idx + 1 }}</span>
                        <span class="row-ticket-num mono">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          <span class="status warning">Chờ kết quả XN</span>
                        </div>
                        <div class="row-patient-meta">
                          <span class="mono">{{ t.patientPhone }}</span>
                          @if (t.patientDob) {
                            <span>NS {{ t.patientDob | date:'dd/MM/yyyy' }}</span>
                          }
                          <span>Đang làm xét nghiệm</span>
                        </div>
                      </div>
                      <div class="row-actions">
                        <span class="row-hint">Đang xử lý kết quả</span>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Nhỡ lượt -->
            @if (activeTab === 'SKIPPED') {
              <div class="tab-content-list">
                @if (filteredSkippedTickets().length === 0) {
                  <div class="empty-list-state">
                    <p>{{ listSearchQuery ? 'Không có lượt nhỡ khớp bộ lọc' : 'Không có lượt nhỡ' }}</p>
                  </div>
                } @else {
                  @for (t of filteredSkippedTickets(); track t.id) {
                    <div class="ticket-row-card skipped-row">
                      <div class="row-order">
                        <span class="row-ticket-num mono">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                          <span class="status">Vắng mặt</span>
                        </div>
                        <div class="row-patient-meta">
                          <span class="mono">{{ t.patientPhone }}</span>
                          <span>Lấy số <span class="mono">{{ t.checkInTime | slice:0:5 }}</span></span>
                        </div>
                        @if (t.notes) {
                          <div class="row-patient-note">{{ t.notes }}</div>
                        }
                      </div>
                      <div class="row-actions">
                        @if (isDoctor()) {
                          <button class="btn btn-sm btn-secondary" (click)="recallTicket(t.id)" title="Gọi lại số này">
                            Gọi lại
                          </button>
                        } @else {
                          <button class="btn btn-sm btn-secondary" (click)="requeueTicket(t.id)" title="Bệnh nhân đã quay lại: xếp lên đầu hàng chờ">
                            Đưa lại hàng đợi
                          </button>
                        }
                        <button class="btn btn-sm btn-secondary" (click)="openTransferModal(t)" title="Chuyển sang phòng khác">
                          Chuyển phòng
                        </button>
                        <button class="icon-btn danger" (click)="openCancelModal(t)" title="Hủy số khám" aria-label="Hủy số khám">
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }

            <!-- Đã khám -->
            @if (activeTab === 'COMPLETED') {
              <div class="tab-content-list">
                @if (filteredCompletedTickets().length === 0) {
                  <div class="empty-list-state">
                    <p>Chưa có lượt khám nào hoàn thành hôm nay</p>
                  </div>
                } @else {
                  @for (t of filteredCompletedTickets(); track t.id) {
                    <div class="ticket-row-card completed-row">
                      <div class="row-order">
                        <span class="row-ticket-num mono">{{ t.ticketNumber }}</span>
                      </div>
                      <div class="row-patient-details">
                        <div class="row-patient-name">
                          <strong>{{ t.patientName }}</strong>
                        </div>
                        <div class="row-patient-meta">
                          <span>Bắt đầu <span class="mono">{{ t.startTime }}</span></span>
                          <span>Xong <span class="mono">{{ t.endTime }}</span></span>
                        </div>
                      </div>
                      <div class="row-status">
                        <span class="status success">Hoàn tất</span>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal chuyển phòng -->
      @if (showTransferModal() && activeTransferTicket()) {
        <div class="modal-backdrop" (click)="closeTransferModal()">
          <div class="modal-dialog" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Chuyển phòng khám</h2>
              <button class="modal-close-btn" (click)="closeTransferModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="ticket-info-summary">
                <div class="summary-num mono">{{ activeTransferTicket()?.ticketNumber }}</div>
                <div class="summary-details">
                  <div class="summary-name">{{ activeTransferTicket()?.patientName }}</div>
                  <div class="summary-sub">
                    Phòng hiện tại: {{ activeTransferTicket()?.roomNumber }} - {{ activeTransferTicket()?.roomName }}
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label required">Phòng chuyển đến</label>
                <select [(ngModel)]="targetRoomId" class="form-control" required>
                  @for (r of rooms(); track r.id) {
                    @if (r.id !== activeTransferTicket()?.examinationRoomId) {
                      <option [ngValue]="r.id">
                        {{ r.roomNumber }} - {{ r.roomName }} (đang chờ {{ getRoomWaitingCount(r.id) }})
                      </option>
                    }
                  }
                </select>
                <small class="form-hint">Nên chọn phòng ít người chờ để cân bằng thời gian chờ.</small>
              </div>

              <div class="form-group">
                <label class="form-label">Lý do</label>
                <input
                  type="text"
                  [(ngModel)]="transferReason"
                  placeholder="Ví dụ: giảm tải, đúng chuyên khoa, bác sĩ yêu cầu"
                  class="form-control"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeTransferModal()">Hủy</button>
              <button
                class="btn btn-primary"
                [disabled]="submittingTransfer() || !targetRoomId"
                (click)="confirmTransferTicket()"
              >
                @if (submittingTransfer()) {
                  <span class="spinner-sm"></span> Đang chuyển...
                } @else {
                  Chuyển phòng
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal hủy lượt khám -->
      @if (showCancelModal() && activeCancelTicket()) {
        <div class="modal-backdrop" (click)="closeCancelModal()">
          <div class="modal-dialog modal-sm-custom" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Hủy lượt khám</h2>
              <button class="modal-close-btn" (click)="closeCancelModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <p class="cancel-prompt">
                Hủy số <strong class="mono">{{ activeCancelTicket()?.ticketNumber }}</strong> của bệnh nhân <strong>{{ activeCancelTicket()?.patientName }}</strong>?
              </p>
              <div class="form-group">
                <label class="form-label">Lý do hủy</label>
                <input
                  type="text"
                  [(ngModel)]="cancelReason"
                  placeholder="Ví dụ: bệnh nhân xin về, trùng số"
                  class="form-control"
                />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeCancelModal()">Quay lại</button>
              <button
                class="btn btn-danger"
                [disabled]="submittingCancel()"
                (click)="confirmCancelTicket()"
              >
                @if (submittingCancel()) {
                  <span class="spinner-sm"></span> Đang hủy...
                } @else {
                  Hủy lượt khám
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal ưu tiên cấp cứu -->
      @if (showEmergencyModal() && activeEmergencyTicket()) {
        <div class="modal-backdrop" (click)="closeEmergencyModal()">
          <div class="modal-dialog modal-emergency-custom" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">Ưu tiên cấp cứu</h2>
              <button class="modal-close-btn" (click)="closeEmergencyModal()" aria-label="Đóng">×</button>
            </div>
            <div class="modal-body">
              <div class="ticket-info-summary">
                <div class="summary-num mono">{{ activeEmergencyTicket()?.ticketNumber }}</div>
                <div class="summary-details">
                  <div class="summary-name">{{ activeEmergencyTicket()?.patientName }}</div>
                  <div class="summary-sub">
                    <span class="mono">{{ activeEmergencyTicket()?.patientPhone }}</span>
                    @if (activeEmergencyTicket()?.patientDob) {
                      <span> · NS {{ activeEmergencyTicket()?.patientDob | date:'dd/MM/yyyy' }}</span>
                    }
                  </div>
                  <div class="summary-sub">
                    Phòng {{ activeEmergencyTicket()?.roomNumber }} - {{ activeEmergencyTicket()?.roomName }}
                  </div>
                </div>
              </div>

              <div class="emergency-warning-box">
                <ul class="warning-list">
                  <li>Cộng 100 điểm ưu tiên, đưa bệnh nhân lên đầu danh sách chờ.</li>
                  <li>Hiển thị nhãn "Cấp cứu" trên màn hình gọi số của bác sĩ và TV sảnh chờ.</li>
                  <li>Bác sĩ sẽ gọi bệnh nhân này ở lượt kế tiếp.</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeEmergencyModal()">Hủy</button>
              <button
                class="btn btn-danger"
                [disabled]="submittingEmergency()"
                (click)="confirmEmergency()"
              >
                @if (submittingEmergency()) {
                  <span class="spinner-sm"></span> Đang xử lý...
                } @else {
                  Xác nhận cấp cứu
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Chọn phòng */
    .room-filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 16px;
      margin-bottom: 16px;
    }

    .room-filter-left,
    .room-filter-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .room-filter-label {
      font-size: 13px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .room-filter-select {
      height: 34px;
      min-width: 320px;
      padding: 0 8px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
    }

    .room-filter-select:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .room-filter-static {
      font-weight: 500;
      color: var(--text-main);
    }

    .room-stat {
      font-size: 13px;
      color: var(--text-muted);
    }

    .room-stat strong {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }

    .spin-active {
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Bố cục chính */
    .console-grid {
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
    }

    .active-stage-card { overflow: hidden; }

    .stage-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .doctor-badge {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 14px;
    }

    .doctor-badge .text-muted { font-size: 13px; }
    .doctor-badge strong { font-weight: 600; }

    .specialty-sub {
      font-size: 13px;
      color: var(--text-muted);
    }

    .queue-quick-stats {
      display: flex;
      gap: 24px;
      margin: 10px 0 0;
    }

    .queue-quick-stats dt {
      font-size: 12px;
      color: var(--text-muted);
    }

    .queue-quick-stats dd {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: var(--text-main);
    }

    .call-action-box {
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .btn-call-next { width: 100%; }

    .call-subtitle {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-muted);
      text-align: center;
    }

    .call-subtitle strong { color: var(--text-main); font-weight: 600; }

    .call-note {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }

    .status-panels-row {
      display: flex;
      flex-direction: column;
    }

    .ticket-status-panel + .ticket-status-panel {
      border-top: 1px solid var(--border-color);
    }

    .ticket-status-panel .panel-header {
      padding: 10px 16px;
      background: var(--bg-subtle);
    }

    .ticket-status-panel .panel-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .ticket-status-panel .panel-body { padding: 14px 16px; }

    .ticket-num {
      font-size: 28px;
      font-weight: 600;
      color: var(--text-main);
      line-height: 1.2;
    }

    .patient-name {
      font-size: 15px;
      font-weight: 500;
      color: var(--text-main);
      margin-top: 2px;
    }

    .patient-info-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .panel-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 12px;
    }

    .panel-empty {
      padding: 12px 0;
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Danh sách hàng đợi */
    .queue-list-card {
      display: flex;
      flex-direction: column;
      min-height: 420px;
      overflow: hidden;
    }

    .queue-tabs {
      display: flex;
      gap: 4px;
      padding: 0 12px;
      border-bottom: 1px solid var(--border-color);
      overflow-x: auto;
    }

    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 12px 8px 10px;
      border: none;
      border-bottom: 2px solid transparent;
      background: transparent;
      font: inherit;
      font-size: 14px;
      color: var(--text-muted);
      cursor: pointer;
      white-space: nowrap;
      transition: color 0.12s ease, border-color 0.12s ease;
    }

    .tab-btn:hover { color: var(--text-main); }

    .tab-btn.active {
      color: var(--primary-600);
      border-bottom-color: var(--primary-600);
      font-weight: 500;
    }

    .tab-count {
      min-width: 20px;
      padding: 0 6px;
      border-radius: var(--radius-full);
      background: var(--bg-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      line-height: 18px;
      text-align: center;
    }

    .tab-btn.active .tab-count {
      background: var(--primary-50);
      color: var(--primary-700);
    }

    .list-search-bar {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color);
    }

    .search-field-sm {
      position: relative;
      max-width: 360px;
    }

    .search-field-sm i {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-light);
      font-size: 13px;
    }

    .search-input-sm {
      width: 100%;
      height: 32px;
      padding: 0 28px 0 30px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 13px;
      outline: none;
    }

    .search-input-sm:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .clear-sm {
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
    }

    .tab-content-list {
      flex: 1;
      overflow-y: auto;
      max-height: calc(100vh - 300px);
    }

    .empty-list-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 13px;
    }

    .ticket-row-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border-color);
      transition: background-color 0.12s ease;
    }

    .ticket-row-card:hover { background: var(--bg-hover); }
    .ticket-row-card:last-child { border-bottom: none; }
    .ticket-row-card.emergency-row { box-shadow: inset 3px 0 0 var(--danger-solid); }

    .row-order {
      display: flex;
      align-items: baseline;
      gap: 10px;
      min-width: 110px;
    }

    .order-idx {
      width: 20px;
      font-size: 12px;
      color: var(--text-light);
      text-align: right;
    }

    .row-ticket-num {
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }

    .skipped-row .row-ticket-num,
    .completed-row .row-ticket-num { color: var(--text-muted); }

    .row-patient-details {
      flex: 1;
      min-width: 0;
    }

    .row-patient-name {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .row-patient-name strong { font-weight: 500; }

    .row-patient-meta {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .row-patient-note {
      font-size: 12px;
      color: var(--text-secondary);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .row-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .row-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Modal */
    .ticket-info-summary {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 12px;
      margin-bottom: 16px;
      border: 1px solid var(--border-color);
      background: var(--bg-subtle);
      border-radius: var(--radius-md);
    }

    .summary-num {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
    }

    .summary-name {
      font-weight: 500;
      color: var(--text-main);
    }

    .summary-sub {
      font-size: 13px;
      color: var(--text-muted);
    }

    .form-hint {
      font-size: 12px;
      color: var(--text-muted);
    }

    .modal-sm-custom { max-width: 440px; }
    .modal-emergency-custom { max-width: 500px; }

    .cancel-prompt {
      margin-bottom: 12px;
      color: var(--text-secondary);
    }

    .emergency-warning-box {
      padding: 10px 12px;
      border: 1px solid var(--warning-border);
      background: var(--warning-bg);
      border-radius: var(--radius-md);
      font-size: 13px;
      color: var(--warning-text);
    }

    .warning-list {
      margin: 0;
      padding-left: 18px;
    }

    .warning-list li + li { margin-top: 2px; }

    @media (max-width: 1100px) {
      .console-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .page { padding: 16px; }
      .room-filter-select { min-width: 0; width: 100%; }
      .room-filter-left { flex: 1; }
      .ticket-row-card { flex-wrap: wrap; }
      .row-actions { width: 100%; justify-content: flex-end; }
    }
  `]})
export class QueueControlComponent implements OnInit, OnDestroy {
  private readonly queueService = inject(QueueService);
  private readonly scheduleService = inject(ScheduleService);
  readonly authService = inject(AuthService);

  readonly isDoctor = computed(() => this.authService.hasRole('DOCTOR'));
  readonly isStaff = computed(() => this.authService.hasRole('STAFF'));

  readonly rooms = signal<ExaminationRoom[]>([]);
  readonly selectedRoomId = signal<number>(0);
  readonly selectedFloor = signal<number | null>(null);

  readonly selectedRoom = computed(() => {
    return this.rooms().find(r => r.id === this.selectedRoomId()) || null;
  });

  readonly availableFloors = computed(() => {
    const list = this.rooms().map(r => r.floor);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  });

  getRoomsByFloor(floor: number): ExaminationRoom[] {
    return this.rooms().filter(r => r.floor === floor);
  }

  prevRoom(): void {
    const all = this.rooms();
    if (all.length === 0) return;
    const currIdx = all.findIndex(r => r.id === this.selectedRoomId());
    if (currIdx > 0) {
      this.selectRoom(all[currIdx - 1].id);
    } else {
      this.selectRoom(all[all.length - 1].id);
    }
  }

  nextRoom(): void {
    const all = this.rooms();
    if (all.length === 0) return;
    const currIdx = all.findIndex(r => r.id === this.selectedRoomId());
    if (currIdx < all.length - 1) {
      this.selectRoom(all[currIdx + 1].id);
    } else {
      this.selectRoom(all[0].id);
    }
  }

  readonly overview = signal<RoomQueueOverview | null>(null);

  readonly loading = signal(true);
  readonly calling = signal(false);
  // Thông báo khi bác sĩ không có ca trực hôm nay (không có phòng để gọi số)
  readonly myRoomError = signal<string | null>(null);

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

  activeTab: 'WAITING' | 'RESULTS_READY' | 'WAITING_FOR_RESULTS' | 'SKIPPED' | 'COMPLETED' = 'WAITING';
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
    // Bác sĩ chỉ cần hàng đợi phòng mình trực; danh sách phòng chỉ tải khi cần chuyển phòng
    if (this.isDoctor()) {
      this.loadMyRoom(true);
      return;
    }

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

  // Bác sĩ luôn làm việc tại phòng mình có ca trực hôm nay, không được chọn phòng khác
  private loadMyRoom(showLoading: boolean): void {
    if (showLoading) this.loading.set(true);
    this.queueService.getMyRoomQueue().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.selectedRoomId.set(res.data.examinationRoomId);
          this.overview.set(res.data);
          this.myRoomError.set(null);
        }
        if (showLoading) this.loading.set(false);
      },
      error: err => {
        this.selectedRoomId.set(0);
        this.overview.set(null);
        this.myRoomError.set(err.error?.message || 'Hôm nay bạn không có ca trực tại phòng khám nào');
        if (showLoading) this.loading.set(false);
      }
    });
  }

  loadDisplayBoardCounts(): void {
    // Số người chờ của các phòng khác chỉ phục vụ quầy điều phối
    if (this.isDoctor()) return;
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

  // Bác sĩ đếm ngay trên hàng đợi phòng mình, không cần bảng tổng hợp các phòng
  currentRoomWaitingCount(): number {
    if (this.isDoctor()) {
      return this.overview()?.waitingTickets?.length || 0;
    }
    return this.getRoomWaitingCount(this.selectedRoomId());
  }

  selectRoom(roomId: number): void {
    this.selectedRoomId.set(roomId);
    this.fetchOverview(true);
  }

  fetchOverview(showLoading = true): void {
    if (this.isDoctor()) {
      this.loadMyRoom(showLoading);
      return;
    }
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
    } catch { }
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

  requeueTicket(ticketId: number): void {
    this.queueService.requeueTicket(ticketId).subscribe({
      next: res => {
        this.showAlert(`Đã đưa số ${res.data?.ticketNumber} trở lại hàng đợi, bác sĩ sẽ gọi ở lượt tiếp theo`, 'success');
        this.fetchOverview(false);
        this.loadDisplayBoardCounts();
      },
      error: err => this.showAlert(err.error?.message || 'Lỗi khi đưa lại hàng đợi', 'danger')
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
    // Bác sĩ không tải danh sách phòng khi mở màn, chỉ tải lần đầu cần chuyển phòng
    if (this.rooms().length === 0) {
      this.scheduleService.getAllRooms().subscribe({
        next: res => {
          if (res.success && res.data && res.data.length > 0) {
            this.rooms.set(res.data);
            this.openTransferModal(ticket);
          }
        },
        error: err => this.showAlert(err.error?.message || 'Không tải được danh sách phòng khám', 'danger')
      });
      return;
    }
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

  filteredResultsReadyTickets(): QueueTicket[] {
    const tickets = this.overview()?.resultsReadyTickets || [];
    const q = this.listSearchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(t =>
      t.ticketNumber.toLowerCase().includes(q) ||
      t.patientName.toLowerCase().includes(q) ||
      (t.patientPhone && t.patientPhone.includes(q))
    );
  }

  filteredWaitingForResultsTickets(): QueueTicket[] {
    const tickets = this.overview()?.waitingForResultsTickets || [];
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
