import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleService } from '../../services/schedule.service';
import { SpecialtyService } from '../../services/specialty.service';
import { DoctorService } from '../../services/doctor.service';
import { AuthService } from '../../services/auth.service';
import { ExaminationRoom, WorkSchedule, WorkScheduleRequest, BatchWorkScheduleRequest, BatchWorkScheduleResponse } from '../../models/schedule.model';
import { Specialty } from '../../models/specialty.model';
import { toIsoDate, addDays } from '../../utils/date.utils';
import { forkJoin, of } from 'rxjs';

const NO_SCHEDULES: WorkSchedule[] = [];

// Thứ Hai của tuần chứa ngày đã cho
function mondayOf(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function lastOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="schedules-page">
      <!-- Header Banner -->
      <div class="page-header">
        <div class="header-left">
          <div class="header-badge">
            <i class="bi" [ngClass]="isAdmin() ? 'bi-calendar-check-fill' : 'bi-calendar-week-fill'"></i>
            {{ isAdmin() ? 'Tầng Kế Hoạch & Xếp Lịch' : 'Lịch Trực Ca Bác Sĩ' }}
          </div>
          <h1 class="page-title">{{ isAdmin() ? 'Quản Lý Lịch Làm Việc' : 'Lịch Trực Của Tôi' }}</h1>
          <p class="page-subtitle">
            {{ isAdmin() 
              ? 'Phân bổ ca trực theo chuyên khoa, kiểm tra tự động xung đột trùng giờ bác sĩ & phòng khám' 
              : 'Theo dõi các ca trực được phân công cho bạn, phòng khám và số lượng bệnh nhân tiếp nhận theo ca' }}
          </p>
        </div>
        @if (isAdmin()) {
          <div class="header-actions">
            <div class="view-toggle" role="tablist">
              <button type="button" class="view-toggle-btn" [class.active]="viewMode() === 'MONTH'" (click)="setViewMode('MONTH')">
                <i class="bi bi-calendar3"></i> Tháng
              </button>
              <button type="button" class="view-toggle-btn" [class.active]="viewMode() === 'ROSTER'" (click)="setViewMode('ROSTER')">
                <i class="bi bi-grid-3x3-gap-fill"></i> Tuần
              </button>
              <button type="button" class="view-toggle-btn" [class.active]="viewMode() === 'LIST'" (click)="setViewMode('LIST')">
                <i class="bi bi-list-ul"></i> Danh sách
              </button>
            </div>
            <button class="btn btn-primary" [disabled]="openingForm()" (click)="openAddModal()">
              @if (openingForm()) {
                <span class="spinner-sm"></span> Đang tải dữ liệu...
              } @else {
                <i class="bi bi-calendar-plus-fill"></i> Đăng Ký Ca Trực
              }
            </button>
          </div>
        }
      </div>

      <!-- Feedback Alerts (Top-Right Floating Toast) -->
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

      @if (isAdmin() && viewMode() === 'ROSTER') {
      <!-- Bảng phân ca theo tuần: hàng = phòng khám, cột = ngày, mỗi ô gồm 3 ca -->
      <div class="roster-card">
        <div class="roster-toolbar">
          <div class="week-nav">
            <button type="button" class="btn btn-outline btn-sm" (click)="shiftWeek(-1)" title="Tuần trước" aria-label="Tuần trước">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="isCurrentWeek()" (click)="goToCurrentWeek()">Tuần này</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="shiftWeek(1)" title="Tuần sau" aria-label="Tuần sau">
              <i class="bi bi-chevron-right"></i>
            </button>
            <span class="week-label">{{ weekLabel() }}</span>
          </div>
          <div class="roster-summary">
            <span class="sum-chip sum-filled"><i class="bi bi-person-check-fill"></i> {{ rosterStats().filled }} ca đã xếp</span>
            <span class="sum-chip sum-empty"><i class="bi bi-exclamation-circle-fill"></i> {{ rosterStats().empty }} ca còn trống</span>
          </div>
        </div>

        @if (weekLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải bảng phân ca...</p>
          </div>
        } @else if (rooms().length === 0) {
          <div class="empty-state">
            <i class="bi bi-door-closed"></i>
            <h3>Chưa có phòng khám nào</h3>
            <p>Hãy thêm phòng khám trước khi xếp lịch trực.</p>
          </div>
        } @else {
          <div class="roster-scroll">
            <table class="roster-table">
              <thead>
                <tr>
                  <th class="roster-room-col">Phòng khám</th>
                  @for (day of weekDays(); track day.iso) {
                    <th [class.is-today]="day.isToday" [class.is-past]="day.isPast">
                      <span class="day-name">{{ day.weekday }}</span>
                      <span class="day-date">{{ day.short }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (room of rooms(); track room.id) {
                  <tr>
                    <th class="roster-room-col">
                      <span class="room-badge">{{ room.roomNumber }}</span>
                      <span class="roster-room-name">{{ room.roomName }}</span>
                    </th>
                    @for (day of weekDays(); track day.iso) {
                      <td [class.is-today]="day.isToday" [class.is-past]="day.isPast">
                        @for (shift of shiftSlots; track shift.key) {
                          @let items = slotSchedules(room.id, day.iso, shift.key);
                          @if (items.length > 0) {
                            @for (s of items; track s.id) {
                              <button type="button" class="slot slot-filled" [ngClass]="shift.css" [class.slot-new]="s.id === highlightId()"
                                      [disabled]="day.isPast || openingForm()" (click)="openEditModal(s)"
                                      [title]="shift.label + ' ' + day.short + ' · ' + s.doctorName + ' (' + s.specialtyName + ')' + (day.isPast ? '' : ' · Bấm để sửa')">
                                <span class="slot-shift">{{ shift.label }}</span>
                                <span class="slot-doctor">{{ s.doctorName }}</span>
                                <span class="slot-meta">{{ s.startTime.substring(0, 5) }}–{{ s.endTime.substring(0, 5) }} · {{ s.currentBookedCount }}/{{ s.maxPatients }}</span>
                              </button>
                            }
                          } @else if (day.isPast) {
                            <div class="slot slot-past">
                              <span class="slot-shift">{{ shift.label }}</span>
                              <span class="slot-none">—</span>
                            </div>
                          } @else {
                            <button type="button" class="slot slot-empty" [disabled]="openingForm()"
                                    (click)="openSlot(room.id, day.iso, shift.key)"
                                    [title]="'Xếp ca ' + shift.label + ' ' + day.short + ' tại ' + room.roomNumber">
                              <span class="slot-shift">{{ shift.label }}</span>
                              <span class="slot-add"><i class="bi bi-plus-lg"></i> Trống</span>
                            </button>
                          }
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="roster-legend">
            <span><i class="legend-dot shift-morning"></i> Ca sáng 07:30–12:00</span>
            <span><i class="legend-dot shift-afternoon"></i> Ca chiều 13:30–17:30</span>
            <span><i class="legend-dot shift-evening"></i> Ca tối 18:00–21:00</span>
            <span><i class="legend-dot legend-empty"></i> Ô trống: bấm để xếp ca</span>
            <span><i class="bi bi-pencil-square"></i> Ca đã xếp: bấm để sửa</span>
          </div>
        }
      </div>
      } @else if (isAdmin() && viewMode() === 'MONTH') {
      <!-- Tổng quan tháng: mỗi ngày hiện số ca đã có người / tổng số ca (phòng × 3 ca) -->
      <div class="roster-card">
        <div class="roster-toolbar">
          <div class="week-nav">
            <button type="button" class="btn btn-outline btn-sm" (click)="shiftMonth(-1)" title="Tháng trước" aria-label="Tháng trước">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button type="button" class="btn btn-outline btn-sm" [disabled]="isCurrentMonth()" (click)="goToCurrentMonth()">Tháng này</button>
            <button type="button" class="btn btn-outline btn-sm" (click)="shiftMonth(1)" title="Tháng sau" aria-label="Tháng sau">
              <i class="bi bi-chevron-right"></i>
            </button>
            <span class="week-label">{{ monthLabel() }}</span>
          </div>
          <div class="roster-summary">
            <span class="sum-chip sum-filled"><i class="bi bi-person-check-fill"></i> {{ monthStats().filled }} ca đã xếp</span>
            <span class="sum-chip sum-empty"><i class="bi bi-exclamation-circle-fill"></i> {{ monthStats().empty }} ca còn trống</span>
          </div>
        </div>

        @if (monthLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải lịch tháng...</p>
          </div>
        } @else {
          <div class="month-grid">
            @for (label of monthWeekdayLabels; track label) {
              <div class="month-head">{{ label }}</div>
            }
            @for (cell of monthCells(); track cell.iso) {
              <button type="button" class="month-cell" [ngClass]="cell.coverage"
                      [class.out-month]="!cell.inMonth" [class.is-today]="cell.isToday"
                      [disabled]="!cell.inMonth" (click)="openWeekOf(cell.iso)"
                      [title]="cell.inMonth ? 'Xem bảng phân ca tuần chứa ngày ' + cell.label : ''">
                <span class="month-day">{{ cell.day }}</span>
                @if (cell.inMonth) {
                  <span class="month-count">{{ cell.filled }}/{{ cell.total }} ca</span>
                  <span class="month-bar"><span [style.width.%]="cell.total ? (cell.filled / cell.total) * 100 : 0"></span></span>
                }
              </button>
            }
          </div>

          <div class="roster-legend">
            <span><i class="legend-dot cov-full"></i> Đủ người trực</span>
            <span><i class="legend-dot cov-partial"></i> Thiếu một vài ca</span>
            <span><i class="legend-dot cov-low"></i> Thiếu nhiều ca</span>
            <span><i class="bi bi-hand-index"></i> Bấm vào ngày để xếp chi tiết theo tuần</span>
          </div>
        }
      </div>
      } @else {

      <!-- Filters Bar -->
      <div class="filters-card">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-calendar3"></i> Từ ngày</label>
            <input type="date" [(ngModel)]="filterStartDate" (change)="loadSchedules()" class="form-control" />
          </div>
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-calendar3"></i> Đến ngày</label>
            <input type="date" [(ngModel)]="filterEndDate" (change)="loadSchedules()" class="form-control" />
          </div>
          @if (isAdmin()) {
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-door-open"></i> Phòng khám</label>
            <select [(ngModel)]="filterRoomId" (change)="loadSchedules()" class="form-control">
              <option [ngValue]="null">-- Tất cả phòng khám --</option>
              @for (room of rooms(); track room.id) {
                <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }}</option>
              }
            </select>
          </div>
          <div class="filter-item">
            <label class="filter-label"><i class="bi bi-diagram-3"></i> Chuyên khoa</label>
            <select [(ngModel)]="filterSpecialtyId" (change)="loadSchedules()" class="form-control">
              <option [ngValue]="null">-- Tất cả chuyên khoa --</option>
              @for (spec of specialties(); track spec.id) {
                <option [ngValue]="spec.id">{{ spec.name }}</option>
              }
            </select>
          </div>
          }
        </div>

        <div class="filter-actions">
          <button class="btn btn-outline btn-sm" (click)="resetFilters()">
            <i class="bi bi-arrow-counterclockwise"></i> Đặt lại bộ lọc
          </button>
        </div>
      </div>

      <!-- Stats Summary Strip -->
      <div class="stats-strip">
        <div class="stat-box">
          <span class="stat-number">{{ schedules().length }}</span>
          <span class="stat-label">Tổng ca làm việc</span>
        </div>
        <div class="stat-box stat-available">
          <span class="stat-number">{{ listStats().available }}</span>
          <span class="stat-label">Chỗ khám còn trống</span>
        </div>
        <div class="stat-box stat-booked">
          <span class="stat-number">{{ listStats().booked }}</span>
          <span class="stat-label">Đã được đặt trước</span>
        </div>
      </div>

      <!-- Schedules Table -->
      <div class="table-container">
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách ca làm việc...</p>
          </div>
        } @else if (schedules().length === 0) {
          <div class="empty-state">
            <i class="bi bi-calendar-x"></i>
            <h3>Không có ca làm việc nào phù hợp</h3>
            <p>Hãy thay đổi bộ lọc hoặc đăng ký ca trực mới cho bác sĩ.</p>
          </div>
        } @else {
          <table class="data-table">
            <thead>
              <tr>
                <th>Ngày & Giờ</th>
                <th>Ca trực</th>
                <th>Bác sĩ phụ trách</th>
                <th>Phòng khám</th>
                <th>Lượng bệnh nhân (Đã đặt / Tối đa)</th>
                <th>Trạng thái</th>
                @if (isAdmin()) {
                  <th class="text-right">Thao tác</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (item of paginatedSchedules(); track item.id) {
                <tr [class.row-cancelled]="item.status === 'CANCELLED'">
                  <td>
                    <div class="date-col">
                      <span class="work-date">{{ item.workDate }}</span>
                      <span class="work-time"><i class="bi bi-clock"></i> {{ item.startTime }} - {{ item.endTime }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getShiftBadgeClass(item.shiftType)">
                      {{ item.shiftType }}
                    </span>
                  </td>
                  <td>
                    <div class="doctor-col">
                      <strong>{{ item.doctorName }}</strong>
                      <span class="doctor-sub">{{ item.academicTitle || 'Bác sĩ' }} • {{ item.specialtyName }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="room-col">
                      <span class="room-badge">{{ item.roomNumber }}</span>
                      <span class="room-desc">{{ item.roomName }} (Tầng {{ item.floor }})</span>
                    </div>
                  </td>
                  <td>
                    <div class="capacity-col">
                      <div class="capacity-label">
                        <span>{{ item.currentBookedCount }} / {{ item.maxPatients }}</span>
                        <small>Còn {{ item.remainingSlots }} chỗ</small>
                      </div>
                      <div class="progress-bar-bg">
                        <div
                          class="progress-bar-fill"
                          [style.width.%]="(item.currentBookedCount / item.maxPatients) * 100"
                          [ngClass]="getCapacityColorClass(item.currentBookedCount, item.maxPatients)"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" [ngClass]="getStatusBadgeClass(item.status)">
                      {{ getStatusDisplayName(item.status) }}
                    </span>
                  </td>
                  @if (isAdmin()) {
                    <td class="text-right">
                      <div class="row-actions">
                        @if (item.status !== 'CANCELLED' && item.workDate >= todayIso) {
                          <button class="btn btn-sm btn-outline" [disabled]="openingForm()" (click)="openEditModal(item)" title="Sửa ca trực">
                            <i class="bi bi-pencil-square"></i> Sửa
                          </button>
                        }
                        @if (item.status !== 'CANCELLED') {
                          <button class="btn btn-sm btn-outline-warning" (click)="cancelSchedule(item)" title="Hủy ca trực">
                            <i class="bi bi-x-circle"></i> Hủy
                          </button>
                        }
                        <button class="btn btn-sm btn-outline-danger" (click)="deleteSchedule(item)" title="Xóa ca">
                          <i class="bi bi-trash3"></i>
                        </button>
                      </div>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>

          <!-- CLEAR & POWERFUL PAGINATION BAR -->
          <div class="pagination-footer">
            <div class="pagination-info">
              <span>
                Hiển thị <strong>{{ startIndex() }} - {{ endIndex() }}</strong> trên tổng số <strong>{{ schedules().length }}</strong> ca trực
              </span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng/trang:</label>
                <select
                  id="pageSizeSelect"
                  [ngModel]="pageSize()"
                  (ngModelChange)="onPageSizeChange($event)"
                  class="form-select-sm"
                >
                  @for (opt of pageSizeOptions; track opt) {
                    <option [ngValue]="opt">{{ opt }}</option>
                  }
                </select>
              </div>
            </div>

            <!-- Pagination Navigation Buttons -->
            <div class="pagination-controls">
              <button
                class="btn-page btn-page-nav"
                [disabled]="currentPage() === 1"
                (click)="goToPage(1)"
                title="Về trang đầu tiên"
              >
                <i class="bi bi-chevron-double-left"></i>
              </button>

              <button
                class="btn-page btn-page-nav"
                [disabled]="currentPage() === 1"
                (click)="prevPage()"
                title="Trang trước"
              >
                <i class="bi bi-chevron-left"></i> Trước
              </button>

              <!-- Page Number Pills -->
              <div class="page-numbers-group">
                @for (p of pagesList(); track p) {
                  <button
                    class="btn-page btn-page-num"
                    [class.active]="currentPage() === p"
                    (click)="goToPage(p)"
                  >
                    {{ p }}
                  </button>
                }
              </div>

              <button
                class="btn-page btn-page-nav"
                [disabled]="currentPage() === totalPages()"
                (click)="nextPage()"
                title="Trang sau"
              >
                Sau <i class="bi bi-chevron-right"></i>
              </button>

              <button
                class="btn-page btn-page-nav"
                [disabled]="currentPage() === totalPages()"
                (click)="goToPage(totalPages())"
                title="Đến trang cuối cùng"
              >
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>
      }

      <!-- Modal Thêm Ca Làm Việc Mới -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">
                <i class="bi" [ngClass]="editingSchedule() ? 'bi-pencil-square' : 'bi-calendar-plus'"></i>
                {{ editingSchedule() ? 'Cập Nhật Ca Làm Việc' : 'Đăng Ký Ca Làm Việc Bác Sĩ' }}
              </h2>
              <button class="modal-close-btn" (click)="closeModal()">×</button>
            </div>

            @if (batchResult()) {
              <!-- Summary Report after Batch Execution -->
              <div class="modal-body">
                <div class="batch-result-header">
                  <div class="result-icon" [ngClass]="batchResult()!.successCount > 0 ? 'icon-success' : 'icon-warning'">
                    <i class="bi" [ngClass]="batchResult()!.successCount > 0 ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'"></i>
                  </div>
                  <h3 class="result-title">Kết Quả Đăng Ký Lịch Làm Việc</h3>
                  <p class="result-desc">Tổng số ngày theo lịch: <strong>{{ batchResult()!.totalRequested }} ngày</strong></p>
                </div>

                <div class="result-stats-row">
                  <div class="result-stat-box stat-box-green">
                    <span class="result-number">{{ batchResult()!.successCount }}</span>
                    <span class="result-label">Ca trực tạo thành công</span>
                  </div>
                  <div class="result-stat-box stat-box-amber">
                    <span class="result-number">{{ batchResult()!.conflictCount }}</span>
                    <span class="result-label">Ngày bị trùng lịch (Đã bỏ qua)</span>
                  </div>
                </div>

                @if (batchResult()!.conflictMessages.length > 0) {
                  <div class="conflict-list-container">
                    <h4 class="conflict-list-title"><i class="bi bi-info-circle-fill"></i> Chi tiết các ngày bị trùng lịch đã được bỏ qua:</h4>
                    <ul class="conflict-ul">
                      @for (msg of batchResult()!.conflictMessages; track msg) {
                        <li><i class="bi bi-exclamation-circle text-amber"></i> {{ msg }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="closeBatchResult()">
                  <i class="bi bi-check-lg"></i> Đóng
                </button>
              </div>
            } @else {
              <!-- Form input -->
              <div class="modal-body">
                @if (editingSchedule(); as editing) {
                  <div class="edit-info-box">
                    <i class="bi bi-info-circle-fill"></i>
                    <div>
                      Đang sửa ca {{ editing.workDate | date:'dd/MM/yyyy' }} ({{ editing.startTime.substring(0, 5) }}–{{ editing.endTime.substring(0, 5) }})
                      tại {{ editing.roomNumber }}. Đã có <strong>{{ editing.currentBookedCount }}</strong> lịch hẹn.
                      @if (timeLocked()) {
                        <br />Ca đã có bệnh nhân đặt nên <strong>không đổi được ngày/giờ</strong>; đổi bác sĩ thì lịch hẹn chuyển sang bác sĩ mới.
                      }
                    </div>
                  </div>
                } @else {
                  <div class="mode-tabs">
                    <button type="button" class="mode-tab-btn" [class.active]="scheduleMode === 'SINGLE'" (click)="setScheduleMode('SINGLE')">
                      <i class="bi bi-calendar-event"></i> 1 Ngày
                    </button>
                    <button type="button" class="mode-tab-btn" [class.active]="scheduleMode === 'MULTI'" (click)="setScheduleMode('MULTI')">
                      <i class="bi bi-calendar-month"></i> Nhiều Ngày (Chọn Trên Lịch)
                    </button>
                  </div>
                }

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label required">Bác sĩ phụ trách</label>
                    <select [(ngModel)]="activeDoctorId" class="form-control" required>
                      <option [ngValue]="null">-- Chọn bác sĩ --</option>
                      @for (doc of doctorList(); track doc.id) {
                        @let busyRoom = doctorBusyRoom(doc.id);
                        <option [ngValue]="doc.id" [disabled]="!!busyRoom">
                          {{ doc.fullName }} ({{ doc.specialtyName }}){{ busyRoom ? ' — đang trực ' + busyRoom : '' }}
                        </option>
                      }
                    </select>
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label required">Phòng khám điều trị</label>
                    <select [(ngModel)]="activeRoomId" class="form-control" required>
                      <option [ngValue]="null">-- Chọn phòng khám --</option>
                      @for (room of rooms(); track room.id) {
                        @let busyDoctor = roomBusyDoctor(room.id);
                        <option [ngValue]="room.id" [disabled]="!!busyDoctor">
                          {{ room.roomNumber }} - {{ room.roomName }} (Tầng {{ room.floor }}){{ busyDoctor ? ' — ' + busyDoctor + ' đang trực' : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>
                @if (scheduleMode === 'SINGLE' && freeDoctorCount() === 0 && doctorList().length > 0) {
                  <div class="slot-warning">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    Tất cả bác sĩ đều đã có ca giao nhau với khung giờ này. Hãy chọn khung giờ khác.
                  </div>
                }

                @if (scheduleMode === 'SINGLE') {
                  <div class="form-group">
                    <label class="form-label required">Ngày làm việc</label>
                    <input type="date" [ngModel]="activeWorkDate" (ngModelChange)="onWorkDateChange($event)" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                }

                <!-- Chọn ca: chế độ 1 ngày hiện luôn tình trạng từng ca của phòng trong ngày đó -->
                <div class="availability-box">
                  <div class="availability-title">
                    <i class="bi bi-clock"></i>
                    @if (scheduleMode === 'SINGLE') {
                      Ca trực ngày {{ activeWorkDate | date:'dd/MM/yyyy' }} tại phòng đã chọn
                    } @else {
                      Ca trực áp dụng cho các ngày chọn bên dưới
                    }
                  </div>
                  @if (scheduleMode === 'SINGLE' && formChecking()) {
                    <div class="availability-loading"><span class="spinner-sm"></span> Đang kiểm tra lịch...</div>
                  } @else {
                    <div class="availability-chips">
                      @for (st of shiftOptions(); track st.key) {
                        <button type="button" class="avail-chip" [ngClass]="'avail-' + st.state"
                                [class.selected]="activeShiftKey() === st.key"
                                [disabled]="st.state !== 'free' || timeLocked()"
                                (click)="selectShift(st.key)">
                          <strong>Ca {{ st.label }} · {{ st.start }}–{{ st.end }}</strong>
                          <span>{{ st.note }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>

                @if (scheduleMode === 'MULTI') {
                  <!-- Lịch tháng của bác sĩ: tick từng ngày muốn xếp trực -->
                  <div class="availability-box">
                    <div class="month-picker-row">
                      <div class="week-nav">
                        <button type="button" class="btn btn-outline btn-sm" [disabled]="formMonthStart <= currentMonthIso" (click)="shiftFormMonth(-1)" title="Tháng trước" aria-label="Tháng trước">
                          <i class="bi bi-chevron-left"></i>
                        </button>
                        <strong class="week-label">{{ formMonthLabel() }}</strong>
                        <button type="button" class="btn btn-outline btn-sm" (click)="shiftFormMonth(1)" title="Tháng sau" aria-label="Tháng sau">
                          <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                      <div class="days-shortcuts">
                        <button type="button" class="btn-shortcut" (click)="selectFreeDates(false)">Chọn tất cả ngày trống</button>
                        <button type="button" class="btn-shortcut" (click)="selectFreeDates(true)">Chỉ T2 - T6</button>
                        <button type="button" class="btn-shortcut" (click)="clearDates()">Bỏ chọn</button>
                      </div>
                    </div>

                    @if (!activeDoctorId || !activeRoomId) {
                      <div class="availability-loading">Chọn bác sĩ và phòng khám để xem các ngày còn trống.</div>
                    } @else if (formChecking()) {
                      <div class="availability-loading"><span class="spinner-sm"></span> Đang kiểm tra lịch...</div>
                    } @else {
                      <div class="pick-grid">
                        @for (label of monthWeekdayLabels; track label) {
                          <div class="month-head">{{ label }}</div>
                        }
                        @for (cell of formMonthCells(); track cell.iso) {
                          @if (cell.state === 'out') {
                            <div class="pick-cell pick-out"></div>
                          } @else {
                            <button type="button" class="pick-cell" [ngClass]="'pick-' + cell.state" [class.selected]="cell.selected"
                                    [disabled]="cell.state !== 'free'" (click)="toggleDate(cell.iso)" [title]="cell.note">
                              <span class="pick-day">{{ cell.day }}</span>
                              @if (cell.selected) {
                                <i class="bi bi-check-circle-fill"></i>
                              } @else if (cell.state === 'doctor' || cell.state === 'room') {
                                <span class="pick-note">{{ cell.note }}</span>
                              }
                            </button>
                          }
                        }
                      </div>
                      <div class="pick-legend">
                        <span><i class="legend-dot pick-legend-selected"></i> Đã chọn</span>
                        <span><i class="legend-dot pick-legend-free"></i> Còn trống</span>
                        <span><i class="legend-dot pick-legend-doctor"></i> Bác sĩ đã có ca</span>
                        <span><i class="legend-dot pick-legend-room"></i> Phòng đã có người</span>
                      </div>
                      <div class="days-helper-text">
                        <i class="bi bi-info-circle"></i>
                        Đã chọn <strong>{{ selectedFreeDates().length }}</strong> ngày, ca {{ activeStartTime }}–{{ activeEndTime }}. Bấm vào ngày để chọn / bỏ chọn.
                      </div>
                    }
                  </div>
                }

                <div class="form-row">
                  <div class="form-group flex-1">
                    <label class="form-label required">Giờ bắt đầu</label>
                    <input type="time" [(ngModel)]="activeStartTime" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label required">Giờ kết thúc</label>
                    <input type="time" [(ngModel)]="activeEndTime" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                  <div class="form-group flex-1">
                    <label class="form-label required">Bệnh nhân tối đa / ca</label>
                    <input type="number" [(ngModel)]="activeMaxPatients" min="1" max="100" class="form-control" required />
                  </div>
                </div>
                <div class="days-helper-text">
                  <i class="bi bi-info-circle"></i> Sửa giờ bắt đầu / kết thúc nếu cần khung giờ khác 3 ca mặc định.
                </div>
              </div>

              <div class="modal-footer">
                <button class="btn btn-outline" (click)="closeModal()">Hủy bỏ</button>
                <button class="btn btn-primary" [disabled]="submitting() || !isFormValid()" (click)="saveSchedule()">
                  @if (submitting()) {
                    <span class="spinner-sm"></span> Đang kiểm tra & tạo lịch...
                  } @else {
                    <i class="bi bi-check-circle"></i> {{ editingSchedule() ? 'Lưu Thay Đổi' : scheduleMode === 'SINGLE' ? 'Xác Nhận Xếp Ca' : 'Xếp Ca Cho ' + selectedFreeDates().length + ' Ngày Đã Chọn' }}
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .schedules-page {
      padding: 1.5rem 0 3rem;
      max-width: 1250px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.75rem;
      background: var(--primary-100);
      color: var(--primary-800);
      font-size: 0.8rem;
      font-weight: 700;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
    }

    .page-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0 0 0.4rem;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      color: var(--text-muted);
      margin: 0;
      font-size: 1rem;
    }

    .filters-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      padding: 1.25rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 15px -3px rgba(15, 23, 42, 0.04);
    }

    .filters-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .filter-item {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .filter-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .filter-actions {
      display: flex;
      justify-content: flex-end;
    }

    .stats-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-box {
      background: #ffffff;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
    }

    .stat-number {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary-800);
      line-height: 1.1;
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 0.25rem;
    }

    .stat-available .stat-number {
      color: #059669;
    }

    .stat-booked .stat-number {
      color: #d97706;
    }

    /* Table */
    .table-container {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      overflow-x: auto;
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      text-align: left;
    }

    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-weight: 700;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .data-table td {
      padding: 0.95rem 1rem;
      border-bottom: 1px solid #f1f5f9;
      color: var(--text-main);
      vertical-align: middle;
    }

    .row-cancelled {
      opacity: 0.6;
      background: #fafafa;
    }

    .date-col {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .work-date {
      font-weight: 700;
      color: var(--text-main);
    }

    .work-time {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .doctor-col {
      display: flex;
      flex-direction: column;
    }

    .doctor-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .room-col {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .room-badge {
      font-family: monospace;
      font-weight: 700;
      background: var(--primary-50);
      color: var(--primary-700);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid var(--primary-200);
    }

    .room-desc {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .capacity-col {
      width: 180px;
    }

    .capacity-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
    }

    .progress-bar-bg {
      height: 6px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width 0.3s;
    }

    .cap-green { background: #10b981; }
    .cap-orange { background: #f59e0b; }
    .cap-red { background: #ef4444; }

    .badge-shift-morning {
      background: #e0f2fe;
      color: #0369a1;
      border: 1px solid #bae6fd;
    }

    .badge-shift-afternoon {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fde68a;
    }

    .badge-shift-evening {
      background: #f3e8ff;
      color: #7e22ce;
      border: 1px solid #e9d5ff;
    }

    .badge-status-available {
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
    }

    .badge-status-full {
      background: #fff7ed;
      color: #c2410c;
      border: 1px solid #ffedd5;
    }

    .badge-status-cancelled {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
    }

    .row-actions {
      display: flex;
      gap: 0.4rem;
      justify-content: flex-end;
    }

    .text-right { text-align: right; }

    /* View toggle */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .view-toggle {
      display: inline-flex;
      background: #f1f5f9;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 3px;
    }

    .view-toggle-btn {
      border: none;
      background: transparent;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.85rem;
      padding: 0.45rem 0.9rem;
      border-radius: calc(var(--radius-md) - 2px);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .view-toggle-btn.active {
      background: #ffffff;
      color: var(--primary-700);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
    }

    /* Weekly roster */
    .roster-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    .roster-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }

    .week-nav {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .week-label {
      font-weight: 700;
      color: var(--text-main);
      margin-left: 0.5rem;
    }

    .roster-summary {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .sum-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 0.3rem 0.7rem;
      border-radius: var(--radius-full);
    }

    .sum-filled { background: #ecfdf5; color: #047857; }
    .sum-empty { background: #fef2f2; color: #b91c1c; }

    /* Nhiều phòng: bảng cuộn trong khung, dòng ngày và cột phòng đứng yên */
    .roster-scroll {
      overflow: auto;
      max-height: 72vh;
    }

    .roster-table thead th {
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .roster-table .roster-room-col {
      position: sticky;
      left: 0;
      z-index: 1;
    }

    .roster-table thead .roster-room-col {
      z-index: 3;
    }

    .slot-new {
      animation: slot-pulse 1.2s ease-in-out 3;
      box-shadow: 0 0 0 2px #10b981;
    }

    @keyframes slot-pulse {
      0%, 100% { box-shadow: 0 0 0 2px #10b981; }
      50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.35); }
    }

    .roster-table {
      width: 100%;
      min-width: 980px;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .roster-table th,
    .roster-table td {
      border-bottom: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      padding: 0.5rem;
      vertical-align: top;
    }

    .roster-table thead th {
      background: #f8fafc;
      text-align: center;
      color: var(--text-muted);
      font-weight: 700;
    }

    .day-name { display: block; font-size: 0.85rem; }
    .day-date { display: block; font-size: 0.75rem; font-weight: 600; }

    .roster-table thead th.is-today {
      background: var(--primary-50);
      color: var(--primary-700);
    }

    .roster-table td.is-today { background: #fbfdff; }
    .roster-table td.is-past { background: #fafafa; }

    .roster-room-col {
      width: 140px;
      text-align: left;
      background: #f8fafc;
    }

    .roster-room-name {
      display: block;
      margin-top: 0.3rem;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .slot {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 52px;
      margin-bottom: 0.35rem;
      padding: 0.3rem 0.45rem;
      border-radius: 6px;
      border: 1px solid transparent;
      font-size: 0.75rem;
      text-align: left;
      line-height: 1.3;
    }

    .slot:last-child { margin-bottom: 0; }

    .slot-shift {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      opacity: 0.8;
    }

    .slot-doctor {
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slot-meta { font-size: 0.7rem; opacity: 0.85; }

    .slot-filled.shift-morning { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
    .slot-filled.shift-afternoon { background: #fef3c7; color: #b45309; border-color: #fde68a; }
    .slot-filled.shift-evening { background: #f3e8ff; color: #7e22ce; border-color: #e9d5ff; }

    .slot-empty {
      background: #ffffff;
      border: 1px dashed #fca5a5;
      color: #b91c1c;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
    }

    .slot-empty:hover:not(:disabled) {
      background: #fef2f2;
      border-color: #ef4444;
    }

    .slot-empty:disabled { cursor: wait; opacity: 0.6; }

    .slot-add { font-weight: 700; }

    .slot-past {
      background: #f8fafc;
      color: #94a3b8;
      border-color: #f1f5f9;
    }

    .slot-none { font-weight: 700; }

    .roster-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      padding: 0.85rem 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border-color);
    }

    .roster-legend span {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
      display: inline-block;
    }

    .legend-dot.shift-morning { background: #bae6fd; }
    .legend-dot.shift-afternoon { background: #fde68a; }
    .legend-dot.shift-evening { background: #e9d5ff; }
    .legend-dot.legend-empty { border: 1px dashed #ef4444; background: #ffffff; }

    /* Ca đã xếp là nút bấm để sửa */
    button.slot-filled {
      font-family: inherit;
      cursor: pointer;
      transition: filter 0.15s;
    }

    button.slot-filled:hover:not(:disabled) { filter: brightness(0.96); }
    button.slot-filled:disabled { cursor: default; }

    /* Tổng quan tháng */
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.4rem;
      padding: 1rem 1.25rem;
    }

    .month-head {
      text-align: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-muted);
      padding-bottom: 0.25rem;
    }

    .month-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.3rem;
      min-height: 78px;
      padding: 0.45rem 0.55rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-color);
      background: #ffffff;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .month-cell:hover:not(:disabled) {
      border-color: var(--primary-400, #60a5fa);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    }

    .month-cell.out-month {
      background: transparent;
      border-style: dashed;
      color: #cbd5e1;
      cursor: default;
    }

    .month-cell.is-today { box-shadow: 0 0 0 2px var(--primary-500, #3b82f6); }

    .month-day { font-weight: 800; font-size: 0.95rem; color: var(--text-main); }
    .month-count { font-size: 0.75rem; font-weight: 700; }

    .month-bar {
      width: 100%;
      height: 5px;
      background: #e2e8f0;
      border-radius: var(--radius-full);
      overflow: hidden;
      margin-top: auto;
    }

    .month-bar span { display: block; height: 100%; border-radius: inherit; background: currentColor; }

    .month-cell.cov-full { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
    .month-cell.cov-partial { background: #fffbeb; border-color: #fde68a; color: #b45309; }
    .month-cell.cov-low { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
    .month-cell.cov-past { background: #f8fafc; color: #94a3b8; }

    .legend-dot.cov-full { background: #a7f3d0; }
    .legend-dot.cov-partial { background: #fde68a; }
    .legend-dot.cov-low { background: #fecaca; }

    /* Form sửa ca & chọn nhanh khoảng ngày */
    .edit-info-box {
      display: flex;
      gap: 0.6rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      border-radius: var(--radius-md);
      padding: 0.7rem 0.9rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    /* Chọn ngày trên lịch tháng của bác sĩ */
    .month-picker-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .pick-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.3rem;
    }

    .pick-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.1rem;
      min-height: 50px;
      padding: 0.3rem 0.4rem;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #ffffff;
      font-family: inherit;
      font-size: 0.7rem;
      text-align: left;
      overflow: hidden;
    }

    .pick-day { font-size: 0.85rem; font-weight: 800; }

    .pick-note {
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pick-out { border: none; background: transparent; }
    .pick-past { background: #f8fafc; color: #cbd5e1; }

    .pick-free {
      color: #047857;
      border-color: #a7f3d0;
      cursor: pointer;
    }

    .pick-free:hover { background: #ecfdf5; }

    .pick-free.selected {
      background: #10b981;
      border-color: #059669;
      color: #ffffff;
    }

    .pick-doctor { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }
    .pick-room { background: #f1f5f9; border-color: #e2e8f0; color: #64748b; }

    .pick-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-top: 0.6rem;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .pick-legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
    .legend-dot.pick-legend-selected { background: #10b981; }
    .legend-dot.pick-legend-free { background: #ffffff; border: 1px solid #a7f3d0; }
    .legend-dot.pick-legend-doctor { background: #fed7aa; }
    .legend-dot.pick-legend-room { background: #e2e8f0; }

    /* Tình trạng ca trong form */
    .availability-box {
      border: 1px solid var(--border-color);
      background: #f8fafc;
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1rem;
    }

    .availability-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-bottom: 0.65rem;
    }

    .availability-loading {
      font-size: 0.82rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .availability-chips {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .avail-chip {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      padding: 0.5rem 0.7rem;
      border-radius: var(--radius-md);
      border: 1px solid;
      font-family: inherit;
      font-size: 0.8rem;
      text-align: left;
    }

    .avail-free {
      background: #ecfdf5;
      border-color: #a7f3d0;
      color: #047857;
      cursor: pointer;
    }

    .avail-free:hover { border-color: #10b981; }

    .avail-free.selected {
      border-color: #059669;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
    }

    .avail-room,
    .avail-doctor {
      background: #f1f5f9;
      border-color: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
    }

    .avail-doctor { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }

    .slot-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #fffbeb;
      color: #b45309;
      border: 1px solid #fde68a;
      border-radius: var(--radius-md);
      padding: 0.6rem 0.85rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }

    /* ==================== PAGINATION BAR ==================== */
    .pagination-footer {
      padding: 0.95rem 1.35rem;
      background: #ffffff;
      border-top: 1.5px solid #f1f5f9;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      font-size: 0.88rem;
      color: #475569;
    }

    .pagination-info strong {
      color: #0f172a;
    }

    .page-size-selector {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
    }

    .form-select-sm {
      padding: 0.35rem 0.65rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      color: #0f172a;
      font-weight: 700;
      background: #ffffff;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-page {
      min-width: 34px;
      height: 34px;
      padding: 0 0.5rem;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #334155;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }

    .btn-page:hover:not(:disabled) {
      background: #f0f9ff;
      border-color: #0284c7;
      color: #0284c7;
    }

    .btn-page.active {
      background: #0284c7;
      border-color: #0284c7;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.35);
    }

    .btn-page:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    .btn-page-nav {
      gap: 0.25rem;
      padding: 0 0.75rem;
    }

    .page-numbers-group {
      display: flex;
      gap: 0.3rem;
    }

    /* Modal */
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
      max-width: 650px;
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

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .flex-1 { flex: 1; }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
      margin-bottom: 0.4rem;
    }

    .form-label.required::after {
      content: ' *';
      color: var(--rose-600);
    }

    .form-control {
      padding: 0.65rem 0.85rem;
      font-size: 0.95rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-600);
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-state i {
      font-size: 3rem;
      color: var(--text-muted);
    }

    /* Mode Switcher Tabs */
    .mode-tabs {
      display: flex;
      gap: 0.5rem;
      background: #f1f5f9;
      padding: 0.35rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1.25rem;
    }

    .mode-tab-btn {
      flex: 1;
      padding: 0.65rem 1rem;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      font-size: 0.9rem;
      font-weight: 700;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .mode-tab-btn:hover:not(.active) {
      color: #0f172a;
      background: rgba(255, 255, 255, 0.5);
    }

    .mode-tab-btn.active {
      background: #ffffff;
      color: var(--primary-700);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .days-shortcuts {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .btn-shortcut {
      font-size: 0.78rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #475569;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-shortcut:hover {
      border-color: #0284c7;
      color: #0284c7;
      background: #f0f9ff;
    }

    .days-helper-text {
      font-size: 0.8rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    /* Batch Result Summary View */
    .batch-result-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .result-icon {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      margin: 0 auto 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }

    .icon-success {
      background: #ecfdf5;
      color: #059669;
    }

    .icon-warning {
      background: #fffbeb;
      color: #d97706;
    }

    .result-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.25rem;
    }

    .result-desc {
      font-size: 0.9rem;
      color: #64748b;
      margin: 0;
    }

    .result-stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .result-stat-box {
      border-radius: var(--radius-md);
      padding: 1rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .stat-box-green {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
    }

    .stat-box-green .result-number {
      color: #059669;
    }

    .stat-box-amber {
      background: #fffbeb;
      border: 1px solid #fde68a;
    }

    .stat-box-amber .result-number {
      color: #d97706;
    }

    .result-number {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
    }

    .result-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #475569;
    }

    .conflict-list-container {
      background: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: var(--radius-md);
      padding: 1rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .conflict-list-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: #b45309;
      margin: 0 0 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .conflict-ul {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.82rem;
      color: #44403c;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .text-amber {
      color: #d97706;
    }
  `]
})
export class SchedulesComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly doctorService = inject(DoctorService);
  readonly authService = inject(AuthService);

  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  readonly schedules = signal<WorkSchedule[]>([]);
  readonly rooms = signal<ExaminationRoom[]>([]);
  readonly specialties = signal<Specialty[]>([]);
  readonly doctorList = signal<any[]>([]);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly openingForm = signal(false);
  readonly showModal = signal(false);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  // Bảng phân ca theo tuần (Admin): hàng = phòng khám, cột = ngày, mỗi ô 3 ca
  readonly viewMode = signal<'MONTH' | 'ROSTER' | 'LIST'>('ROSTER');
  readonly todayIso = toIsoDate(new Date());
  // Ca đang sửa (null = đang thêm mới)
  readonly editingSchedule = signal<WorkSchedule | null>(null);

  // Tổng quan tháng: mỗi ngày hiện số ca đã có người / tổng số ca (phòng × 3 ca)
  readonly monthStart = signal<string>(toIsoDate(firstOfMonth(new Date())));
  readonly monthSchedules = signal<WorkSchedule[]>([]);
  readonly monthLoading = signal(false);
  readonly monthWeekdayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  readonly monthLabel = computed(() => {
    const first = new Date(this.monthStart() + 'T00:00:00');
    return `Tháng ${first.getMonth() + 1}/${first.getFullYear()}`;
  });

  readonly isCurrentMonth = computed(() => this.monthStart() === toIsoDate(firstOfMonth(new Date())));

  readonly monthCells = computed(() => {
    const first = new Date(this.monthStart() + 'T00:00:00');
    const last = lastOfMonth(first);
    const gridStart = mondayOf(first);
    const gridEnd = addDays(mondayOf(last), 6);
    const total = this.rooms().length * this.shiftSlots.length;
    const today = this.todayIso;

    // Đếm số ô (phòng × ca) đã có người trực theo từng ngày
    const filledByDate = new Map<string, Set<string>>();
    for (const s of this.monthSchedules()) {
      if (s.status === 'CANCELLED') continue;
      const set = filledByDate.get(s.workDate) ?? new Set<string>();
      set.add(`${s.examinationRoomId}|${this.shiftKeyOf(s)}`);
      filledByDate.set(s.workDate, set);
    }

    const cells = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      const iso = toIsoDate(d);
      const inMonth = d.getMonth() === first.getMonth();
      const filled = filledByDate.get(iso)?.size ?? 0;
      const isPast = iso < today;
      const ratio = total ? filled / total : 0;
      const coverage = !inMonth ? '' : isPast ? 'cov-past' : ratio >= 1 ? 'cov-full' : ratio >= 0.5 ? 'cov-partial' : 'cov-low';
      cells.push({
        iso,
        day: d.getDate(),
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        inMonth,
        isToday: iso === today,
        isPast,
        filled,
        total,
        coverage
      });
    }
    return cells;
  });

  readonly monthStats = computed(() => {
    let filled = 0;
    let empty = 0;
    for (const cell of this.monthCells()) {
      if (!cell.inMonth) continue;
      filled += cell.filled;
      if (!cell.isPast) empty += cell.total - cell.filled;
    }
    return { filled, empty };
  });
  readonly weekStart = signal<string>(toIsoDate(mondayOf(new Date())));
  readonly weekSchedules = signal<WorkSchedule[]>([]);
  readonly weekLoading = signal(false);
  readonly highlightId = signal<number | null>(null);
  // Ca trực của khoảng ngày đang chọn trong form khi khoảng đó nằm ngoài tuần đang xem (null = dùng dữ liệu tuần)
  readonly formSchedules = signal<WorkSchedule[] | null>(null);
  readonly formChecking = signal(false);
  private formRangeKey = '';

  readonly shiftSlots = [
    { key: 'CA_SÁNG', label: 'Sáng', css: 'shift-morning', start: '07:30', end: '12:00' },
    { key: 'CA_CHIỀU', label: 'Chiều', css: 'shift-afternoon', start: '13:30', end: '17:30' },
    { key: 'CA_TỐI', label: 'Tối', css: 'shift-evening', start: '18:00', end: '21:00' }
  ];

  readonly weekDays = computed(() => {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const today = toIsoDate(new Date());
    const monday = new Date(this.weekStart() + 'T00:00:00');
    return labels.map((weekday, i) => {
      const date = addDays(monday, i);
      const iso = toIsoDate(date);
      return {
        iso,
        weekday,
        short: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`,
        isToday: iso === today,
        isPast: iso < today
      };
    });
  });

  readonly weekLabel = computed(() => {
    const days = this.weekDays();
    return `${days[0].short} – ${days[6].short}/${days[6].iso.substring(0, 4)}`;
  });

  readonly isCurrentWeek = computed(() => this.weekStart() === toIsoDate(mondayOf(new Date())));

  // Gom ca trực (chưa huỷ) theo khoá phòng|ngày|ca để tra ô nhanh khi vẽ bảng
  private readonly rosterMap = computed(() => {
    const map = new Map<string, WorkSchedule[]>();
    for (const s of this.weekSchedules()) {
      if (s.status === 'CANCELLED') continue;
      const key = `${s.examinationRoomId}|${s.workDate}|${this.shiftKeyOf(s)}`;
      const list = map.get(key);
      if (list) list.push(s); else map.set(key, [s]);
    }
    return map;
  });

  readonly rosterStats = computed(() => {
    const map = this.rosterMap();
    let empty = 0;
    for (const room of this.rooms()) {
      for (const day of this.weekDays()) {
        if (day.isPast) continue;
        for (const shift of this.shiftSlots) {
          if (!map.has(`${room.id}|${day.iso}|${shift.key}`)) empty++;
        }
      }
    }
    const filled = this.weekSchedules().filter(s => s.status !== 'CANCELLED').length;
    return { filled, empty };
  });

  // Filters
  filterStartDate = toIsoDate(new Date());
  filterEndDate = '';
  filterRoomId: number | null = null;
  filterSpecialtyId: number | null = null;

  // Pagination for Schedules
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizeOptions = [5, 10, 15, 20, 50];

  readonly totalPages = computed(() => {
    const total = this.schedules().length;
    return Math.max(1, Math.ceil(total / this.pageSize()));
  });

  readonly paginatedSchedules = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.schedules().slice(start, start + this.pageSize());
  });

  readonly startIndex = computed(() => {
    if (this.schedules().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed(() => {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.schedules().length);
  });

  readonly pagesList = computed(() => {
    const total = this.totalPages();
    const curr = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, curr - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // Form đăng ký: 1 ngày, hoặc nhiều ngày tick trên lịch tháng của bác sĩ
  scheduleMode: 'SINGLE' | 'MULTI' = 'SINGLE';
  formMonthStart = toIsoDate(firstOfMonth(new Date()));
  readonly currentMonthIso = toIsoDate(firstOfMonth(new Date()));
  selectedDates: string[] = [];

  activeDoctorId: number | null = null;
  activeRoomId: number | null = null;
  activeWorkDate = this.todayIso;
  activeStartTime = '07:30';
  activeEndTime = '12:00';
  activeMaxPatients = 20;

  readonly batchResult = signal<BatchWorkScheduleResponse | null>(null);

  readonly listStats = computed(() => {
    const active = this.schedules().filter(s => s.status !== 'CANCELLED');
    return {
      available: active.reduce((sum, s) => sum + s.remainingSlots, 0),
      booked: active.reduce((sum, s) => sum + s.currentBookedCount, 0)
    };
  });

  setScheduleMode(mode: 'SINGLE' | 'MULTI'): void {
    this.scheduleMode = mode;
    this.loadFormSchedules();
  }

  selectShift(key: string): void {
    const slot = this.shiftSlots.find(s => s.key === key);
    if (!slot) return;
    this.activeStartTime = slot.start;
    this.activeEndTime = slot.end;
  }

  // Ca mặc định khớp với giờ đang nhập; giờ khác 3 ca mặc định là khung giờ tùy chỉnh
  activeShiftKey(): string {
    return this.shiftSlots.find(s => s.start === this.activeStartTime && s.end === this.activeEndTime)?.key ?? 'TỰ_DO';
  }

  ngOnInit(): void {
    // Admin mở màn ở bảng phân ca tuần (cần phòng khám + ca trực trong tuần); bác sĩ chỉ xem lịch của mình
    if (this.isAdmin()) {
      this.loadRooms();
      this.loadWeek();
    } else {
      this.loadSchedules();
    }
  }

  setViewMode(mode: 'MONTH' | 'ROSTER' | 'LIST'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    if (mode === 'LIST') {
      // Bộ lọc chuyên khoa và danh sách chỉ cần khi chuyển sang chế độ danh sách
      if (this.specialties().length === 0) this.loadSpecialties();
      this.loadSchedules();
    } else if (mode === 'MONTH') {
      this.loadMonth();
    } else {
      this.loadWeek();
    }
  }

  loadMonth(): void {
    this.monthLoading.set(true);
    const first = new Date(this.monthStart() + 'T00:00:00');
    this.scheduleService.getSchedules({ startDate: this.monthStart(), endDate: toIsoDate(lastOfMonth(first)) }).subscribe({
      next: res => {
        this.monthSchedules.set(res.success && res.data ? res.data : []);
        this.monthLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải lịch tháng', 'danger');
        this.monthLoading.set(false);
      }
    });
  }

  shiftMonth(offset: number): void {
    const first = new Date(this.monthStart() + 'T00:00:00');
    this.monthStart.set(toIsoDate(new Date(first.getFullYear(), first.getMonth() + offset, 1)));
    this.loadMonth();
  }

  goToCurrentMonth(): void {
    this.monthStart.set(toIsoDate(firstOfMonth(new Date())));
    this.loadMonth();
  }

  // Bấm một ngày trong lịch tháng: chuyển sang bảng phân ca của tuần chứa ngày đó
  openWeekOf(date: string): void {
    this.weekStart.set(toIsoDate(mondayOf(new Date(date + 'T00:00:00'))));
    this.viewMode.set('ROSTER');
    this.loadWeek();
  }

  formMonthLabel(): string {
    const first = new Date(this.formMonthStart + 'T00:00:00');
    return `Tháng ${first.getMonth() + 1}/${first.getFullYear()}`;
  }

  shiftFormMonth(offset: number): void {
    const first = new Date(this.formMonthStart + 'T00:00:00');
    this.formMonthStart = toIsoDate(new Date(first.getFullYear(), first.getMonth() + offset, 1));
    this.selectedDates = [];
    this.loadFormSchedules();
  }

  // Lịch tháng của bác sĩ đang chọn: ngày đã qua / bác sĩ đã có ca / phòng đã có người / còn trống
  formMonthCells(): { iso: string; day: number; state: 'out' | 'past' | 'doctor' | 'room' | 'free'; note: string; selected: boolean }[] {
    const first = new Date(this.formMonthStart + 'T00:00:00');
    const gridEnd = addDays(mondayOf(lastOfMonth(first)), 6);
    const cells = [];
    for (let d = mondayOf(first); d <= gridEnd; d = addDays(d, 1)) {
      const iso = toIsoDate(d);
      let state: 'out' | 'past' | 'doctor' | 'room' | 'free' = 'free';
      let note = 'Còn trống';
      if (d.getMonth() !== first.getMonth()) {
        state = 'out';
        note = '';
      } else if (iso < this.todayIso) {
        state = 'past';
        note = 'Ngày đã qua';
      } else {
        const doctorHit = this.overlapOn(iso, this.activeStartTime, this.activeEndTime, s => s.doctorId === this.activeDoctorId);
        const roomHit = doctorHit ? undefined
          : this.overlapOn(iso, this.activeStartTime, this.activeEndTime, s => s.examinationRoomId === this.activeRoomId);
        if (doctorHit) {
          state = 'doctor';
          note = 'Trực ' + doctorHit.roomNumber;
        } else if (roomHit) {
          state = 'room';
          note = roomHit.doctorName;
        }
      }
      cells.push({ iso, day: d.getDate(), state, note, selected: state === 'free' && this.selectedDates.includes(iso) });
    }
    return cells;
  }

  toggleDate(iso: string): void {
    this.selectedDates = this.selectedDates.includes(iso)
      ? this.selectedDates.filter(d => d !== iso)
      : [...this.selectedDates, iso].sort();
  }

  selectFreeDates(weekdaysOnly: boolean): void {
    this.selectedDates = this.formMonthCells()
      .filter(c => c.state === 'free')
      .filter(c => !weekdaysOnly || [1, 2, 3, 4, 5].includes(new Date(c.iso + 'T00:00:00').getDay()))
      .map(c => c.iso);
  }

  clearDates(): void {
    this.selectedDates = [];
  }

  // Chỉ gửi các ngày đã chọn mà vẫn còn trống (đổi bác sĩ / phòng / giờ có thể làm một số ngày bị trùng)
  selectedFreeDates(): string[] {
    return this.formMonthCells().filter(c => c.selected).map(c => c.iso);
  }

  // Ca đã có bệnh nhân đặt thì không đổi được ngày/giờ (backend cũng chặn)
  timeLocked(): boolean {
    const editing = this.editingSchedule();
    return !!editing && editing.currentBookedCount > 0;
  }

  openEditModal(schedule: WorkSchedule): void {
    this.openAddModal(undefined, () => {
      this.editingSchedule.set(schedule);
      this.scheduleMode = 'SINGLE';
      this.activeDoctorId = schedule.doctorId;
      this.activeRoomId = schedule.examinationRoomId;
      this.activeWorkDate = schedule.workDate;
      this.activeStartTime = schedule.startTime.substring(0, 5);
      this.activeEndTime = schedule.endTime.substring(0, 5);
      this.activeMaxPatients = schedule.maxPatients;
      this.formRangeKey = '';
      this.loadFormSchedules();
    });
  }

  loadWeek(): void {
    this.weekLoading.set(true);
    const days = this.weekDays();
    this.scheduleService.getSchedules({ startDate: days[0].iso, endDate: days[6].iso }).subscribe({
      next: res => {
        this.weekSchedules.set(res.success && res.data ? res.data : []);
        this.weekLoading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải bảng phân ca', 'danger');
        this.weekLoading.set(false);
      }
    });
  }

  shiftWeek(offset: number): void {
    const monday = new Date(this.weekStart() + 'T00:00:00');
    this.weekStart.set(toIsoDate(addDays(monday, offset * 7)));
    this.loadWeek();
  }

  goToCurrentWeek(): void {
    this.weekStart.set(toIsoDate(mondayOf(new Date())));
    this.loadWeek();
  }

  slotSchedules(roomId: number, date: string, shiftKey: string): WorkSchedule[] {
    return this.rosterMap().get(`${roomId}|${date}|${shiftKey}`) ?? NO_SCHEDULES;
  }

  // Bấm ô trống: mở form đã điền sẵn phòng, ngày, khung giờ của ca
  openSlot(roomId: number, date: string, shiftKey: string): void {
    this.openAddModal({ roomId, date, shiftKey });
  }

  // Phòng mà bác sĩ đang trực ở khung giờ đang chọn (chỉ tra được trong tuần đang hiển thị)
  doctorBusyRoom(doctorId: number): string | null {
    const hit = this.findOverlap(s => s.doctorId === doctorId);
    return hit ? hit.roomNumber : null;
  }

  // Bác sĩ đang trực tại phòng ở khung giờ đang chọn
  roomBusyDoctor(roomId: number): string | null {
    const hit = this.findOverlap(s => s.examinationRoomId === roomId);
    return hit ? hit.doctorName : null;
  }

  freeDoctorCount(): number {
    return this.doctorList().filter(d => !this.doctorBusyRoom(d.id)).length;
  }

  onWorkDateChange(date: string): void {
    this.activeWorkDate = date;
    this.loadFormSchedules();
  }

  // Ngày / tháng của form nằm ngoài tuần đang xem thì tải riêng ca trực của khoảng đó để biết ca nào trống / ai đang bận
  private loadFormSchedules(): void {
    const [from, to] = this.scheduleMode === 'SINGLE'
      ? [this.activeWorkDate, this.activeWorkDate]
      : [this.formMonthStart, toIsoDate(lastOfMonth(new Date(this.formMonthStart + 'T00:00:00')))];
    const days = this.weekDays();
    if (!this.isAdmin() || !from || (from >= days[0].iso && to <= days[6].iso)) {
      this.formRangeKey = '';
      this.formSchedules.set(null);
      this.formChecking.set(false);
      return;
    }
    const key = `${from}|${to}`;
    if (key === this.formRangeKey) return;
    this.formRangeKey = key;
    this.formChecking.set(true);
    this.scheduleService.getSchedules({ startDate: from, endDate: to }).subscribe({
      next: res => {
        if (this.formRangeKey !== key) return;
        this.formSchedules.set(res.data || []);
        this.formChecking.set(false);
      },
      error: () => {
        if (this.formRangeKey !== key) return;
        this.formSchedules.set(null);
        this.formChecking.set(false);
      }
    });
  }

  // 3 ca mặc định; chế độ 1 ngày kèm tình trạng của phòng / bác sĩ trong ngày đó
  shiftOptions(): { key: string; label: string; start: string; end: string; state: 'free' | 'room' | 'doctor'; note: string }[] {
    return this.shiftSlots.map(slot => {
      const base = { key: slot.key, label: slot.label, start: slot.start, end: slot.end };
      if (this.scheduleMode !== 'SINGLE') return { ...base, state: 'free' as const, note: 'Bấm để chọn' };
      const roomHit = this.activeRoomId
        ? this.overlapOn(this.activeWorkDate, slot.start, slot.end, s => s.examinationRoomId === this.activeRoomId) : undefined;
      if (roomHit) return { ...base, state: 'room' as const, note: roomHit.doctorName };
      const doctorHit = this.activeDoctorId
        ? this.overlapOn(this.activeWorkDate, slot.start, slot.end, s => s.doctorId === this.activeDoctorId) : undefined;
      if (doctorHit) return { ...base, state: 'doctor' as const, note: 'BS đang trực ' + doctorHit.roomNumber };
      return { ...base, state: 'free' as const, note: 'Còn trống' };
    });
  }

  private overlapOn(date: string, start: string, end: string, match: (s: WorkSchedule) => boolean): WorkSchedule | undefined {
    if (!date || !start || !end) return undefined;
    const editingId = this.editingSchedule()?.id;
    return (this.formSchedules() ?? this.weekSchedules()).find(s =>
      s.status !== 'CANCELLED'
      && s.id !== editingId
      && s.workDate === date
      && match(s)
      && s.startTime.substring(0, 5) < end
      && s.endTime.substring(0, 5) > start);
  }

  // Sau khi lưu: chuyển bảng phân ca tới tuần chứa ca mới và làm nổi bật ô vừa xếp
  private focusWeekOf(date: string, scheduleId: number | null): void {
    if (!this.isAdmin() || !date) return;
    const target = new Date(date + 'T00:00:00');
    this.weekStart.set(toIsoDate(mondayOf(target)));
    this.monthStart.set(toIsoDate(firstOfMonth(target)));
    this.highlightId.set(scheduleId);
    if (scheduleId !== null) {
      setTimeout(() => {
        if (this.highlightId() === scheduleId) this.highlightId.set(null);
      }, 4000);
    }
  }

  private findOverlap(match: (s: WorkSchedule) => boolean): WorkSchedule | undefined {
    if (this.scheduleMode !== 'SINGLE') return undefined;
    return this.overlapOn(this.activeWorkDate, this.activeStartTime, this.activeEndTime, match);
  }

  private shiftKeyOf(s: WorkSchedule): string {
    if (this.shiftSlots.some(slot => slot.key === s.shiftType)) return s.shiftType;
    const hour = Number(s.startTime.substring(0, 2));
    return hour < 12 ? 'CA_SÁNG' : hour < 18 ? 'CA_CHIỀU' : 'CA_TỐI';
  }

  // Sau khi thêm / huỷ / xoá ca: tải lại bảng phân ca, và danh sách nếu đang xem danh sách
  private reloadAfterChange(): void {
    if (this.isAdmin()) this.loadWeek();
    if (this.isAdmin() && this.viewMode() === 'MONTH') this.loadMonth();
    if (!this.isAdmin() || this.viewMode() === 'LIST') this.loadSchedules();
  }

  loadRooms(): void {
    this.scheduleService.getAllRooms().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.rooms.set(res.data);
        }
      }
    });
  }

  loadSpecialties(): void {
    this.specialtyService.getAllSpecialties().subscribe({
      next: res => {
        if (res.success && res.data) {
          this.specialties.set(res.data);
        }
      }
    });
  }

  loadSchedules(): void {
    this.loading.set(true);
    const request$ = this.isAdmin()
      ? this.scheduleService.getSchedules({
          startDate: this.filterStartDate || undefined,
          endDate: this.filterEndDate || undefined,
          roomId: this.filterRoomId || undefined,
          specialtyId: this.filterSpecialtyId || undefined
        })
      : this.scheduleService.getMySchedules(this.filterStartDate || undefined, this.filterEndDate || undefined);
    request$.subscribe({
      next: res => {
        if (res.success && res.data) {
          this.schedules.set(res.data);
          this.currentPage.set(1);
        }
        this.loading.set(false);
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể tải danh sách ca làm việc', 'danger');
        this.loading.set(false);
      }
    });
  }

  resetFilters(): void {
    this.filterStartDate = toIsoDate(new Date());
    this.filterEndDate = '';
    this.filterRoomId = null;
    this.filterSpecialtyId = null;
    this.currentPage.set(1);
    this.loadSchedules();
  }

  // Danh sách bác sĩ tải ở lần mở form đầu tiên; phòng khám dùng lại danh sách đã tải khi mở màn
  openAddModal(prefill?: { roomId: number; date: string; shiftKey: string }, afterShow?: () => void): void {
    this.openingForm.set(true);
    forkJoin({
      doctors: this.doctorList().length ? of(null) : this.doctorService.getDoctors(),
      rooms: this.rooms().length ? of({ data: this.rooms() }) : this.scheduleService.getAllRooms()
    }).subscribe({
      next: ({ doctors, rooms }) => {
        if (doctors) {
          this.doctorList.set((doctors.data || [])
            .filter(d => d.status !== 'LOCKED')
            .map(d => ({
              id: d.id,
              fullName: d.fullName,
              specialtyName: d.specialtyName || 'Chưa phân khoa'
            })));
        }
        this.rooms.set(rooms.data || []);
        this.openingForm.set(false);
        this.showAddForm(prefill);
        afterShow?.();
      },
      error: err => {
        this.openingForm.set(false);
        this.showAlert(err.error?.message || 'Không tải được danh sách bác sĩ / phòng khám', 'danger');
      }
    });
  }

  private showAddForm(prefill?: { roomId: number; date: string; shiftKey: string }): void {
    this.batchResult.set(null);
    this.editingSchedule.set(null);
    this.selectedDates = [];
    this.activeDoctorId = this.doctorList()[0]?.id ?? null;
    this.activeRoomId = this.rooms()[0]?.id ?? null;
    this.activeMaxPatients = 20;
    this.selectShift('CA_SÁNG');
    this.formRangeKey = '';
    this.formSchedules.set(null);

    if (prefill) {
      // Bấm ô trống trên bảng tuần: điền sẵn phòng, ngày, ca và bác sĩ đầu tiên còn rảnh
      this.scheduleMode = 'SINGLE';
      this.activeRoomId = prefill.roomId;
      this.activeWorkDate = prefill.date;
      this.selectShift(prefill.shiftKey);
      this.activeDoctorId = this.doctorList().find(d => !this.doctorBusyRoom(d.id))?.id ?? null;
    } else if (this.isAdmin() && this.viewMode() === 'MONTH') {
      // Đang xem lịch tháng: mở chế độ nhiều ngày đúng tháng đó
      this.scheduleMode = 'MULTI';
      this.formMonthStart = this.monthStart() < this.currentMonthIso ? this.currentMonthIso : this.monthStart();
      this.loadFormSchedules();
    } else {
      // Đang xem tuần / danh sách: 1 ngày, lấy ngày đầu tiên chưa qua của tuần đang xem
      this.scheduleMode = 'SINGLE';
      const weekFirstDay = this.weekDays()[0].iso;
      this.activeWorkDate = weekFirstDay > this.todayIso ? weekFirstDay : this.todayIso;
      this.formMonthStart = toIsoDate(firstOfMonth(new Date(this.activeWorkDate + 'T00:00:00')));
      this.loadFormSchedules();
    }

    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.batchResult.set(null);
    this.editingSchedule.set(null);
  }

  closeBatchResult(): void {
    this.closeModal();
    this.reloadAfterChange();
  }

  isFormValid(): boolean {
    if (!this.activeDoctorId || !this.activeRoomId || this.activeMaxPatients <= 0) return false;
    if (!this.activeStartTime || !this.activeEndTime || this.activeStartTime >= this.activeEndTime) return false;
    return this.scheduleMode === 'SINGLE' ? !!this.activeWorkDate : this.selectedFreeDates().length > 0;
  }

  saveSchedule(): void {
    if (!this.isFormValid()) return;
    this.submitting.set(true);
    const shift = {
      shiftType: this.activeShiftKey(),
      startTime: this.activeStartTime,
      endTime: this.activeEndTime,
      maxPatients: this.activeMaxPatients
    };

    if (this.scheduleMode === 'SINGLE') {
      const request: WorkScheduleRequest = {
        doctorId: this.activeDoctorId!,
        examinationRoomId: this.activeRoomId!,
        workDate: this.activeWorkDate,
        ...shift
      };
      const editing = this.editingSchedule();
      const request$ = editing
        ? this.scheduleService.updateSchedule(editing.id, request)
        : this.scheduleService.createSchedule(request);
      request$.subscribe({
        next: res => {
          this.showAlert(editing ? 'Cập nhật ca làm việc thành công!' : 'Đăng ký ca làm việc thành công!', 'success');
          this.submitting.set(false);
          this.closeModal();
          this.focusWeekOf(request.workDate, res.data?.id ?? null);
          this.reloadAfterChange();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Lỗi khi xếp ca trực. Vui lòng kiểm tra lại giờ làm việc.', 'danger');
          this.submitting.set(false);
        }
      });
      return;
    }

    const request: BatchWorkScheduleRequest = {
      doctorId: this.activeDoctorId!,
      examinationRoomId: this.activeRoomId!,
      workDates: this.selectedFreeDates(),
      ...shift
    };
    this.scheduleService.createBatchSchedules(request).subscribe({
      next: res => {
        this.submitting.set(false);
        this.focusWeekOf(request.workDates[0], null);
        const data = res.data;
        if (data && data.conflictCount > 0) {
          // Có ngày bị người khác xếp trước trong lúc đang chọn: hiện chi tiết
          this.batchResult.set(data);
        } else {
          this.showAlert(`Đã xếp ${data?.successCount ?? request.workDates.length} ca trực thành công!`, 'success');
          this.closeModal();
        }
        this.reloadAfterChange();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Lỗi khi xếp ca trực nhiều ngày.', 'danger');
        this.submitting.set(false);
      }
    });
  }

  cancelSchedule(item: WorkSchedule): void {
    const reason = prompt('Nhập lý do hủy ca trực của bác sĩ ' + item.doctorName + ':', 'Bác sĩ có lịch công tác đột xuất');
    if (reason !== null) {
      this.scheduleService.cancelSchedule(item.id, reason).subscribe({
        next: () => {
          this.showAlert(`Đã hủy ca trực ngày ${item.workDate} thành công!`, 'success');
          this.reloadAfterChange();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Không thể hủy ca trực', 'danger');
        }
      });
    }
  }

  deleteSchedule(item: WorkSchedule): void {
    if (confirm(`Bạn có chắc muốn xóa vĩnh viễn ca làm việc ngày ${item.workDate} của bác sĩ ${item.doctorName}?`)) {
      this.scheduleService.deleteSchedule(item.id).subscribe({
        next: () => {
          this.showAlert('Đã xóa ca làm việc thành công!', 'success');
          this.reloadAfterChange();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Không thể xóa ca làm việc này.', 'danger');
        }
      });
    }
  }

  getShiftBadgeClass(shift: string): string {
    if (shift.includes('SÁNG')) return 'badge-shift-morning';
    if (shift.includes('CHIỀU')) return 'badge-shift-afternoon';
    return 'badge-shift-evening';
  }

  getStatusBadgeClass(status: string): string {
    if (status === 'AVAILABLE') return 'badge-status-available';
    if (status === 'FULL') return 'badge-status-full';
    return 'badge-status-cancelled';
  }

  getStatusDisplayName(status: string): string {
    if (status === 'AVAILABLE') return 'Đang mở';
    if (status === 'FULL') return 'Đã đủ số';
    if (status === 'CANCELLED') return 'Đã hủy ca';
    return status;
  }

  getCapacityColorClass(current: number, max: number): string {
    const ratio = current / max;
    if (ratio < 0.6) return 'cap-green';
    if (ratio < 0.9) return 'cap-orange';
    return 'cap-red';
  }

  private showAlert(message: string, type: 'success' | 'danger'): void {
    this.alertMessage.set(message);
    this.alertType.set(type);
    setTimeout(() => this.alertMessage.set(null), 5000);
  }
}
