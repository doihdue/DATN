export interface ExaminationRoom {
  id: number;
  roomNumber: string;
  roomName: string;
  floor: number;
  roomType?: 'KHAM' | 'XET_NGHIEM' | 'CHAN_DOAN_HINH_ANH';
}

// Ca trực của KTV tại phòng cận lâm sàng
export interface StaffShift {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode?: string;
  department: string;
  roomId: number;
  roomNumber: string;
  roomName: string;
  workDate: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface StaffShiftRequest {
  employeeId: number;
  roomId: number;
  workDate: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface BatchStaffShiftRequest {
  employeeId: number;
  roomId: number;
  workDates: string[];
  shiftType?: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface BatchStaffShiftResponse {
  totalRequested: number;
  successCount: number;
  conflictCount: number;
  createdShifts: StaffShift[];
  conflictMessages: string[];
}

export interface LabTech {
  id: number;
  fullName: string;
  employeeCode?: string;
  department: string;
}

export interface WorkSchedule {
  id: number;
  workDate: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  currentBookedCount: number;
  remainingSlots: number;
  status: 'AVAILABLE' | 'FULL' | 'CANCELLED';

  doctorId: number;
  doctorName: string;
  academicTitle: string;
  specialtyId: number;
  specialtyName: string;

  examinationRoomId: number;
  roomNumber: string;
  roomName: string;
  floor: number;
}

export interface WorkScheduleRequest {
  doctorId: number;
  examinationRoomId: number;
  workDate: string;
  shiftType?: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export interface BatchWorkScheduleRequest {
  doctorId: number;
  examinationRoomId: number;
  workDates: string[]; // Các ngày chọn trên lịch tháng của bác sĩ
  shiftType?: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
}

export interface BatchWorkScheduleResponse {
  totalRequested: number;
  successCount: number;
  conflictCount: number;
  createdSchedules: WorkSchedule[];
  conflictMessages: string[];
}
