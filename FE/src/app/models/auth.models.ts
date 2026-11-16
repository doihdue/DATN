export interface UserSummary {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  status: string;
  personId?: number;
  position?: string;
  department?: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;

  // Bác sĩ
  academicTitle?: string;
  biography?: string;
  yearsOfExperience?: number;

  // Bệnh nhân
  bloodGroup?: string;
  allergies?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  phoneNumber?: string;
  status: string;
  roles: string[];

  // Person
  personId?: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  nationalId?: string;
  avatarUrl?: string;

  // Employee / Doctor / LabTech
  employeeCode?: string;
  position?: string;
  department?: string;
  academicTitle?: string;
  yearsOfExperience?: number;
  biography?: string;
  specialtyId?: number;
  specialtyName?: string;

  // Patient
  bloodGroup?: string;
  allergies?: string;
  medicalHistorySummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}
