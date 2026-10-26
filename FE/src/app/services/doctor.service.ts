import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Doctor, DoctorAccountStatus, DoctorRequest } from '../models/doctor.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/admin/doctors';

  getDoctors(search?: string, specialtyId?: number, status?: string): Observable<ApiResponse<Doctor[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (specialtyId) {
      params = params.set('specialtyId', specialtyId.toString());
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<Doctor[]>>(this.baseUrl, { params });
  }

  getDoctorById(id: number): Observable<ApiResponse<Doctor>> {
    return this.http.get<ApiResponse<Doctor>>(`${this.baseUrl}/${id}`);
  }

  createDoctor(request: DoctorRequest): Observable<ApiResponse<Doctor>> {
    return this.http.post<ApiResponse<Doctor>>(this.baseUrl, request);
  }

  updateDoctor(id: number, request: DoctorRequest): Observable<ApiResponse<Doctor>> {
    return this.http.put<ApiResponse<Doctor>>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: number, status: DoctorAccountStatus): Observable<ApiResponse<Doctor>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<Doctor>>(`${this.baseUrl}/${id}/status`, null, { params });
  }

  deleteDoctor(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
