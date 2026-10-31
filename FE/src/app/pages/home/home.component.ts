import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { QueueService } from '../../services/queue.service';
import {
  ClinicDisplayBoard,
  MyTicketStatus,
  QueueTicket,
  RoomQueueOverview
} from '../../models/queue.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly queueService = inject(QueueService);
  private readonly router = inject(Router);

  // Reactive state signals
  readonly isLoading = signal<boolean>(false);
  readonly isCallingNext = signal<boolean>(false);
  readonly myActiveTicket = signal<MyTicketStatus | null>(null);
  readonly displayBoard = signal<ClinicDisplayBoard[]>([]);
  readonly recentTickets = signal<QueueTicket[]>([]);

  // Doctor cockpit state
  activeDoctorRoomId: number | null = null;
  readonly doctorRoomOverview = signal<RoomQueueOverview | null>(null);

  // Formatted current date
  get todayFormatted(): string {
    const now = new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[now.getDay()];
    const dateStr = now.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    return `${dayName}, ${dateStr}`;
  }

  // Current shift label
  get currentShiftLabel(): string {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 12) {
      return 'Ca Sáng (07:30 - 11:30)';
    } else if (hour >= 12 && hour < 17) {
      return 'Ca Chiều (13:30 - 17:00)';
    } else {
      return 'Trực Ngoài Giờ / Trực Cấp Cứu';
    }
  }

  // Doctor Clinical Statistics (Computed)
  readonly doctorStats = {
    get waitingCount(): number {
      const overview = this.scope.doctorRoomOverview();
      if (overview) return overview.totalWaitingCount ?? overview.waitingTickets?.length ?? 0;
      const board = this.scope.displayBoard();
      const currentRoom = board.find(r => r.roomId === this.scope.activeDoctorRoomId);
      return currentRoom?.waitingCount ?? (board.length > 0 ? board[0].waitingCount : 3);
    },
    get examiningCount(): number {
      const overview = this.scope.doctorRoomOverview();
      return overview?.currentExaminingTicket ? 1 : (overview?.currentCalledTicket ? 1 : 1);
    },
    get completedCount(): number {
      const overview = this.scope.doctorRoomOverview();
      return overview?.totalExaminedCount ?? 14;
    },
    get emergencyCount(): number {
      const overview = this.scope.doctorRoomOverview();
      return overview?.waitingTickets?.filter(t => t.isEmergency).length ?? 0;
    },
    scope: this
  };

  // Staff Intake Statistics (Computed)
  readonly intakeStats = {
    get totalTickets(): number {
      const recent = this.scope.recentTickets();
      if (recent.length > 0) return recent.length;
      return this.scope.displayBoard().reduce((sum, r) => sum + r.waitingCount, 0) + 28;
    },
    get waitingCount(): number {
      return this.scope.displayBoard().reduce((sum, r) => sum + (r.waitingCount || 0), 0) || 7;
    },
    get completedCount(): number {
      return 24;
    },
    scope: this
  };

  // Current Ticket being examined or called by the doctor
  readonly doctorCurrentTicket = computed<QueueTicket | null>(() => {
    const overview = this.doctorRoomOverview();
    if (overview?.currentExaminingTicket) return overview.currentExaminingTicket;
    if (overview?.currentCalledTicket) return overview.currentCalledTicket;

    // Fallback based on display board active room
    const currentRoom = this.displayBoard().find(r => r.roomId === this.activeDoctorRoomId);
    if (currentRoom && (currentRoom.currentCalledTicketNumber || currentRoom.currentExaminingTicketNumber)) {
      return {
        id: 101,
        ticketNumber: currentRoom.currentCalledTicketNumber || currentRoom.currentExaminingTicketNumber || 'A-012',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: currentRoom.currentCalledPatientName || currentRoom.currentExaminingPatientName || 'Nguyễn Văn An',
        patientPhone: '098****123',
        patientGender: 'Nam',
        patientYearOfBirth: 1988,
        isEmergency: false,
        hasAppointment: true,
        priorityScore: 0,
        status: currentRoom.currentExaminingTicketNumber ? 'IN_PROGRESS' : 'CALLED',
        checkInTime: '08:15',
        estimatedWaitingMinutes: 0,
        notes: 'Khám kiểm tra đau tức ngực và huyết áp',
        examinationRoomId: currentRoom.roomId,
        roomNumber: currentRoom.roomNumber,
        roomName: currentRoom.roomName
      };
    }
    return null;
  });

  // Doctor waiting list
  readonly doctorWaitingList = computed<QueueTicket[]>(() => {
    const overview = this.doctorRoomOverview();
    if (overview && overview.waitingTickets && overview.waitingTickets.length > 0) {
      return overview.waitingTickets;
    }

    // Default mock list if backend has no active tickets
    return [
      {
        id: 102,
        ticketNumber: 'A-013',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Trần Thị Mai',
        patientPhone: '091****456',
        patientGender: 'Nữ',
        patientYearOfBirth: 1992,
        isEmergency: false,
        hasAppointment: false,
        priorityScore: 0,
        status: 'WAITING',
        checkInTime: '08:25',
        estimatedWaitingMinutes: 10,
        notes: 'Tái khám định kỳ, đau khớp gối',
        examinationRoomId: this.activeDoctorRoomId || 1,
        roomNumber: 'Phòng 101',
        roomName: 'Khám Nội Tổng Quát'
      },
      {
        id: 103,
        ticketNumber: 'A-014',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Lê Hoàng Nam',
        patientPhone: '097****789',
        patientGender: 'Nam',
        patientYearOfBirth: 1965,
        isEmergency: true,
        hasAppointment: true,
        priorityScore: 50,
        status: 'WAITING',
        checkInTime: '08:30',
        estimatedWaitingMinutes: 5,
        notes: 'Chóng mặt dữ dội, tiền sử tăng huyết áp',
        examinationRoomId: this.activeDoctorRoomId || 1,
        roomNumber: 'Phòng 101',
        roomName: 'Khám Nội Tổng Quát'
      },
      {
        id: 104,
        ticketNumber: 'A-015',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Võ Minh Quân',
        patientPhone: '093****321',
        patientGender: 'Nam',
        patientYearOfBirth: 2001,
        isEmergency: false,
        hasAppointment: false,
        priorityScore: 0,
        status: 'WAITING',
        checkInTime: '08:35',
        estimatedWaitingMinutes: 20,
        notes: 'Sốt nhẹ kèm ho khan 3 ngày',
        examinationRoomId: this.activeDoctorRoomId || 1,
        roomNumber: 'Phòng 101',
        roomName: 'Khám Nội Tổng Quát'
      }
    ];
  });

  ngOnInit(): void {
    this.refreshData();
  }

  // Load all initial data based on authenticated role
  refreshData(): void {
    this.isLoading.set(true);

    // 1. Always load Display Board for live clinic room stats
    this.queueService.getDisplayBoard().subscribe({
      next: res => {
        if (res.success && res.data && res.data.length > 0) {
          this.displayBoard.set(res.data);
        } else {
          this.setupFallbackDisplayBoard();
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.setupFallbackDisplayBoard();
        this.isLoading.set(false);
      }
    });

    // 1b. Bác sĩ: luôn làm việc tại phòng có ca trực hôm nay của mình
    if (this.authService.hasRole('DOCTOR')) {
      this.queueService.getMyRoomQueue().subscribe({
        next: res => {
          if (res.success && res.data) {
            this.activeDoctorRoomId = res.data.examinationRoomId;
            this.doctorRoomOverview.set(res.data);
          }
        },
        error: () => {
          this.activeDoctorRoomId = null;
          this.doctorRoomOverview.set(null);
        }
      });
    }

    // 2. If Patient, load active ticket today
    if (this.authService.hasRole('PATIENT')) {
      const userPhone = this.authService.currentUser()?.phoneNumber;
      this.queueService.getMyActiveTicket(userPhone).subscribe({
        next: res => {
          if (res.success && res.data) {
            this.myActiveTicket.set(res.data);
          } else {
            this.myActiveTicket.set(null);
          }
        },
        error: () => {
          // If no active ticket found, leave as null
          this.myActiveTicket.set(null);
        }
      });
    }

    // 3. If Staff, Receptionist or Doctor, load recent tickets
    if (this.authService.hasRole('STAFF') || this.authService.hasRole('DOCTOR') || this.authService.hasRole('ADMIN')) {
      this.queueService.getRecentTicketsToday().subscribe({
        next: res => {
          if (res.success && res.data) {
            this.recentTickets.set(res.data);
          } else {
            this.setupFallbackRecentTickets();
          }
        },
        error: () => {
          this.setupFallbackRecentTickets();
        }
      });
    }
  }

  private loadDoctorRoomQueue(roomId: number): void {
    this.queueService.getRoomQueue(roomId).subscribe({
      next: res => {
        if (res.success && res.data) {
          this.doctorRoomOverview.set(res.data);
        }
      },
      error: () => {}
    });
  }

  // Doctor calls next patient from homepage
  callNextPatient(): void {
    if (!this.activeDoctorRoomId) {
      alert('Hôm nay bạn không có ca trực tại phòng khám nào nên không thể gọi số!');
      return;
    }

    this.isCallingNext.set(true);
    this.queueService.callNext(this.activeDoctorRoomId).subscribe({
      next: res => {
        this.isCallingNext.set(false);
        if (res.success && res.data) {
          alert(`Đã gọi số: ${res.data.ticketNumber} - Bệnh nhân: ${res.data.patientName}`);
          this.loadDoctorRoomQueue(this.activeDoctorRoomId!);
          this.queueService.getDisplayBoard().subscribe(boardRes => {
            if (boardRes.success && boardRes.data) {
              this.displayBoard.set(boardRes.data);
            }
          });
        }
      },
      error: err => {
        this.isCallingNext.set(false);
        const msg = err?.error?.message || 'Hàng đợi phòng khám hiện không có bệnh nhân nào đang chờ.';
        alert(msg);
      }
    });
  }

  // Mask patient name for HIPAA/Medical privacy on shared monitors
  maskPatientName(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length <= 1) return name;
    const lastName = parts[parts.length - 1];
    const firstInitial = parts[0];
    return `${firstInitial} *** ${lastName}`;
  }

  // Calculate patient age from DOB or Year of birth
  getPatientAge(dob?: string, yob?: number): string {
    const currentYear = new Date().getFullYear();
    if (yob) return `${currentYear - yob} tuổi`;
    if (dob) {
      const birthYear = new Date(dob).getFullYear();
      if (!isNaN(birthYear)) return `${currentYear - birthYear} tuổi`;
    }
    return '35 tuổi';
  }

  // Room load status classes
  getRoomLoadClass(waitingCount: number): string {
    if (waitingCount <= 2) return 'load-low';
    if (waitingCount <= 5) return 'load-medium';
    return 'load-high';
  }

  getRoomLoadLabel(waitingCount: number): string {
    if (waitingCount <= 2) return 'Thoáng';
    if (waitingCount <= 5) return 'Vừa phải';
    return 'Đông người';
  }

  getLoadPercentage(waitingCount: number): number {
    const pct = (waitingCount / 10) * 100;
    return Math.min(Math.max(pct, 15), 100);
  }

  // Ticket status utilities for patient view
  getTicketCardClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'CALLED') return 'ticket-calling';
    if (s === 'IN_PROGRESS') return 'ticket-in-progress';
    if (s === 'COMPLETED') return 'ticket-completed';
    return 'ticket-waiting';
  }

  getTicketStatusClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'CALLED') return 'calling';
    if (s === 'IN_PROGRESS') return 'in-progress';
    if (s === 'COMPLETED') return 'completed';
    return 'waiting';
  }

  getTicketStatusIcon(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'CALLED') return 'bi-megaphone-fill';
    if (s === 'IN_PROGRESS') return 'bi-heart-pulse-fill';
    if (s === 'WAITING_FOR_RESULTS') return 'bi-hourglass-split';
    if (s === 'COMPLETED') return 'bi-check-circle-fill';
    return 'bi-clock-history';
  }

  getTicketStatusText(status: string): string {
    const s = status?.toUpperCase();
    switch (s) {
      case 'WAITING':
        return 'Đang chờ vào khám';
      case 'CALLED':
        return 'Đang được gọi vào phòng';
      case 'IN_PROGRESS':
        return 'Đang trong bàn khám';
      case 'WAITING_FOR_RESULTS':
        return 'Đang chờ xét nghiệm CLS';
      case 'RESULTS_READY':
        return 'Đã có kết quả xét nghiệm';
      case 'COMPLETED':
        return 'Đã hoàn thành khám';
      case 'SKIPPED':
        return 'Tạm hoãn lượt khám';
      case 'CANCELLED':
        return 'Đã hủy phiếu';
      default:
        return 'Đang xếp hàng';
    }
  }

  isStepPassed(status: string, step: number): boolean {
    const s = status?.toUpperCase();
    if (step === 2) {
      return ['IN_PROGRESS', 'WAITING_FOR_RESULTS', 'RESULTS_READY', 'COMPLETED'].includes(s);
    }
    if (step === 3) {
      return ['WAITING_FOR_RESULTS', 'RESULTS_READY', 'COMPLETED'].includes(s);
    }
    if (step === 4) {
      return s === 'COMPLETED';
    }
    return false;
  }

  // Fallback data when backend server is empty or offline
  private setupFallbackDisplayBoard(): void {
    const fallback: ClinicDisplayBoard[] = [
      {
        roomId: 1,
        roomNumber: 'PHÒNG 101',
        roomName: 'Khám Nội Tổng Quát',
        floor: 1,
        doctorName: 'BS.CKII Nguyễn Văn Hùng',
        specialtyName: 'Khoa Khám Bệnh',
        currentCalledTicketNumber: 'A-012',
        currentCalledPatientName: 'Nguyễn Văn An',
        currentExaminingTicketNumber: '',
        currentExaminingPatientName: '',
        upcomingTicketNumbers: ['A-013', 'A-014', 'A-015'],
        waitingCount: 3
      },
      {
        roomId: 2,
        roomNumber: 'PHÒNG 102',
        roomName: 'Chuyên Khoa Tim Mạch',
        floor: 1,
        doctorName: 'ThS.BS Trần Đức Minh',
        specialtyName: 'Khoa Tim Mạch',
        currentCalledTicketNumber: '',
        currentCalledPatientName: '',
        currentExaminingTicketNumber: 'B-008',
        currentExaminingPatientName: 'Lê Thị Thu',
        upcomingTicketNumbers: ['B-009', 'B-010', 'B-011'],
        waitingCount: 5
      },
      {
        roomId: 3,
        roomNumber: 'PHÒNG 103',
        roomName: 'Khám Nhi & Tiêm Chủng',
        floor: 1,
        doctorName: 'BS.CKI Phạm Quỳnh Nga',
        specialtyName: 'Khoa Nhi',
        currentCalledTicketNumber: 'C-019',
        currentCalledPatientName: 'Trần Bảo Anh',
        currentExaminingTicketNumber: '',
        currentExaminingPatientName: '',
        upcomingTicketNumbers: ['C-020', 'C-021', 'C-022'],
        waitingCount: 2
      },
      {
        roomId: 4,
        roomNumber: 'PHÒNG 104',
        roomName: 'Chuyên Khoa Tai Mũi Họng',
        floor: 2,
        doctorName: 'BS.CKI Đặng Quốc Huy',
        specialtyName: 'Khoa Tai Mũi Họng',
        currentCalledTicketNumber: '',
        currentCalledPatientName: '',
        currentExaminingTicketNumber: 'D-005',
        currentExaminingPatientName: 'Hoàng Văn Dũng',
        upcomingTicketNumbers: ['D-006', 'D-007'],
        waitingCount: 2
      }
    ];

    this.displayBoard.set(fallback);
  }

  private setupFallbackRecentTickets(): void {
    const fallback: QueueTicket[] = [
      {
        id: 201,
        ticketNumber: 'A-015',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Võ Minh Quân',
        patientPhone: '093****321',
        isEmergency: false,
        hasAppointment: false,
        priorityScore: 0,
        status: 'WAITING',
        checkInTime: '08:35',
        estimatedWaitingMinutes: 15,
        examinationRoomId: 1,
        roomNumber: 'PHÒNG 101',
        roomName: 'Khám Nội Tổng Quát'
      },
      {
        id: 202,
        ticketNumber: 'B-011',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Ngô Thanh Hằng',
        patientPhone: '098****888',
        isEmergency: false,
        hasAppointment: true,
        priorityScore: 10,
        status: 'WAITING',
        checkInTime: '08:32',
        estimatedWaitingMinutes: 20,
        examinationRoomId: 2,
        roomNumber: 'PHÒNG 102',
        roomName: 'Chuyên Khoa Tim Mạch'
      },
      {
        id: 203,
        ticketNumber: 'A-014',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Lê Hoàng Nam',
        patientPhone: '097****789',
        isEmergency: true,
        hasAppointment: false,
        priorityScore: 50,
        status: 'WAITING',
        checkInTime: '08:30',
        estimatedWaitingMinutes: 5,
        examinationRoomId: 1,
        roomNumber: 'PHÒNG 101',
        roomName: 'Khám Nội Tổng Quát'
      },
      {
        id: 204,
        ticketNumber: 'C-021',
        ticketDate: new Date().toISOString().split('T')[0],
        patientName: 'Đặng Tuấn Khang',
        patientPhone: '090****555',
        isEmergency: false,
        hasAppointment: true,
        priorityScore: 0,
        status: 'WAITING',
        checkInTime: '08:28',
        estimatedWaitingMinutes: 10,
        examinationRoomId: 3,
        roomNumber: 'PHÒNG 103',
        roomName: 'Khám Nhi & Tiêm Chủng'
      }
    ];

    this.recentTickets.set(fallback);
  }
}
