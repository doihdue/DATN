import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ExaminationRoom, WorkSchedule, WorkScheduleRequest, BatchWorkScheduleRequest, BatchWorkScheduleResponse } from '../models/schedule.model';
import { ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getSchedules(filters?: {
    startDate?: string;
    endDate?: string;
    doctorId?: number;
    specialtyId?: number;
    roomId?: number;
  }): Observable<ApiResponse<WorkSchedule[]>> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.doctorId) params = params.set('doctorId', filters.doctorId.toString());
    if (filters?.specialtyId) params = params.set('specialtyId', filters.specialtyId.toString());
    if (filters?.roomId) params = params.set('roomId', filters.roomId.toString());

    return this.http.get<ApiResponse<WorkSchedule[]>>(`${this.baseUrl}/work-schedules`, { params });
  }

  // Lịch trực của bác sĩ đang đăng nhập (BE tự xác định bác sĩ từ token)
  getMySchedules(startDate?: string, endDate?: string): Observable<ApiResponse<WorkSchedule[]>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<WorkSchedule[]>>(`${this.baseUrl}/work-schedules/my`, { params });
  }

  getAllRooms(): Observable<ApiResponse<ExaminationRoom[]>> {
    return this.http.get<ApiResponse<ExaminationRoom[]>>(`${this.baseUrl}/examination-rooms`);
  }

  createSchedule(request: WorkScheduleRequest): Observable<ApiResponse<WorkSchedule>> {
    return this.http.post<ApiResponse<WorkSchedule>>(`${this.baseUrl}/admin/work-schedules`, request);
  }

  createBatchSchedules(request: BatchWorkScheduleRequest): Observable<ApiResponse<BatchWorkScheduleResponse>> {
    return this.http.post<ApiResponse<BatchWorkScheduleResponse>>(`${this.baseUrl}/admin/work-schedules/batch`, request);
  }

  cancelSchedule(id: number, reason?: string): Observable<ApiResponse<WorkSchedule>> {
    let params = new HttpParams();
    if (reason) params = params.set('reason', reason);
    return this.http.patch<ApiResponse<WorkSchedule>>(`${this.baseUrl}/admin/work-schedules/${id}/cancel`, null, { params });
  }

  deleteSchedule(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/admin/work-schedules/${id}`);
  }
}
