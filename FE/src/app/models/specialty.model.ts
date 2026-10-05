export interface Specialty {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  doctorCount: number;
}

export interface DoctorSimple {
  id: number;
  fullName: string;
  employeeCode: string;
  academicTitle: string;
  yearsOfExperience: number;
  averageConsultationTime: number;
  specialtyName?: string;
}

export interface SpecialtyDetail extends Specialty {
  doctors: DoctorSimple[];
}

export interface SpecialtyRequest {
  name: string;
  description?: string;
  iconUrl?: string;
}
