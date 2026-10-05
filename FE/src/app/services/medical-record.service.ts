import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import {
  Medicine,
  CreateMedicalRecordRequest,
  MedicalRecordResponse,
  PatientMedicalHistoryResponse
} from '../models/medical-record.model';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  // 1. Tìm kiếm và lấy danh mục thuốc
  getMedicines(search?: string): Observable<ApiResponse<Medicine[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<Medicine[]>>(`${this.baseUrl}/medicines`, { params });
  }

  // 2. Chi tiết thuốc theo ID
  getMedicineById(id: number): Observable<ApiResponse<Medicine>> {
    return this.http.get<ApiResponse<Medicine>>(`${this.baseUrl}/medicines/${id}`);
  }

  // 3. Tạo hồ sơ khám bệnh & kê đơn & hẹn tái khám
  createMedicalRecord(request: CreateMedicalRecordRequest): Observable<ApiResponse<MedicalRecordResponse>> {
    return this.http.post<ApiResponse<MedicalRecordResponse>>(`${this.baseUrl}/medical-records`, request);
  }

  // 4. Lấy chi tiết hồ sơ bệnh án theo ID (để xem lại hoặc in ấn)
  getMedicalRecordById(id: number): Observable<ApiResponse<MedicalRecordResponse>> {
    return this.http.get<ApiResponse<MedicalRecordResponse>>(`${this.baseUrl}/medical-records/${id}`);
  }

  // 5. Lấy hồ sơ bệnh án theo số phiếu khám
  getMedicalRecordByTicketId(ticketId: number): Observable<ApiResponse<MedicalRecordResponse>> {
    return this.http.get<ApiResponse<MedicalRecordResponse>>(`${this.baseUrl}/medical-records/ticket/${ticketId}`);
  }

  // 6. Bác sĩ xem tiền sử bệnh của bệnh nhân (Lịch sử các lần khám trước)
  getPatientMedicalHistory(patientId: number): Observable<ApiResponse<PatientMedicalHistoryResponse>> {
    return this.http.get<ApiResponse<PatientMedicalHistoryResponse>>(`${this.baseUrl}/medical-records/patient/${patientId}/history`);
  }

  // 7. Lấy danh sách bệnh án do bác sĩ đã khám
  getDoctorRecords(doctorId: number): Observable<ApiResponse<MedicalRecordResponse[]>> {
    return this.http.get<ApiResponse<MedicalRecordResponse[]>>(`${this.baseUrl}/medical-records/doctor/${doctorId}`);
  }
}
