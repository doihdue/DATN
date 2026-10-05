export interface QueueTicket {
  id: number;
  patientId?: number;
  ticketNumber: string;
  ticketDate: string;
  patientName: string;
  patientPhone: string;
  patientYearOfBirth?: number;
  isEmergency: boolean;
  hasAppointment: boolean;
  priorityScore: number;
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  checkInTime: string;
  callTime?: string;
  startTime?: string;
  endTime?: string;
  estimatedWaitingMinutes: number;
  notes?: string;

  examinationRoomId: number;
  roomNumber: string;
  roomName: string;

  doctorId?: number;
  doctorName?: string;
  specialtyName?: string;
}

export interface CheckInRequest {
  patientId?: number;
  patientName: string;
  patientPhone: string;
  patientYearOfBirth?: number;
  examinationRoomId: number;
  doctorId?: number;
  appointmentId?: number;
  isEmergency?: boolean;
  notes?: string;
}

export interface RoomQueueOverview {
  examinationRoomId: number;
  roomNumber: string;
  roomName: string;
  floor: number;
  doctorId?: number;
  doctorName?: string;
  specialtyName?: string;

  currentExaminingTicket?: QueueTicket;
  currentCalledTicket?: QueueTicket;
  waitingTickets: QueueTicket[];
  skippedTickets: QueueTicket[];
  completedTickets: QueueTicket[];

  totalWaitingCount: number;
  totalExaminedCount: number;
  estimatedWaitMinutes: number;
}

export interface ClinicDisplayBoard {
  roomId: number;
  roomNumber: string;
  roomName: string;
  floor: number;
  doctorName: string;
  specialtyName: string;
  currentExaminingTicketNumber: string;
  currentExaminingPatientName: string;
  currentCalledTicketNumber: string;
  currentCalledPatientName: string;
  upcomingTicketNumbers: string[];
  waitingCount: number;
}

export interface MyTicketStatus {
  ticketNumber: string;
  ticketDate: string;
  patientName: string;
  status: string;
  priorityScore: number;
  roomId: number;
  roomNumber: string;
  roomName: string;
  floor: number;
  doctorName: string;
  specialtyName: string;
  checkInTime: string;
  callTime?: string;
  positionInQueue: number;
  waitingAheadCount: number;
  estimatedWaitingMinutes: number;
}
