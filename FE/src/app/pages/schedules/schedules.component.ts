import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ScheduleService } from '../../services/schedule.service';
import { SpecialtyService } from '../../services/specialty.service';
import { DoctorService } from '../../services/doctor.service';
import { AuthService } from '../../services/auth.service';
import { ExaminationRoom, StaffShift, StaffShiftRequest, WorkSchedule, WorkScheduleRequest } from '../../models/schedule.model';
import { Specialty } from '../../models/specialty.model';
import { toIsoDate, addDays } from '../../utils/date.utils';
import { forkJoin, Observable, of, map, tap } from 'rxjs';

// Lịch trực dùng chung cho bác sĩ (ca tại phòng khám) và kỹ thuật viên (ca tại phòng cận lâm sàng)
type StaffKind = 'DOCTOR' | 'TECH';

// Một ca trên bảng phân ca: chuyển từ WorkSchedule (bác sĩ) hoặc StaffShift (KTV) về cùng một dạng
interface RosterEntry {
  id: number;
  personId: number;
  personName: string;
  personTitle?: string;
  personSub: string; // Chuyên khoa của bác sĩ / khoa của KTV
  roomId: number;
  roomNumber: string;
  roomName: string;
  floor?: number;
  workDate: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'FULL' | 'CANCELLED';
  booked: number;
  max: number;
  remaining: number;
  notes?: string;
}

interface Person { id: number; fullName: string; sub: string; department?: string; }

interface BatchResult { totalRequested: number; successCount: number; conflictCount: number; conflictMessages: string[]; }

const NO_ENTRIES: RosterEntry[] = [];

const DEPARTMENT_LABELS: Record<string, string> = {
  XET_NGHIEM: 'Khoa Xét nghiệm',
  CHAN_DOAN_HINH_ANH: 'Khoa Chẩn đoán hình ảnh'
};

function fromSchedule(s: WorkSchedule): RosterEntry {
  return {
    id: s.id, personId: s.doctorId, personName: s.doctorName, personTitle: s.academicTitle, personSub: s.specialtyName,
    roomId: s.examinationRoomId, roomNumber: s.roomNumber, roomName: s.roomName, floor: s.floor,
    workDate: s.workDate, shiftType: s.shiftType, startTime: s.startTime, endTime: s.endTime,
    status: s.status, booked: s.currentBookedCount, max: s.maxPatients, remaining: s.remainingSlots
  };
}

