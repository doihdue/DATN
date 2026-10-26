export type DoctorAccountStatus = 'ACTIVE' | 'LOCKED';

export interface Doctor {
  id: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  avatarUrl?: string;
  employeeCode?: string;
  position?: string;
  hireDate?: string;
  academicTitle?: string;
  yearsOfExperience?: number;
  averageConsultationTime?: number;
  biography?: string;
  specialtyId?: number;
  specialtyName?: string;
  userId?: number;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: DoctorAccountStatus | string;
  createdAt?: string;
}

export interface DoctorRequest {
  username?: string;
  password?: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  employeeCode?: string;
  position?: string;
  hireDate?: string;
  specialtyId?: number | null;
  academicTitle?: string;
  yearsOfExperience?: number | null;
  averageConsultationTime?: number | null;
  biography?: string;
}
