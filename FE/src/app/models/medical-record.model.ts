export type { Medicine } from './medicine.model';

export interface PrescriptionItemRequest {
  medicineId: number;
  quantity: number;
  dosage?: string;
  route?: string;
  daysSupply?: number;
  instructions?: string;
  // UI helper fields
  _medicineName?: string;
  _unit?: string;
}

export interface PrescriptionItemResponse {
  id: number;
  medicineId: number;
  medicineName: string;
  activeIngredient?: string;
  dosageForm?: string;
  unit?: string;
  quantity: number;
  dosage?: string;
  route?: string;
  daysSupply?: number;
  instructions?: string;
}

export interface PrescriptionResponse {
  id: number;
  doctorAdvice?: string;
  createdAt: string;
  items: PrescriptionItemResponse[];
}

export interface CreateMedicalRecordRequest {
  queueTicketId?: number;
  patientId: number;
  doctorId?: number;
  appointmentId?: number;

  // Chỉ số sinh tồn
  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  vitalSigns?: string;

  // Triệu chứng & Chẩn đoán
  symptoms: string;
  preliminaryDiagnosis?: string;
  finalDiagnosis: string;
  icd10Code?: string;
  notes?: string;

  // Hẹn ngày tái khám (Extend UC)
  revisitDate?: string;
  revisitNotes?: string;

  // Kê đơn thuốc (Extend UC)
  prescriptionAdvice?: string;
  prescriptionItems?: PrescriptionItemRequest[];
}

export interface MedicalRecordResponse {
  id: number;
  createdAt: string;

  queueTicketId?: number;
  ticketNumber?: string;
  appointmentId?: number;

  patientId: number;
  patientName: string;
  patientDob?: string;
  patientGender?: string;
  patientPhone?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistorySummary?: string;

  doctorId?: number;
  doctorName?: string;
  doctorTitle?: string;
  specialtyName?: string;

  bloodPressure?: string;
  heartRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  vitalSigns?: string;

  symptoms: string;
  preliminaryDiagnosis?: string;
  finalDiagnosis: string;
  icd10Code?: string;
  notes?: string;

  revisitDate?: string;
  revisitNotes?: string;

  prescription?: PrescriptionResponse;
}

export interface PatientMedicalHistoryResponse {
  patientId: number;
  patientName: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistorySummary?: string;
  totalExaminations: number;
  records: MedicalRecordResponse[];
}
