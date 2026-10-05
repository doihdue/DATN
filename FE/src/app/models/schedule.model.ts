export interface ExaminationRoom {
  id: number;
  roomNumber: string;
  roomName: string;
  floor: number;
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
  status?: string;
}
