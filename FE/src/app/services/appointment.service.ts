import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Appointment, BookAppointmentRequest } from '../models/appointment.model';
import { WorkSchedule } from '../models/schedule.model';
import { QueueTicket } from '../models/queue.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/appointments';

  getAvailableSchedules(filters?: {
    startDate?: string;
    endDate?: string;
    doctorId?: number | null;
    specialtyId?: number | null;
  }): Observable<ApiResponse<WorkSchedule[]>> {
    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);
    if (filters?.doctorId) params = params.set('doctorId', filters.doctorId.toString());
    if (filters?.specialtyId) params = params.set('specialtyId', filters.specialtyId.toString());
    return this.http.get<ApiResponse<WorkSchedule[]>>(`${this.baseUrl}/available-schedules`, { params });
  }

  bookAppointment(request: BookAppointmentRequest): Observable<ApiResponse<Appointment>> {
    return this.http.post<ApiResponse<Appointment>>(this.baseUrl, request);
  }

  getMyAppointments(): Observable<ApiResponse<Appointment[]>> {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.baseUrl}/my`);
  }

  getAppointmentById(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.get<ApiResponse<Appointment>>(`${this.baseUrl}/${id}`);
  }

  cancelAppointment(id: number, reason?: string): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  rescheduleAppointment(id: number, newWorkScheduleId: number): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${this.baseUrl}/${id}/reschedule`, { newWorkScheduleId });
  }

  // ===== Lễ tân / Admin =====

  searchAppointments(filters?: {
    date?: string;
    status?: string;
    doctorId?: number | null;
    keyword?: string;
  }): Observable<ApiResponse<Appointment[]>> {
    let params = new HttpParams();
    if (filters?.date) params = params.set('date', filters.date);
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.doctorId) params = params.set('doctorId', filters.doctorId.toString());
    if (filters?.keyword) params = params.set('keyword', filters.keyword);
    return this.http.get<ApiResponse<Appointment[]>>(this.baseUrl, { params });
  }

  confirmAppointment(id: number): Observable<ApiResponse<Appointment>> {
    return this.http.patch<ApiResponse<Appointment>>(`${this.baseUrl}/${id}/confirm`, null);
  }

  checkInAppointment(id: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/${id}/check-in`, null);
  }
}