function fromShift(s: StaffShift): RosterEntry {
  return {
    id: s.id, personId: s.employeeId, personName: s.employeeName, personSub: DEPARTMENT_LABELS[s.department] ?? s.department,
    roomId: s.roomId, roomNumber: s.roomNumber, roomName: s.roomName,
    workDate: s.workDate, shiftType: s.shiftType, startTime: s.startTime, endTime: s.endTime,
    status: 'AVAILABLE', booked: 0, max: 0, remaining: 0, notes: s.notes
  };
}

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
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">{{ isAdmin() ? (isTech() ? 'Lịch trực kỹ thuật viên' : 'Lịch trực bác sĩ') : (isTech() ? 'Ca trực của tôi' : 'Lịch trực của tôi') }}</h1>
          <p class="page-subtitle">
            @if (isAdmin()) {
              {{ isTech()
                ? 'Một ca có thể có nhiều KTV; chỉ chọn được KTV thuộc khoa của phòng'
                : 'Tự kiểm tra trùng giờ của bác sĩ và phòng khám khi xếp ca' }}
            } @else {
              {{ schedules().length }} ca trong khoảng thời gian đã chọn
            }
          </p>
        </div>
        @if (isAdmin()) {
          <div class="page-actions">
            <div class="segmented" role="tablist" aria-label="Chế độ xem">
              <button type="button" class="segmented-btn" [class.active]="viewMode() === 'MONTH'" (click)="setViewMode('MONTH')">Tháng</button>
              <button type="button" class="segmented-btn" [class.active]="viewMode() === 'ROSTER'" (click)="setViewMode('ROSTER')">Tuần</button>
              <button type="button" class="segmented-btn" [class.active]="viewMode() === 'LIST'" (click)="setViewMode('LIST')">Danh sách</button>
            </div>
            <button class="btn btn-primary" [disabled]="openingForm()" (click)="openAddModal()">
              @if (openingForm()) {
                <span class="spinner-sm"></span> Đang tải...
              } @else {
                <i class="bi bi-plus-lg"></i> Xếp ca trực
              }
            </button>
          </div>
        }
      </div>

      @if (alertMessage()) {
        <div class="toast-floating-container">
          <div class="toast-card" [ngClass]="alertType() === 'success' ? 'toast-success' : 'toast-danger'" role="alert">
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
      <!-- Bảng phân ca theo tuần: hàng = phòng, cột = ngày, mỗi ô gồm 3 ca -->
      <div class="panel">
        <div class="toolbar toolbar-split">
          <div class="period-nav">
            <button type="button" class="nav-btn" (click)="shiftWeek(-1)" title="Tuần trước" aria-label="Tuần trước">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button type="button" class="nav-btn" (click)="shiftWeek(1)" title="Tuần sau" aria-label="Tuần sau">
              <i class="bi bi-chevron-right"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" [disabled]="isCurrentWeek()" (click)="goToCurrentWeek()">Tuần này</button>
            <span class="period-label mono">{{ weekLabel() }}</span>
          </div>
          <div class="period-summary">
            <span><strong class="mono">{{ rosterStats().filled }}</strong> ca đã xếp</span>
            <span class="sep">·</span>
            <span [class.has-gap]="rosterStats().empty > 0"><strong class="mono">{{ rosterStats().empty }}</strong> ca còn trống</span>
          </div>
        </div>

        @if (weekLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải bảng phân ca...</p>
          </div>
        } @else if (rooms().length === 0) {
          <div class="empty-state">
            <h3>Chưa có {{ roomLabel().toLowerCase() }} nào</h3>
            <p>Thêm {{ roomLabel().toLowerCase() }} trước khi xếp lịch trực.</p>
          </div>
        } @else {
          <div class="roster-scroll">
            <table class="roster-table">
              <thead>
                <tr>
                  <th class="roster-room-col">{{ roomLabel() }}</th>
                  @for (day of weekDays(); track day.iso) {
                    <th [class.is-today]="day.isToday" [class.is-past]="day.isPast">
                      <span class="day-name">{{ day.weekday }}</span>
                      <span class="day-date mono">{{ day.short }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (room of rooms(); track room.id) {
                  <tr>
                    <th class="roster-room-col">
                      <span class="room-number">{{ room.roomNumber }}</span>
                      <span class="roster-room-name">{{ room.roomName }}</span>
                    </th>
                    @for (day of weekDays(); track day.iso) {
                      <td [class.is-today]="day.isToday" [class.is-past]="day.isPast">
                        @for (shift of shiftSlots; track shift.key) {
                          @let items = slotEntries(room.id, day.iso, shift.key);
                          @for (s of items; track s.id) {
                            <button type="button" class="slot slot-filled" [ngClass]="shift.css" [class.slot-new]="s.id === highlightId()"
                                    [disabled]="day.isPast || openingForm()" (click)="openEditModal(s)"
                                    [title]="shift.label + ' ' + day.short + ' · ' + s.personName + ' (' + s.personSub + ')' + (day.isPast ? '' : ' · Bấm để sửa')">
                              <span class="slot-shift">{{ shift.label }}</span>
                              <span class="slot-doctor">{{ s.personName }}</span>
                              <span class="slot-meta mono">
                                {{ s.startTime.substring(0, 5) }}–{{ s.endTime.substring(0, 5) }}{{ isTech() ? '' : ' · ' + s.booked + '/' + s.max }}
                              </span>
                            </button>
                          }
                          @if (items.length === 0 && day.isPast) {
                            <div class="slot slot-past">
                              <span class="slot-shift">{{ shift.label }}</span>
                              <span class="slot-none">—</span>
                            </div>
                          } @else if (items.length === 0) {
                            <button type="button" class="slot slot-empty" [disabled]="openingForm()"
                                    (click)="openSlot(room.id, day.iso, shift.key)"
                                    [title]="'Xếp ca ' + shift.label + ' ' + day.short + ' tại ' + room.roomNumber">
                              <span class="slot-shift">{{ shift.label }}</span>
                              <span class="slot-add">+ Xếp ca</span>
                            </button>
                          } @else if (isTech() && !day.isPast) {
                            <!-- Phòng cận lâm sàng: một ca có thể thêm nhiều KTV -->
                            <button type="button" class="slot-more" [disabled]="openingForm()"
                                    (click)="openSlot(room.id, day.iso, shift.key)"
                                    [title]="'Thêm KTV vào ca ' + shift.label + ' ' + day.short + ' tại ' + room.roomNumber">
                              + Thêm KTV
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

          <div class="legend">
            <span><i class="legend-swatch shift-morning"></i> Sáng 07:30–12:00</span>
            <span><i class="legend-swatch shift-afternoon"></i> Chiều 13:30–17:30</span>
            <span><i class="legend-swatch shift-evening"></i> Tối 18:00–21:00</span>
            <span><i class="legend-swatch legend-empty"></i> Ô trống: bấm để xếp ca</span>
            <span>Ca đã xếp: bấm để sửa</span>
            @if (isTech()) {
              <span>Một ca có thể có nhiều KTV</span>
            }
          </div>
        }
      </div>
      } @else if (isAdmin() && viewMode() === 'MONTH') {
      <!-- Tổng quan tháng: mỗi ngày hiện số ca đã có người / tổng số ca (phòng × 3 ca) -->
      <div class="panel">
        <div class="toolbar toolbar-split">
          <div class="period-nav">
            <button type="button" class="nav-btn" (click)="shiftMonth(-1)" title="Tháng trước" aria-label="Tháng trước">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button type="button" class="nav-btn" (click)="shiftMonth(1)" title="Tháng sau" aria-label="Tháng sau">
              <i class="bi bi-chevron-right"></i>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" [disabled]="isCurrentMonth()" (click)="goToCurrentMonth()">Tháng này</button>
            <span class="period-label">{{ monthLabel() }}</span>
          </div>
          <div class="period-summary">
            <span><strong class="mono">{{ monthStats().filled }}</strong> ca đã xếp</span>
            <span class="sep">·</span>
            <span [class.has-gap]="monthStats().empty > 0"><strong class="mono">{{ monthStats().empty }}</strong> ca còn trống</span>
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
                <span class="month-day mono">{{ cell.day }}</span>
                @if (cell.inMonth) {
                  <span class="month-count mono">{{ cell.filled }}/{{ cell.total }} ca</span>
                  <span class="month-bar"><span [style.width.%]="cell.total ? (cell.filled / cell.total) * 100 : 0"></span></span>
                }
              </button>
            }
          </div>

          <div class="legend">
            <span><i class="legend-swatch cov-full"></i> Đủ người trực</span>
            <span><i class="legend-swatch cov-partial"></i> Thiếu một vài ca</span>
            <span><i class="legend-swatch cov-low"></i> Thiếu nhiều ca</span>
            <span>Bấm vào ngày để xếp chi tiết theo tuần</span>
          </div>
        }
      </div>
      } @else {

      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">Tổng số ca</span>
          <strong class="stat-value mono">{{ schedules().length }}</strong>
        </div>
        @if (isTech()) {
          <div class="stat-card">
            <span class="stat-label">Kỹ thuật viên tham gia</span>
            <strong class="stat-value mono">{{ listStats().people }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Phòng có người trực</span>
            <strong class="stat-value mono">{{ listStats().rooms }}</strong>
          </div>
        } @else {
          <div class="stat-card">
            <span class="stat-label">Chỗ khám còn trống</span>
            <strong class="stat-value mono">{{ listStats().available }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Đã đặt trước</span>
            <strong class="stat-value mono">{{ listStats().booked }}</strong>
          </div>
        }
      </div>

      <div class="panel">
        <div class="toolbar">
          <label class="inline-field">
            <span>Từ ngày</span>
            <input type="date" [(ngModel)]="filterStartDate" (change)="loadSchedules()" class="filter-input" />
          </label>
          <label class="inline-field">
            <span>Đến ngày</span>
            <input type="date" [(ngModel)]="filterEndDate" (change)="loadSchedules()" class="filter-input" />
          </label>
          @if (isAdmin()) {
            <select [(ngModel)]="filterRoomId" (change)="loadSchedules()" class="filter-input filter-select" [attr.aria-label]="'Lọc theo ' + roomLabel().toLowerCase()">
              <option [ngValue]="null">Tất cả phòng</option>
              @for (room of rooms(); track room.id) {
                <option [ngValue]="room.id">{{ room.roomNumber }} - {{ room.roomName }}</option>
              }
            </select>
            @if (!isTech()) {
              <select [(ngModel)]="filterSpecialtyId" (change)="loadSchedules()" class="filter-input filter-select" aria-label="Lọc theo chuyên khoa">
                <option [ngValue]="null">Tất cả chuyên khoa</option>
                @for (spec of specialties(); track spec.id) {
                  <option [ngValue]="spec.id">{{ spec.name }}</option>
                }
              </select>
            }
          }
          <button class="btn-reset-filters" (click)="resetFilters()">Đặt lại</button>
        </div>

        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Đang tải danh sách ca trực...</p>
          </div>
        } @else if (schedules().length === 0) {
          <div class="empty-state">
            <h3>Không có ca trực phù hợp</h3>
            <p>Thử đổi bộ lọc{{ isAdmin() ? ' hoặc xếp ca mới cho ' + personLabel().toLowerCase() : '' }}.</p>
          </div>
        } @else {
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 150px;">Ngày, giờ</th>
                  <th style="width: 110px;">Ca</th>
                  <th>{{ isTech() ? 'Kỹ thuật viên' : 'Bác sĩ' }}</th>
                  <th>{{ roomLabel() }}</th>
                  @if (isTech()) {
                    <th>Ghi chú</th>
                  } @else {
                    <th style="width: 170px;">Đã đặt / tối đa</th>
                    <th style="width: 120px;">Trạng thái</th>
                  }
                  @if (isAdmin()) {
                    <th style="width: 120px;"></th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (item of paginatedSchedules(); track item.id) {
                  <tr [class.row-cancelled]="item.status === 'CANCELLED'">
                    <td>
                      <div class="stack">
                        <span class="mono">{{ item.workDate | date:'dd/MM/yyyy' }}</span>
                        <span class="sub mono">{{ item.startTime.substring(0, 5) }}–{{ item.endTime.substring(0, 5) }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="shift-tag" [ngClass]="getShiftBadgeClass(item.shiftType)">{{ item.shiftType.includes('SÁNG') ? 'Sáng' : item.shiftType.includes('CHIỀU') ? 'Chiều' : item.shiftType.includes('TỐI') ? 'Tối' : item.shiftType }}</span>
                    </td>
                    <td>
                      <div class="stack">
                        <span class="strong">{{ item.personName }}</span>
                        <span class="sub">{{ isTech() ? item.personSub : (item.personTitle || 'Bác sĩ') + ' · ' + item.personSub }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="stack">
                        <span class="strong">{{ item.roomNumber }}</span>
                        <span class="sub">{{ item.roomName }}{{ item.floor ? ' · Tầng ' + item.floor : '' }}</span>
                      </div>
                    </td>
                    @if (isTech()) {
                      <td class="text-muted">{{ item.notes || '—' }}</td>
                    } @else {
                      <td>
                        <div class="capacity">
                          <span class="mono">{{ item.booked }} / {{ item.max }}</span>
                          <div class="capacity-bar">
                            <div
                              class="capacity-fill"
                              [style.width.%]="(item.booked / item.max) * 100"
                              [ngClass]="getCapacityColorClass(item.booked, item.max)"
                            ></div>
                          </div>
                          <span class="sub">Còn {{ item.remaining }}</span>
                        </div>
                      </td>
                      <td>
                        <span class="status" [ngClass]="getStatusBadgeClass(item.status)">
                          {{ getStatusDisplayName(item.status) }}
                        </span>
                      </td>
                    }
                    @if (isAdmin()) {
                      <td>
                        <div class="row-actions">
                          @if (item.status !== 'CANCELLED' && item.workDate >= todayIso) {
                            <button class="icon-btn" [disabled]="openingForm()" (click)="openEditModal(item)" title="Sửa ca trực" aria-label="Sửa ca trực">
                              <i class="bi bi-pencil"></i>
                            </button>
                          }
                          @if (!isTech() && item.status !== 'CANCELLED') {
                            <button class="icon-btn" (click)="cancelSchedule(item)" title="Hủy ca trực" aria-label="Hủy ca trực">
                              <i class="bi bi-x-circle"></i>
                            </button>
                          }
                          @if (!isTech() || item.workDate >= todayIso) {
                            <button class="icon-btn danger" (click)="deleteEntry(item)" title="Xóa ca" aria-label="Xóa ca">
                              <i class="bi bi-trash3"></i>
                            </button>
                          }
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination-footer">
            <div class="pagination-info">
              <span>{{ startIndex() }}–{{ endIndex() }} / {{ schedules().length }}</span>
              <div class="page-size-selector">
                <label for="pageSizeSelect">Số dòng</label>
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

            <div class="pagination-controls">
              <button class="btn-page" [disabled]="currentPage() === 1" (click)="goToPage(1)" title="Trang đầu">
                <i class="bi bi-chevron-double-left"></i>
              </button>
              <button class="btn-page" [disabled]="currentPage() === 1" (click)="prevPage()" title="Trang trước">
                <i class="bi bi-chevron-left"></i>
              </button>
              @for (p of pagesList(); track p) {
                <button class="btn-page" [class.active]="currentPage() === p" (click)="goToPage(p)">{{ p }}</button>
              }
              <button class="btn-page" [disabled]="currentPage() === totalPages()" (click)="nextPage()" title="Trang sau">
                <i class="bi bi-chevron-right"></i>
              </button>
              <button class="btn-page" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" title="Trang cuối">
                <i class="bi bi-chevron-double-right"></i>
              </button>
            </div>
          </div>
        }
      </div>
      }

      <!-- Modal xếp / sửa ca trực -->
      @if (showModal()) {
        <div class="modal-backdrop" (click)="closeModal()">
          <div class="modal-dialog modal-lg" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingEntry() ? 'Sửa ca trực' : 'Xếp ca trực' }} {{ personLabel().toLowerCase() }}</h2>
              <button class="modal-close-btn" (click)="closeModal()" aria-label="Đóng">×</button>
            </div>

            @if (batchResult()) {
              <!-- Kết quả sau khi xếp nhiều ngày -->
              <div class="modal-body">
                <p class="result-desc">Đã gửi <strong class="mono">{{ batchResult()!.totalRequested }}</strong> ngày theo lịch.</p>

                <div class="result-stats-row">
                  <div class="stat-card">
                    <span class="stat-label">Tạo thành công</span>
                    <strong class="stat-value mono" [class.is-success]="batchResult()!.successCount > 0">{{ batchResult()!.successCount }}</strong>
                  </div>
                  <div class="stat-card">
                    <span class="stat-label">Trùng lịch, đã bỏ qua</span>
                    <strong class="stat-value mono" [class.is-warning]="batchResult()!.conflictCount > 0">{{ batchResult()!.conflictCount }}</strong>
                  </div>
                </div>

                @if (batchResult()!.conflictMessages.length > 0) {
                  <div class="conflict-list">
                    <h4 class="conflict-list-title">Các ngày bị trùng lịch</h4>
                    <ul>
                      @for (msg of batchResult()!.conflictMessages; track msg) {
                        <li>{{ msg }}</li>
                      }
                    </ul>
                  </div>
                }
              </div>
              <div class="modal-footer">
                <button class="btn btn-primary" (click)="closeBatchResult()">Đóng</button>
              </div>
            } @else {
              <div class="modal-body">
                @if (editingEntry(); as editing) {
                  <div class="note-box note-info">
                    Đang sửa ca <span class="mono">{{ editing.workDate | date:'dd/MM/yyyy' }}</span>
                    (<span class="mono">{{ editing.startTime.substring(0, 5) }}–{{ editing.endTime.substring(0, 5) }}</span>)
                    tại {{ editing.roomNumber }}.
                    @if (!isTech()) {
                      Đã có <strong>{{ editing.booked }}</strong> lịch hẹn.
                    }
                    @if (timeLocked()) {
                      <br />Ca đã có bệnh nhân đặt nên <strong>không đổi được ngày, giờ</strong>; đổi bác sĩ thì lịch hẹn chuyển sang bác sĩ mới.
                    }
                  </div>
                } @else {
                  <div class="segmented segmented-block">
                    <button type="button" class="segmented-btn" [class.active]="scheduleMode === 'SINGLE'" (click)="setScheduleMode('SINGLE')">Một ngày</button>
                    <button type="button" class="segmented-btn" [class.active]="scheduleMode === 'MULTI'" (click)="setScheduleMode('MULTI')">Nhiều ngày (chọn trên lịch)</button>
                  </div>
                }

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label required">{{ isTech() ? 'Kỹ thuật viên (theo khoa của phòng)' : 'Bác sĩ' }}</label>
                    <select [(ngModel)]="activePersonId" class="form-control" required>
                      <option [ngValue]="null">-- Chọn {{ personLabel().toLowerCase() }} --</option>
                      @for (person of personList(); track person.id) {
                        @let busyRoom = personBusyRoom(person.id);
                        <option [ngValue]="person.id" [disabled]="!!busyRoom">
                          {{ person.fullName }} ({{ person.sub }}){{ busyRoom ? ' — đang trực ' + busyRoom : '' }}
                        </option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label required">{{ roomLabel() }}</label>
                    <select [ngModel]="activeRoomId" (ngModelChange)="onRoomChange($event)" class="form-control" required>
                      <option [ngValue]="null">-- Chọn phòng --</option>
                      @for (room of rooms(); track room.id) {
                        @let roomNote = roomBusyNote(room.id);
                        <option [ngValue]="room.id" [disabled]="!isTech() && !!roomNote">
                          {{ room.roomNumber }} - {{ room.roomName }} (Tầng {{ room.floor }}){{ roomNote ? ' — ' + roomNote : '' }}
                        </option>
                      }
                    </select>
                  </div>
                </div>
                @if (isTech() && activeRoomId && personList().length === 0) {
                  <div class="note-box note-warning">Khoa của phòng này chưa có kỹ thuật viên nào.</div>
                } @else if (scheduleMode === 'SINGLE' && freePersonCount() === 0 && personList().length > 0) {
                  <div class="note-box note-warning">
                    Tất cả {{ personLabel().toLowerCase() }} đều đã có ca giao nhau với khung giờ này. Hãy chọn khung giờ khác.
                  </div>
                }

                @if (scheduleMode === 'SINGLE') {
                  <div class="form-group">
                    <label class="form-label required">Ngày làm việc</label>
                    <input type="date" [ngModel]="activeWorkDate" (ngModelChange)="onWorkDateChange($event)" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                }

                <!-- Chọn ca: chế độ 1 ngày hiện luôn tình trạng từng ca của phòng trong ngày đó -->
                <div class="form-section">
                  <div class="form-section-title">
                    @if (scheduleMode === 'SINGLE') {
                      Ca trực ngày <span class="mono">{{ activeWorkDate | date:'dd/MM/yyyy' }}</span> tại phòng đã chọn
                    } @else {
                      Ca trực áp dụng cho các ngày chọn bên dưới
                    }
                  </div>
                  @if (scheduleMode === 'SINGLE' && formChecking()) {
                    <div class="section-loading"><span class="spinner-sm spinner-dark"></span> Đang kiểm tra lịch...</div>
                  } @else {
                    <div class="availability-chips">
                      @for (st of shiftOptions(); track st.key) {
                        <button type="button" class="avail-chip" [ngClass]="'avail-' + st.state"
                                [class.selected]="activeShiftKey() === st.key"
                                [disabled]="st.state !== 'free' || timeLocked()"
                                (click)="selectShift(st.key)">
                          <strong>Ca {{ st.label.toLowerCase() }} <span class="mono">{{ st.start }}–{{ st.end }}</span></strong>
                          <span>{{ st.note }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>

                @if (scheduleMode === 'MULTI') {
                  <!-- Lịch tháng của người được chọn: tick từng ngày muốn xếp trực -->
                  <div class="form-section">
                    <div class="month-picker-row">
                      <div class="period-nav">
                        <button type="button" class="nav-btn" [disabled]="formMonthStart <= currentMonthIso" (click)="shiftFormMonth(-1)" title="Tháng trước" aria-label="Tháng trước">
                          <i class="bi bi-chevron-left"></i>
                        </button>
                        <strong class="period-label">{{ formMonthLabel() }}</strong>
                        <button type="button" class="nav-btn" (click)="shiftFormMonth(1)" title="Tháng sau" aria-label="Tháng sau">
                          <i class="bi bi-chevron-right"></i>
                        </button>
                      </div>
                      <div class="days-shortcuts">
                        <button type="button" class="btn-shortcut" (click)="selectFreeDates(false)">Chọn mọi ngày trống</button>
                        <button type="button" class="btn-shortcut" (click)="selectFreeDates(true)">Chỉ T2–T6</button>
                        <button type="button" class="btn-shortcut" (click)="clearDates()">Bỏ chọn</button>
                      </div>
                    </div>

                    @if (!activePersonId || !activeRoomId) {
                      <div class="section-loading">Chọn {{ personLabel().toLowerCase() }} và phòng để xem các ngày còn trống.</div>
                    } @else if (formChecking()) {
                      <div class="section-loading"><span class="spinner-sm spinner-dark"></span> Đang kiểm tra lịch...</div>
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
                              <span class="pick-day mono">{{ cell.day }}</span>
                              @if (cell.selected) {
                                <i class="bi bi-check-lg"></i>
                              } @else if (cell.state === 'doctor' || cell.state === 'room') {
                                <span class="pick-note">{{ cell.note }}</span>
                              }
                            </button>
                          }
                        }
                      </div>
                      <div class="legend legend-inline">
                        <span><i class="legend-swatch pick-legend-selected"></i> Đã chọn</span>
                        <span><i class="legend-swatch pick-legend-free"></i> Còn trống</span>
                        <span><i class="legend-swatch pick-legend-doctor"></i> {{ personLabel() }} đã có ca</span>
                        @if (!isTech()) {
                          <span><i class="legend-swatch pick-legend-room"></i> Phòng đã có người</span>
                        }
                      </div>
                      <p class="helper-text">
                        Đã chọn <strong class="mono">{{ selectedFreeDates().length }}</strong> ngày, ca <span class="mono">{{ activeStartTime }}–{{ activeEndTime }}</span>. Bấm vào ngày để chọn hoặc bỏ chọn.
                      </p>
                    }
                  </div>
                }

                <div class="form-row form-row-3">
                  <div class="form-group">
                    <label class="form-label required">Giờ bắt đầu</label>
                    <input type="time" [(ngModel)]="activeStartTime" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label required">Giờ kết thúc</label>
                    <input type="time" [(ngModel)]="activeEndTime" [disabled]="timeLocked()" class="form-control" required />
                  </div>
                  @if (isTech()) {
                    <div class="form-group">
                      <label class="form-label">Ghi chú</label>
                      <input type="text" [(ngModel)]="activeNotes" maxlength="255" class="form-control" placeholder="Không bắt buộc" />
                    </div>
                  } @else {
                    <div class="form-group">
                      <label class="form-label required">Bệnh nhân tối đa / ca</label>
                      <input type="number" [(ngModel)]="activeMaxPatients" min="1" max="100" class="form-control" required />
                    </div>
                  }
                </div>
                <p class="helper-text">Sửa giờ bắt đầu, kết thúc nếu cần khung giờ khác 3 ca mặc định.</p>
              </div>

              <div class="modal-footer">
                @if (editingEntry(); as editing) {
                  <button class="btn btn-outline-danger footer-left" [disabled]="submitting()" (click)="deleteEntry(editing)">Xóa ca</button>
                }
                <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
                <button class="btn btn-primary" [disabled]="submitting() || !isFormValid()" (click)="saveSchedule()">
                  @if (submitting()) {
                    <span class="spinner-sm"></span> Đang lưu...
                  } @else {
                    {{ editingEntry() ? 'Lưu thay đổi' : scheduleMode === 'SINGLE' ? 'Xếp ca' : 'Xếp ca cho ' + selectedFreeDates().length + ' ngày' }}
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
    /* Chuyển chế độ xem */
    .segmented {
      display: inline-flex;
      padding: 2px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: #ffffff;
    }

    .segmented-btn {
      height: 30px;
      padding: 0 12px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .segmented-btn:hover:not(.active) { background: var(--bg-hover); }

    .segmented-btn.active {
      background: var(--primary-50);
      color: var(--primary-700);
      font-weight: 500;
    }

    .segmented-block {
      display: flex;
      margin-bottom: 16px;
    }

    .segmented-block .segmented-btn { flex: 1; }

    /* Thanh điều hướng tuần / tháng */
    .toolbar-split { justify-content: space-between; }

    .period-nav {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: #ffffff;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 13px;
    }

    .nav-btn:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-main); }
    .nav-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .period-label {
      margin-left: 6px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text-main);
    }

    .period-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .period-summary strong { color: var(--text-main); font-weight: 600; }
    .period-summary .has-gap strong { color: var(--warning-text); }
    .period-summary .sep { color: var(--text-light); }

    /* Bảng phân ca tuần */
    .roster-scroll {
      overflow: auto;
      max-height: 72vh;
    }

    .roster-table {
      width: 100%;
      min-width: 980px;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
    }

    .roster-table th,
    .roster-table td {
      border-bottom: 1px solid var(--border-color);
      border-right: 1px solid var(--border-color);
      padding: 6px;
      vertical-align: top;
    }

    .roster-table tr > :last-child { border-right: none; }
    .roster-table tbody tr:last-child > * { border-bottom: none; }

    .roster-table thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      padding: 8px 6px;
      background: var(--bg-subtle);
      text-align: center;
      color: var(--text-muted);
      font-weight: 600;
    }

    .day-name { display: block; font-size: 13px; color: var(--text-secondary); }
    .day-date { display: block; font-size: 12px; font-weight: 400; }

    .roster-table thead th.is-today {
      background: var(--primary-50);
      box-shadow: inset 0 -2px 0 var(--primary-600);
    }

    .roster-table thead th.is-today .day-name,
    .roster-table thead th.is-today .day-date { color: var(--primary-700); }

    .roster-table td.is-past { background: #fafbfc; }

    .roster-table .roster-room-col {
      position: sticky;
      left: 0;
      z-index: 1;
      width: 150px;
      padding: 8px 10px;
      text-align: left;
      background: #ffffff;
    }

    .roster-table thead .roster-room-col {
      z-index: 3;
      background: var(--bg-subtle);
      font-size: 12px;
    }

    .room-number {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .roster-room-name {
      display: block;
      margin-top: 2px;
      font-size: 12px;
      font-weight: 400;
      line-height: 1.35;
      color: var(--text-muted);
    }

    .slot {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 50px;
      margin-bottom: 4px;
      padding: 4px 6px 4px 8px;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 12px;
      text-align: left;
      line-height: 1.35;
      color: var(--text-main);
    }

    .slot:last-child { margin-bottom: 0; }

    .slot-shift {
      font-size: 11px;
      color: var(--text-muted);
    }

    .slot-doctor {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .slot-meta { font-size: 11px; color: var(--text-muted); }

    /* Ca đã xếp: nền nhạt + vạch trái theo loại ca */
    .slot-filled {
      border-left-width: 3px;
      cursor: pointer;
      transition: background-color 0.12s ease;
    }

    .slot-filled.shift-morning { background: #eef4fb; border-color: #d6e4f5; border-left-color: #4a7fc6; }
    .slot-filled.shift-afternoon { background: #fbf6ea; border-color: #efe2bf; border-left-color: #c8962b; }
    .slot-filled.shift-evening { background: #f2f3f6; border-color: #dfe2e8; border-left-color: #6b7487; }

    .slot-filled.shift-morning:hover:not(:disabled) { background: #e3edf9; }
    .slot-filled.shift-afternoon:hover:not(:disabled) { background: #f7efda; }
    .slot-filled.shift-evening:hover:not(:disabled) { background: #e9ebf0; }

    .slot-filled:disabled { cursor: default; opacity: 0.8; }

    .slot-new { outline: 2px solid var(--success-solid); outline-offset: 1px; }

    .slot-empty {
      background: #ffffff;
      border: 1px dashed var(--border-strong);
      cursor: pointer;
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .slot-empty:hover:not(:disabled) {
      background: var(--primary-50);
      border-color: var(--primary-300);
    }

    .slot-empty:hover:not(:disabled) .slot-add { color: var(--primary-700); }
    .slot-empty:disabled { cursor: wait; opacity: 0.6; }

    .slot-add { color: var(--text-light); }

    .slot-past {
      background: transparent;
      border-color: var(--border-color);
      color: var(--text-light);
    }

    .slot-past .slot-shift,
    .slot-none { color: var(--text-light); }

    .slot-more {
      display: block;
      width: 100%;
      margin: -2px 0 4px;
      padding: 2px 6px;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-muted);
      font: inherit;
      font-size: 12px;
      text-align: left;
      cursor: pointer;
    }

    .slot-more:hover:not(:disabled) { background: var(--bg-hover); color: var(--primary-700); }
    .slot-more:disabled { cursor: wait; opacity: 0.6; }

    /* Chú thích */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 18px;
      padding: 10px 16px;
      border-top: 1px solid var(--border-color);
      font-size: 12px;
      color: var(--text-muted);
    }

    .legend span { display: inline-flex; align-items: center; gap: 6px; }

    .legend-inline {
      padding: 10px 0 0;
      border-top: none;
    }

    .legend-swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 3px;
      border: 1px solid transparent;
    }

    .legend-swatch.shift-morning { background: #eef4fb; border-color: #d6e4f5; box-shadow: inset 3px 0 0 #4a7fc6; }
    .legend-swatch.shift-afternoon { background: #fbf6ea; border-color: #efe2bf; box-shadow: inset 3px 0 0 #c8962b; }
    .legend-swatch.shift-evening { background: #f2f3f6; border-color: #dfe2e8; box-shadow: inset 3px 0 0 #6b7487; }
    .legend-swatch.legend-empty { background: #ffffff; border: 1px dashed var(--border-strong); }
    .legend-swatch.cov-full { background: var(--success-solid); }
    .legend-swatch.cov-partial { background: var(--warning-solid); }
    .legend-swatch.cov-low { background: var(--danger-solid); }
    .legend-swatch.pick-legend-selected { background: var(--primary-600); }
    .legend-swatch.pick-legend-free { background: #ffffff; border-color: var(--border-strong); }
    .legend-swatch.pick-legend-doctor { background: var(--warning-bg); border-color: var(--warning-border); }
    .legend-swatch.pick-legend-room { background: var(--bg-subtle); border-color: var(--border-color); }

    /* Tổng quan tháng */
    .month-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 6px;
      padding: 16px;
    }

    .month-head {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      padding-bottom: 2px;
    }

    .month-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      min-height: 76px;
      padding: 6px 8px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: #ffffff;
      color: var(--text-muted);
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      transition: border-color 0.12s ease, background-color 0.12s ease;
    }

    .month-cell:hover:not(:disabled) {
      border-color: var(--primary-300);
      background: var(--primary-50);
    }

    .month-cell.out-month {
      background: transparent;
      border-color: transparent;
      cursor: default;
    }

    .month-cell.out-month .month-day { color: var(--text-light); }

    .month-cell.is-today { border-color: var(--primary-600); }
    .month-cell.is-today .month-day { color: var(--primary-700); }

    .month-day { font-weight: 600; font-size: 14px; color: var(--text-main); }
    .month-count { font-size: 12px; }

    .month-bar {
      width: 100%;
      height: 4px;
      margin-top: auto;
      background: var(--bg-subtle);
      border-radius: 2px;
      overflow: hidden;
    }

    .month-bar span { display: block; height: 100%; background: currentColor; }

    .month-cell.cov-full { color: var(--success-text); }
    .month-cell.cov-partial { color: var(--warning-text); }
    .month-cell.cov-low { color: var(--danger-text); }
    .month-cell.cov-past { background: #fafbfc; color: var(--text-light); }
    .month-cell.cov-past .month-day { color: var(--text-muted); }

    /* Danh sách */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 16px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .stat-label { font-size: 13px; color: var(--text-muted); }

    .stat-value {
      font-size: 22px;
      font-weight: 600;
      line-height: 1.2;
      color: var(--text-main);
    }

    .stat-value.is-success { color: var(--success-text); }
    .stat-value.is-warning { color: var(--warning-text); }

    .inline-field {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .filter-input {
      height: 34px;
      padding: 0 8px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 14px;
      color: var(--text-main);
      background: #ffffff;
      outline: none;
    }

    .filter-input:focus {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 3px rgba(31, 95, 180, 0.15);
    }

    .filter-select { min-width: 170px; max-width: 260px; }

    .btn-reset-filters {
      height: 34px;
      padding: 0 8px;
      border: none;
      background: none;
      color: var(--primary-600);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-reset-filters:hover { text-decoration: underline; }

    .table-responsive { overflow-x: auto; }

    .stack {
      display: flex;
      flex-direction: column;
      line-height: 1.4;
    }

    .stack .strong { font-weight: 500; }
    td.text-muted { color: var(--text-muted); }
    .sub { font-size: 12px; color: var(--text-muted); }

    .row-cancelled td { color: var(--text-muted); }
    .row-cancelled .strong { text-decoration: line-through; }

    .shift-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .shift-tag::before {
      content: '';
      width: 8px;
      height: 8px;
      border-radius: 2px;
      background: #6b7487;
    }

    .shift-tag.badge-shift-morning::before { background: #4a7fc6; }
    .shift-tag.badge-shift-afternoon::before { background: #c8962b; }
    .shift-tag.badge-shift-evening::before { background: #6b7487; }

    .capacity {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 2px 10px;
      font-size: 13px;
    }

    .capacity .sub { grid-column: 1 / -1; }

    .capacity-bar {
      height: 4px;
      min-width: 60px;
      background: var(--bg-subtle);
      border-radius: 2px;
      overflow: hidden;
    }

    .capacity-fill { height: 100%; }
    .cap-green { background: var(--success-solid); }
    .cap-orange { background: var(--warning-solid); }
    .cap-red { background: var(--danger-solid); }

    .status.badge-status-available { background: var(--success-bg); color: var(--success-text); }
    .status.badge-status-full { background: var(--warning-bg); color: var(--warning-text); }
    .status.badge-status-cancelled { background: var(--bg-subtle); color: var(--text-muted); }

    .row-actions {
      display: flex;
      justify-content: flex-end;
      gap: 2px;
    }

    .icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .loading-state,
    .empty-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state h3 {
      font-size: 15px;
      color: var(--text-main);
      margin-bottom: 4px;
    }

    /* Phân trang */
    .pagination-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 10px 16px;
      border-top: 1px solid var(--border-color);
      font-size: 13px;
      color: var(--text-muted);
    }

    .pagination-info,
    .page-size-selector,
    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pagination-info { gap: 16px; }
    .pagination-controls { gap: 4px; }

    .form-select-sm {
      height: 28px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font: inherit;
      font-size: 13px;
      padding: 0 6px;
      background: #ffffff;
    }

    .btn-page {
      min-width: 28px;
      height: 28px;
      padding: 0 6px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: #ffffff;
      color: var(--text-secondary);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-page:hover:not(:disabled) { background: var(--bg-hover); }
    .btn-page:disabled { opacity: 0.45; cursor: not-allowed; }

    .btn-page.active {
      background: var(--primary-600);
      border-color: var(--primary-600);
      color: #ffffff;
    }

    /* Modal */
    .modal-lg { max-width: 760px; width: 100%; }

    .form-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-row-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

    .form-control:disabled {
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    .note-box {
      margin-bottom: 16px;
      padding: 8px 12px;
      border: 1px solid;
      border-radius: var(--radius-md);
      font-size: 13px;
      line-height: 1.5;
    }

    .note-info { background: var(--info-bg); border-color: var(--info-border); color: var(--info-text); }
    .note-warning { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }

    .form-section {
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }

    .form-section-title {
      margin-bottom: 10px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }

    .section-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      font-size: 13px;
      color: var(--text-muted);
    }

    .spinner-dark {
      border-color: var(--border-color);
      border-top-color: var(--primary-600);
    }

    .availability-chips {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .avail-chip {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 10px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: #ffffff;
      font-family: inherit;
      font-size: 12px;
      text-align: left;
      color: var(--text-muted);
      transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .avail-chip strong {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-main);
    }

    .avail-free { cursor: pointer; }
    .avail-free:hover:not(:disabled) { background: var(--bg-hover); }

    .avail-free.selected {
      background: var(--primary-50);
      border-color: var(--primary-600);
      box-shadow: inset 0 0 0 1px var(--primary-600);
    }

    .avail-free.selected strong { color: var(--primary-700); }

    .avail-room,
    .avail-doctor {
      background: var(--bg-subtle);
      border-color: var(--border-color);
      cursor: not-allowed;
    }

    .avail-room strong,
    .avail-doctor strong { color: var(--text-muted); }

    .avail-doctor > span { color: var(--warning-text); }

    .month-picker-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }

    .days-shortcuts {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }

    .btn-shortcut {
      height: 28px;
      padding: 0 10px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      background: #ffffff;
      color: var(--text-secondary);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .btn-shortcut:hover { background: var(--bg-hover); color: var(--text-main); }

    .pick-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 4px;
    }

    .pick-cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1px;
      min-height: 46px;
      padding: 4px 6px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: #ffffff;
      font-family: inherit;
      font-size: 11px;
      text-align: left;
      color: var(--text-muted);
      overflow: hidden;
    }

    .pick-day { font-size: 13px; font-weight: 500; color: var(--text-main); }

    .pick-note {
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pick-out { border: none; background: transparent; }

    .pick-past { background: #fafbfc; }
    .pick-past .pick-day { color: var(--text-light); }

    .pick-free {
      border-color: var(--border-strong);
      cursor: pointer;
    }

    .pick-free:hover { background: var(--primary-50); border-color: var(--primary-300); }

    .pick-free.selected {
      background: var(--primary-600);
      border-color: var(--primary-600);
      color: #ffffff;
    }

    .pick-free.selected .pick-day { color: #ffffff; }

    .pick-doctor { background: var(--warning-bg); border-color: var(--warning-border); color: var(--warning-text); }
    .pick-room { background: var(--bg-subtle); border-color: var(--border-color); }

    .helper-text {
      margin-top: 8px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .form-row + .helper-text { margin-top: -8px; }

    .result-desc {
      font-size: 14px;
      color: var(--text-secondary);
      margin-bottom: 12px;
    }

    .result-stats-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .conflict-list {
      padding: 12px;
      border: 1px solid var(--warning-border);
      border-radius: var(--radius-md);
      background: var(--warning-bg);
      font-size: 13px;
      color: var(--warning-text);
    }

    .conflict-list-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .conflict-list ul {
      margin: 0;
      padding-left: 18px;
      max-height: 200px;
      overflow-y: auto;
      line-height: 1.6;
    }

    .footer-left { margin-right: auto; }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: 1fr; }
      .form-row,
      .form-row-3,
      .availability-chips { grid-template-columns: 1fr; }
    }
  `]
})

export class SchedulesComponent implements OnInit {
  private readonly scheduleService = inject(ScheduleService);
  private readonly specialtyService = inject(SpecialtyService);
  private readonly doctorService = inject(DoctorService);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly isAdmin = computed(() => this.authService.hasRole('ADMIN'));

  // Admin chuyển qua lại giữa lịch bác sĩ và lịch KTV; KTV đăng nhập chỉ xem ca của mình
  readonly kind = signal<StaffKind>(
    !this.authService.hasRole('ADMIN') && !this.authService.hasRole('DOCTOR') && this.authService.isLabTech() ? 'TECH' : 'DOCTOR');
  readonly isTech = computed(() => this.kind() === 'TECH');
  readonly personLabel = computed(() => this.isTech() ? 'Kỹ thuật viên' : 'Bác sĩ');
  readonly roomLabel = computed(() => this.isTech() ? 'Phòng cận lâm sàng' : 'Phòng khám');

  readonly schedules = signal<RosterEntry[]>([]);
  private readonly examRooms = signal<ExaminationRoom[]>([]);
  private readonly labRooms = signal<ExaminationRoom[]>([]);
  readonly rooms = computed(() => this.isTech() ? this.labRooms() : this.examRooms());
  readonly specialties = signal<Specialty[]>([]);
  private readonly doctorList = signal<Person[]>([]);
  private readonly techList = signal<Person[]>([]);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly openingForm = signal(false);
  readonly showModal = signal(false);

  readonly alertMessage = signal<string | null>(null);
  readonly alertType = signal<'success' | 'danger'>('success');

  // Bảng phân ca theo tuần (Admin): hàng = phòng, cột = ngày, mỗi ô 3 ca
  readonly viewMode = signal<'MONTH' | 'ROSTER' | 'LIST'>('ROSTER');
  readonly todayIso = toIsoDate(new Date());
  // Ca đang sửa (null = đang thêm mới)
  readonly editingEntry = signal<RosterEntry | null>(null);

  // Tổng quan tháng: mỗi ngày hiện số ca đã có người / tổng số ca (phòng × 3 ca)
  readonly monthStart = signal<string>(toIsoDate(firstOfMonth(new Date())));
  readonly monthSchedules = signal<RosterEntry[]>([]);
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
      set.add(`${s.roomId}|${this.shiftKeyOf(s)}`);
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
  readonly weekSchedules = signal<RosterEntry[]>([]);
  readonly weekLoading = signal(false);
  readonly highlightId = signal<number | null>(null);
  // Ca trực của khoảng ngày đang chọn trong form khi khoảng đó nằm ngoài tuần đang xem (null = dùng dữ liệu tuần)
  readonly formSchedules = signal<RosterEntry[] | null>(null);
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
    const map = new Map<string, RosterEntry[]>();
    for (const s of this.weekSchedules()) {
      if (s.status === 'CANCELLED') continue;
      const key = `${s.roomId}|${s.workDate}|${this.shiftKeyOf(s)}`;
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

  // Form đăng ký: 1 ngày, hoặc nhiều ngày tick trên lịch tháng của người được chọn
  scheduleMode: 'SINGLE' | 'MULTI' = 'SINGLE';
  formMonthStart = toIsoDate(firstOfMonth(new Date()));
  readonly currentMonthIso = toIsoDate(firstOfMonth(new Date()));
  selectedDates: string[] = [];

  activePersonId: number | null = null;
  activeRoomId: number | null = null;
  activeWorkDate = this.todayIso;
  activeStartTime = '07:30';
  activeEndTime = '12:00';
  activeMaxPatients = 20;
  activeNotes = '';

  readonly batchResult = signal<BatchResult | null>(null);

  readonly listStats = computed(() => {
    const active = this.schedules().filter(s => s.status !== 'CANCELLED');
    return {
      available: active.reduce((sum, s) => sum + s.remaining, 0),
      booked: active.reduce((sum, s) => sum + s.booked, 0),
      people: new Set(active.map(s => s.personId)).size,
      rooms: new Set(active.map(s => s.roomId)).size
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
    // Admin mở màn ở bảng phân ca tuần (cần phòng + ca trực trong tuần); bác sĩ / KTV chỉ xem lịch của mình
    if (this.isAdmin()) {
      const url = this.router.url;
      const initialKind: StaffKind = url.includes('/technicians') || url.includes('/tech') ? 'TECH' : 'DOCTOR';
      this.kind.set(initialKind);
      this.ensureRooms().subscribe();
      this.loadWeek();

      this.router.events
        .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
        .subscribe((e) => {
          const currentUrl = e.urlAfterRedirects || e.url;
          const targetKind: StaffKind = currentUrl.includes('/technicians') || currentUrl.includes('/tech') ? 'TECH' : 'DOCTOR';
          if (this.kind() !== targetKind) {
            this.setKind(targetKind, false);
          }
        });
    } else {
      this.loadSchedules();
    }
  }

  // Đổi giữa lịch bác sĩ và lịch KTV, giữ nguyên chế độ xem / tuần / tháng đang chọn
  setKind(kind: StaffKind, navigate: boolean = true): void {
    if (this.kind() === kind && !navigate) return;
    this.kind.set(kind);
    this.filterRoomId = null;
    this.weekSchedules.set([]);
    this.monthSchedules.set([]);
    this.schedules.set([]);
    this.ensureRooms().subscribe();
    const mode = this.viewMode();
    if (mode === 'LIST') this.loadSchedules();
    else if (mode === 'MONTH') this.loadMonth();
    else this.loadWeek();

    if (navigate && this.isAdmin()) {
      const targetPath = kind === 'TECH' ? '/admin/schedules/technicians' : '/admin/schedules/doctors';
      if (!this.router.url.includes(targetPath)) {
        this.router.navigateByUrl(targetPath);
      }
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

  // Ca trực trong khoảng ngày của loại nhân sự đang xem (Admin)
  private fetchEntries(startDate?: string, endDate?: string, roomId?: number, specialtyId?: number): Observable<RosterEntry[]> {
    if (this.isTech()) {
      return this.scheduleService.getStaffShifts(startDate, endDate, roomId).pipe(map(res => (res.data || []).map(fromShift)));
    }
    return this.scheduleService.getSchedules({ startDate, endDate, roomId, specialtyId })
      .pipe(map(res => (res.data || []).map(fromSchedule)));
  }

  loadMonth(): void {
    const kind = this.kind();
    this.monthLoading.set(true);
    const first = new Date(this.monthStart() + 'T00:00:00');
    this.fetchEntries(this.monthStart(), toIsoDate(lastOfMonth(first))).subscribe({
      next: entries => {
        if (kind !== this.kind()) return;
        this.monthSchedules.set(entries);
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

  // Lịch tháng của người đang chọn: ngày đã qua / người đã có ca / phòng đã có người (chỉ phòng khám) / còn trống
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
        const personHit = this.overlapOn(iso, this.activeStartTime, this.activeEndTime, s => s.personId === this.activePersonId);
        const roomHit = personHit || this.isTech() ? undefined
          : this.overlapOn(iso, this.activeStartTime, this.activeEndTime, s => s.roomId === this.activeRoomId);
        if (personHit) {
          state = 'doctor';
          note = 'Trực ' + personHit.roomNumber;
        } else if (roomHit) {
          state = 'room';
          note = roomHit.personName;
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

  // Chỉ gửi các ngày đã chọn mà vẫn còn trống (đổi người / phòng / giờ có thể làm một số ngày bị trùng)
  selectedFreeDates(): string[] {
    return this.formMonthCells().filter(c => c.selected).map(c => c.iso);
  }

  // Ca bác sĩ đã có bệnh nhân đặt thì không đổi được ngày/giờ (backend cũng chặn)
  timeLocked(): boolean {
    const editing = this.editingEntry();
    return !!editing && editing.booked > 0;
  }

  openEditModal(entry: RosterEntry): void {
    this.openAddModal(undefined, () => {
      this.editingEntry.set(entry);
      this.scheduleMode = 'SINGLE';
      this.activeRoomId = entry.roomId;
      this.activePersonId = entry.personId;
      this.activeWorkDate = entry.workDate;
      this.activeStartTime = entry.startTime.substring(0, 5);
      this.activeEndTime = entry.endTime.substring(0, 5);
      this.activeMaxPatients = entry.max || 20;
      this.activeNotes = entry.notes ?? '';
      this.formRangeKey = '';
      this.loadFormSchedules();
    });
  }

  loadWeek(): void {
    const kind = this.kind();
    this.weekLoading.set(true);
    const days = this.weekDays();
    this.fetchEntries(days[0].iso, days[6].iso).subscribe({
      next: entries => {
        if (kind !== this.kind()) return;
        this.weekSchedules.set(entries);
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

  slotEntries(roomId: number, date: string, shiftKey: string): RosterEntry[] {
    return this.rosterMap().get(`${roomId}|${date}|${shiftKey}`) ?? NO_ENTRIES;
  }

  // Bấm ô trống (hoặc "Thêm KTV"): mở form đã điền sẵn phòng, ngày, khung giờ của ca
  openSlot(roomId: number, date: string, shiftKey: string): void {
    this.openAddModal({ roomId, date, shiftKey });
  }

  // Bác sĩ: tất cả; KTV: chỉ người thuộc khoa của phòng đang chọn
  personList(): Person[] {
    if (!this.isTech()) return this.doctorList();
    const department = this.rooms().find(r => r.id === this.activeRoomId)?.roomType;
    return this.techList().filter(t => !department || t.department === department);
  }

  // Đổi phòng ở chế độ KTV: người đang chọn khác khoa thì chọn lại KTV đầu tiên còn rảnh của khoa mới
  onRoomChange(roomId: number | null): void {
    this.activeRoomId = roomId;
    if (this.isTech() && !this.personList().some(p => p.id === this.activePersonId)) {
      this.activePersonId = this.firstFreePerson();
    }
  }

  // Phòng mà người đó đang trực ở khung giờ đang chọn (chế độ 1 ngày)
  personBusyRoom(personId: number): string | null {
    const hit = this.findOverlap(s => s.personId === personId);
    return hit ? hit.roomNumber : null;
  }

  // Phòng khám: bác sĩ đang trực (khoá phòng); phòng CLS: số KTV đã có trong ca (vẫn thêm được)
  roomBusyNote(roomId: number): string | null {
    if (this.scheduleMode !== 'SINGLE') return null;
    const inRoom = this.overlapsOn(this.activeWorkDate, this.activeStartTime, this.activeEndTime, s => s.roomId === roomId);
    if (inRoom.length === 0) return null;
    return this.isTech() ? `đã có ${inRoom.length} KTV` : `${inRoom[0].personName} đang trực`;
  }

  freePersonCount(): number {
    return this.personList().filter(p => !this.personBusyRoom(p.id)).length;
  }

  private firstFreePerson(): number | null {
    return this.personList().find(p => !this.personBusyRoom(p.id))?.id ?? null;
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
    const key = `${this.kind()}|${from}|${to}`;
    if (key === this.formRangeKey) return;
    this.formRangeKey = key;
    this.formChecking.set(true);
    this.fetchEntries(from, to).subscribe({
      next: entries => {
        if (this.formRangeKey !== key) return;
        this.formSchedules.set(entries);
        this.formChecking.set(false);
      },
      error: () => {
        if (this.formRangeKey !== key) return;
        this.formSchedules.set(null);
        this.formChecking.set(false);
      }
    });
  }

  // 3 ca mặc định; chế độ 1 ngày kèm tình trạng của phòng / người trong ngày đó
  shiftOptions(): { key: string; label: string; start: string; end: string; state: 'free' | 'room' | 'doctor'; note: string }[] {
    return this.shiftSlots.map(slot => {
      const base = { key: slot.key, label: slot.label, start: slot.start, end: slot.end };
      if (this.scheduleMode !== 'SINGLE') return { ...base, state: 'free' as const, note: 'Bấm để chọn' };
      const inRoom = this.activeRoomId
        ? this.overlapsOn(this.activeWorkDate, slot.start, slot.end, s => s.roomId === this.activeRoomId) : [];
      // Phòng khám chỉ 1 bác sĩ / ca; phòng CLS nhận thêm KTV
      if (!this.isTech() && inRoom.length) return { ...base, state: 'room' as const, note: inRoom[0].personName };
      const personHit = this.activePersonId
        ? this.overlapOn(this.activeWorkDate, slot.start, slot.end, s => s.personId === this.activePersonId) : undefined;
      if (personHit) {
        return { ...base, state: 'doctor' as const, note: (this.isTech() ? 'KTV' : 'BS') + ' đang trực ' + personHit.roomNumber };
      }
      return { ...base, state: 'free' as const, note: inRoom.length ? `Đã có ${inRoom.length} KTV` : 'Còn trống' };
    });
  }

  private overlapsOn(date: string, start: string, end: string, match: (s: RosterEntry) => boolean): RosterEntry[] {
    if (!date || !start || !end) return NO_ENTRIES;
    const editingId = this.editingEntry()?.id;
    return (this.formSchedules() ?? this.weekSchedules()).filter(s =>
      s.status !== 'CANCELLED'
      && s.id !== editingId
      && s.workDate === date
      && match(s)
      && s.startTime.substring(0, 5) < end
      && s.endTime.substring(0, 5) > start);
  }

  private overlapOn(date: string, start: string, end: string, match: (s: RosterEntry) => boolean): RosterEntry | undefined {
    return this.overlapsOn(date, start, end, match)[0];
  }

  // Sau khi lưu: chuyển bảng phân ca tới tuần chứa ca mới và làm nổi bật ô vừa xếp
  private focusWeekOf(date: string, entryId: number | null): void {
    if (!this.isAdmin() || !date) return;
    const target = new Date(date + 'T00:00:00');
    this.weekStart.set(toIsoDate(mondayOf(target)));
    this.monthStart.set(toIsoDate(firstOfMonth(target)));
    this.highlightId.set(entryId);
    if (entryId !== null) {
      setTimeout(() => {
        if (this.highlightId() === entryId) this.highlightId.set(null);
      }, 4000);
    }
  }

  private findOverlap(match: (s: RosterEntry) => boolean): RosterEntry | undefined {
    if (this.scheduleMode !== 'SINGLE') return undefined;
    return this.overlapOn(this.activeWorkDate, this.activeStartTime, this.activeEndTime, match);
  }

  private shiftKeyOf(s: RosterEntry): string {
    if (this.shiftSlots.some(slot => slot.key === s.shiftType)) return s.shiftType;
    const hour = Number(s.startTime.substring(0, 2));
    return hour < 12 ? 'CA_SÁNG' : hour < 18 ? 'CA_CHIỀU' : 'CA_TỐI';
  }

  // Sau khi thêm / sửa / huỷ / xoá ca: tải lại bảng phân ca, và danh sách nếu đang xem danh sách
  private reloadAfterChange(): void {
    if (this.isAdmin()) this.loadWeek();
    if (this.isAdmin() && this.viewMode() === 'MONTH') this.loadMonth();
    if (!this.isAdmin() || this.viewMode() === 'LIST') this.loadSchedules();
  }

  // Phòng khám (bác sĩ) / phòng cận lâm sàng (KTV), chỉ tải lần đầu
  private ensureRooms(): Observable<ExaminationRoom[]> {
    if (this.rooms().length) return of(this.rooms());
    const tech = this.isTech();
    return (tech ? this.scheduleService.getLabRooms() : this.scheduleService.getAllRooms()).pipe(
      map(res => res.data || []),
      tap(rooms => (tech ? this.labRooms : this.examRooms).set(rooms))
    );
  }

  // Danh sách bác sĩ / KTV để chọn trong form, chỉ tải lần đầu
  private ensurePeople(): Observable<unknown> {
    if (this.isTech()) {
      return this.techList().length ? of(null) : this.scheduleService.getLabTechs().pipe(
        tap(res => this.techList.set((res.data || []).map(t => ({
          id: t.id,
          fullName: t.fullName,
          sub: DEPARTMENT_LABELS[t.department] ?? t.department,
          department: t.department
        })))));
    }
    return this.doctorList().length ? of(null) : this.doctorService.getDoctors().pipe(
      tap(res => this.doctorList.set((res.data || [])
        .filter(d => d.status !== 'LOCKED')
        .map(d => ({ id: d.id, fullName: d.fullName, sub: d.specialtyName || 'Chưa phân khoa' })))));
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
    const kind = this.kind();
    this.loading.set(true);
    const start = this.filterStartDate || undefined;
    const end = this.filterEndDate || undefined;
    let request$: Observable<RosterEntry[]>;
    if (this.isAdmin()) {
      request$ = this.fetchEntries(start, end, this.filterRoomId || undefined, this.filterSpecialtyId || undefined);
    } else if (this.isTech()) {
      request$ = this.scheduleService.getMyStaffShifts(start, end).pipe(map(res => (res.data || []).map(fromShift)));
    } else {
      request$ = this.scheduleService.getMySchedules(start, end).pipe(map(res => (res.data || []).map(fromSchedule)));
    }
    request$.subscribe({
      next: entries => {
        if (kind !== this.kind()) return;
        this.schedules.set(entries);
        this.currentPage.set(1);
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

  // Danh sách người trực và phòng tải ở lần mở form đầu tiên của mỗi loại
  openAddModal(prefill?: { roomId: number; date: string; shiftKey: string }, afterShow?: () => void): void {
    this.openingForm.set(true);
    forkJoin({ people: this.ensurePeople(), rooms: this.ensureRooms() }).subscribe({
      next: () => {
        this.openingForm.set(false);
        this.showAddForm(prefill);
        afterShow?.();
      },
      error: err => {
        this.openingForm.set(false);
        this.showAlert(err.error?.message || `Không tải được danh sách ${this.personLabel().toLowerCase()} / phòng`, 'danger');
      }
    });
  }

  private showAddForm(prefill?: { roomId: number; date: string; shiftKey: string }): void {
    this.batchResult.set(null);
    this.editingEntry.set(null);
    this.selectedDates = [];
    this.activeRoomId = this.rooms()[0]?.id ?? null;
    this.activePersonId = this.personList()[0]?.id ?? null;
    this.activeMaxPatients = 20;
    this.activeNotes = '';
    this.selectShift('CA_SÁNG');
    this.formRangeKey = '';
    this.formSchedules.set(null);

    if (prefill) {
      // Bấm ô trên bảng tuần: điền sẵn phòng, ngày, ca và người đầu tiên còn rảnh
      this.scheduleMode = 'SINGLE';
      this.activeRoomId = prefill.roomId;
      this.activeWorkDate = prefill.date;
      this.selectShift(prefill.shiftKey);
      this.activePersonId = this.firstFreePerson();
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
    this.editingEntry.set(null);
  }

  closeBatchResult(): void {
    this.closeModal();
    this.reloadAfterChange();
  }

  isFormValid(): boolean {
    if (!this.activePersonId || !this.activeRoomId) return false;
    if (!this.isTech() && this.activeMaxPatients <= 0) return false;
    if (!this.activeStartTime || !this.activeEndTime || this.activeStartTime >= this.activeEndTime) return false;
    return this.scheduleMode === 'SINGLE' ? !!this.activeWorkDate : this.selectedFreeDates().length > 0;
  }

  saveSchedule(): void {
    if (!this.isFormValid()) return;
    this.submitting.set(true);

    if (this.scheduleMode === 'SINGLE') {
      const editing = this.editingEntry();
      const workDate = this.activeWorkDate;
      this.saveSingle$(editing).subscribe({
        next: entry => {
          this.showAlert(editing ? 'Cập nhật ca làm việc thành công!' : 'Đăng ký ca làm việc thành công!', 'success');
          this.submitting.set(false);
          this.closeModal();
          this.focusWeekOf(workDate, entry.id);
          this.reloadAfterChange();
        },
        error: err => {
          this.showAlert(err.error?.message || 'Lỗi khi xếp ca trực. Vui lòng kiểm tra lại giờ làm việc.', 'danger');
          this.submitting.set(false);
        }
      });
      return;
    }

    const firstDate = this.selectedFreeDates()[0];
    this.saveBatch$().subscribe({
      next: data => {
        this.submitting.set(false);
        this.focusWeekOf(firstDate, null);
        if (data && data.conflictCount > 0) {
          // Có ngày bị người khác xếp trước trong lúc đang chọn: hiện chi tiết
          this.batchResult.set(data);
        } else {
          this.showAlert(`Đã xếp ${data?.successCount ?? 0} ca trực thành công!`, 'success');
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

  // Tạo / sửa 1 ca: ca bác sĩ gửi kèm số bệnh nhân tối đa, ca KTV gửi kèm ghi chú
  private saveSingle$(editing: RosterEntry | null): Observable<RosterEntry> {
    const base = {
      workDate: this.activeWorkDate,
      shiftType: this.activeShiftKey(),
      startTime: this.activeStartTime,
      endTime: this.activeEndTime
    };
    if (this.isTech()) {
      const request: StaffShiftRequest = {
        ...base, employeeId: this.activePersonId!, roomId: this.activeRoomId!, notes: this.activeNotes.trim() || undefined
      };
      const request$ = editing
        ? this.scheduleService.updateStaffShift(editing.id, request)
        : this.scheduleService.createStaffShift(request);
      return request$.pipe(map(res => fromShift(res.data)));
    }
    const request: WorkScheduleRequest = {
      ...base, doctorId: this.activePersonId!, examinationRoomId: this.activeRoomId!, maxPatients: this.activeMaxPatients
    };
    const request$ = editing
      ? this.scheduleService.updateSchedule(editing.id, request)
      : this.scheduleService.createSchedule(request);
    return request$.pipe(map(res => fromSchedule(res.data)));
  }

  private saveBatch$(): Observable<BatchResult> {
    const base = {
      workDates: this.selectedFreeDates(),
      shiftType: this.activeShiftKey(),
      startTime: this.activeStartTime,
      endTime: this.activeEndTime
    };
    if (this.isTech()) {
      return this.scheduleService.createBatchStaffShifts({
        ...base, employeeId: this.activePersonId!, roomId: this.activeRoomId!, notes: this.activeNotes.trim() || undefined
      }).pipe(map(res => res.data));
    }
    return this.scheduleService.createBatchSchedules({
      ...base, doctorId: this.activePersonId!, examinationRoomId: this.activeRoomId!, maxPatients: this.activeMaxPatients
    }).pipe(map(res => res.data));
  }

  cancelSchedule(item: RosterEntry): void {
    const reason = prompt('Nhập lý do hủy ca trực của bác sĩ ' + item.personName + ':', 'Bác sĩ có lịch công tác đột xuất');
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

  deleteEntry(item: RosterEntry): void {
    if (!confirm(`Bạn có chắc muốn xóa ca làm việc ngày ${item.workDate} của ${this.personLabel().toLowerCase()} ${item.personName}?`)) {
      return;
    }
    const request$ = this.isTech()
      ? this.scheduleService.deleteStaffShift(item.id)
      : this.scheduleService.deleteSchedule(item.id);
    request$.subscribe({
      next: () => {
        this.showAlert('Đã xóa ca làm việc thành công!', 'success');
        if (this.showModal()) this.closeModal();
        this.reloadAfterChange();
      },
      error: err => {
        this.showAlert(err.error?.message || 'Không thể xóa ca làm việc này.', 'danger');
      }
    });
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
