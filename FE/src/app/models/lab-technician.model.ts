export type LabTechnicianStatus = 'ACTIVE' | 'LOCKED';
export type LabDepartmentType = 'XET_NGHIEM' | 'CHAN_DOAN_HINH_ANH';

export interface LabTechnician {
  id: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  avatarUrl?: string;
  employeeCode?: string;
  department: string; // 'XET_NGHIEM' | 'CHAN_DOAN_HINH_ANH'
  position?: string;
  hireDate?: string;
  userId?: number;
  username?: string;
  email?: string;
  phoneNumber?: string;
  status?: LabTechnicianStatus | string;
  createdAt?: string;
}

export interface LabTechnicianRequest {
  username?: string;
  password?: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  avatarUrl?: string;
  employeeCode?: string;
  department: string;
  position?: string;
  hireDate?: string;
}

