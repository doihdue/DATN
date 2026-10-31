export interface LabService {
  id: number;
  serviceCode: string;
  serviceName: string;
  price: number;
  referenceRange?: string;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  category?: string;
  description?: string;
  isActive: boolean;
}

export interface LabOrder {
  id: number;
  medicalRecordId?: number;
  labServiceId: number;
  serviceCode: string;
  serviceName: string;
  price: number;
  referenceRange?: string;
  lowerLimit?: number;
  upperLimit?: number;
  unit?: string;
  category?: string;

  orderTime: string;
  resultValue?: string;
  isAbnormal?: boolean;
  conclusion?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  performedTime?: string;
  notes?: string;

  performerId?: number;
  performerName?: string;

  queueTicketId?: number;
  ticketNumber?: string;
  roomNumber?: string;
  patientId?: number;
  patientName?: string;
  patientGender?: string;
  patientYearOfBirth?: number;
}

export interface SendLabOrdersRequest {
  queueTicketId: number;
  patientId?: number;
  doctorId?: number;

  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  vitalSigns?: string;

  symptoms?: string;
  preliminaryDiagnosis?: string;
  notes?: string;

  labServiceIds: number[];
}

export interface UpdateLabOrderResultRequest {
  resultValue: string;
  conclusion?: string;
  notes?: string;
  isAbnormal?: boolean;
}
