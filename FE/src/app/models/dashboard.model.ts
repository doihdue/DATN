export interface DailyStat {
  date: string;
  dayOfWeek: string;
  totalTickets: number;
  completedExaminations: number;
  avgWaitingMinutes: number;
}

export interface RoomStat {
  roomId: number;
  roomNumber: string;
  roomName: string;
  floor: number;
  activeDoctorName: string;
  specialtyName: string;
  totalTickets: number;
  completedCount: number;
  waitingCount: number;
  avgWaitingMinutes: number;
  utilizationRate: number;
}

export interface DashboardOverview {
  period: 'TODAY' | 'WEEK' | 'MONTH';
  fromDate: string;
  toDate: string;

  // Lượt khám
  totalTickets: number;
  totalExaminationsCompleted: number;
  todayTickets: number;
  todayCompleted: number;

  // Thời gian chờ trung bình
  avgWaitingMinutes: number;
  waitTimeAssessment: 'EXCELLENT' | 'NORMAL' | 'HIGH';

  // Lịch hẹn & Huỷ lịch
  totalAppointments: number;
  confirmedAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  cancellationRate: number; // %

  // Phân bổ trạng thái
  statusDistribution: Record<string, number>;

  // Thống kê theo ngày & theo phòng
  dailyStats: DailyStat[];
  roomStats: RoomStat[];
}
