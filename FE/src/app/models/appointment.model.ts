export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';

export interface Appointment {
  id: number;
  appointmentCode: string;
  bookingNumber: number;
  appointmentDate: string;
  estimatedStartTime: string;
  reasonForVisit?: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  createdAt: string;
  confirmedAt?: string;

  changeDeadline: string;
  canModify: boolean;

  patientId: number;
  patientName: string;
  patientPhone?: string;
  patientDob?: string;

  doctorId: number;
  doctorName: string;
  academicTitle?: string;
  specialtyId?: number;
  specialtyName?: string;
  workScheduleId: number;
  shiftType?: string;
  shiftStartTime: string;
  shiftEndTime: string;
  examinationRoomId?: number;
  roomNumber?: string;
  roomName?: string;
  floor?: number;

  queueTicketId?: number;
  queueTicketNumber?: string;
}

export interface BookAppointmentRequest {
  workScheduleId: number;
  reasonForVisit?: string;
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CHECKED_IN: 'Đã check-in',
  COMPLETED: 'Đã khám xong',
  CANCELLED: 'Đã huỷ'
};
