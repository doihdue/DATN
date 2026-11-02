import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Patient, PatientAccountStatus, PatientRequest } from '../models/patient.model';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/admin/patients';

  getPatients(search?: string, gender?: string, status?: string): Observable<ApiResponse<Patient[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (gender && gender.trim()) {
      params = params.set('gender', gender.trim());
    }
    if (status && status.trim()) {
      params = params.set('status', status.trim());
    }
    return this.http.get<ApiResponse<Patient[]>>(this.baseUrl, { params });
  }

  getPatientById(id: number): Observable<ApiResponse<Patient>> {
    return this.http.get<ApiResponse<Patient>>(`${this.baseUrl}/${id}`);
  }

  createPatient(request: PatientRequest): Observable<ApiResponse<Patient>> {
    return this.http.post<ApiResponse<Patient>>(this.baseUrl, request);
  }

  updatePatient(id: number, request: PatientRequest): Observable<ApiResponse<Patient>> {
    return this.http.put<ApiResponse<Patient>>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: number, status: PatientAccountStatus): Observable<ApiResponse<Patient>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<Patient>>(`${this.baseUrl}/${id}/status`, null, { params });
  }

  deletePatient(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
