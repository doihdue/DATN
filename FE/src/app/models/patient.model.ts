export type PatientAccountStatus = 'ACTIVE' | 'LOCKED';
export type PatientStatusFilter = PatientAccountStatus | 'NO_ACCOUNT';

export interface Patient {
  id: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  phoneNumber?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistorySummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hasAccount: boolean;
  userId?: number;
  username?: string;
  email?: string;
  status?: PatientAccountStatus | string;
  createdAt?: string;
  totalVisits: number;
  lastVisitAt?: string;
}

export interface PatientRequest {
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  phoneNumber?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistorySummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
