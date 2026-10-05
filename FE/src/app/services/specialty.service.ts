import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Specialty, SpecialtyDetail, SpecialtyRequest } from '../models/specialty.model';
import { ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class SpecialtyService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  getAllSpecialties(): Observable<ApiResponse<Specialty[]>> {
    return this.http.get<ApiResponse<Specialty[]>>(`${this.baseUrl}/specialties`);
  }

  getSpecialtyById(id: number): Observable<ApiResponse<SpecialtyDetail>> {
    return this.http.get<ApiResponse<SpecialtyDetail>>(`${this.baseUrl}/specialties/${id}`);
  }

  createSpecialty(request: SpecialtyRequest): Observable<ApiResponse<Specialty>> {
    return this.http.post<ApiResponse<Specialty>>(`${this.baseUrl}/admin/specialties`, request);
  }

  updateSpecialty(id: number, request: SpecialtyRequest): Observable<ApiResponse<Specialty>> {
    return this.http.put<ApiResponse<Specialty>>(`${this.baseUrl}/admin/specialties/${id}`, request);
  }

  deleteSpecialty(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/admin/specialties/${id}`);
  }
}
