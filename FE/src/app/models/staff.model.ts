export type StaffAccountStatus = 'ACTIVE' | 'LOCKED';

export interface Staff {
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
  userId?: number;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: StaffAccountStatus | string;
  createdAt?: string;
}

export interface StaffRequest {
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
}
