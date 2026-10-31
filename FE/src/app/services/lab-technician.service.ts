import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { LabTechnician, LabTechnicianRequest, LabTechnicianStatus } from '../models/lab-technician.model';

@Injectable({
  providedIn: 'root'
})
export class LabTechnicianService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/admin/lab-technicians';

  getTechnicians(search?: string, department?: string, status?: string): Observable<ApiResponse<LabTechnician[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (department && department.trim()) {
      params = params.set('department', department.trim());
    }
    if (status && status.trim()) {
      params = params.set('status', status.trim());
    }
    return this.http.get<ApiResponse<LabTechnician[]>>(this.baseUrl, { params });
  }

  getTechnicianById(id: number): Observable<ApiResponse<LabTechnician>> {
    return this.http.get<ApiResponse<LabTechnician>>(`${this.baseUrl}/${id}`);
  }

  createTechnician(request: LabTechnicianRequest): Observable<ApiResponse<LabTechnician>> {
    return this.http.post<ApiResponse<LabTechnician>>(this.baseUrl, request);
  }

  updateTechnician(id: number, request: LabTechnicianRequest): Observable<ApiResponse<LabTechnician>> {
    return this.http.put<ApiResponse<LabTechnician>>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: number, status: LabTechnicianStatus): Observable<ApiResponse<LabTechnician>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<LabTechnician>>(`${this.baseUrl}/${id}/status`, null, { params });
  }

  deleteTechnician(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}

