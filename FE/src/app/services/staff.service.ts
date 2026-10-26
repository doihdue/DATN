import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Staff, StaffAccountStatus, StaffRequest } from '../models/staff.model';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/admin/staff';

  getStaff(search?: string, status?: string): Observable<ApiResponse<Staff[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<ApiResponse<Staff[]>>(this.baseUrl, { params });
  }

  getStaffById(id: number): Observable<ApiResponse<Staff>> {
    return this.http.get<ApiResponse<Staff>>(`${this.baseUrl}/${id}`);
  }

  createStaff(request: StaffRequest): Observable<ApiResponse<Staff>> {
    return this.http.post<ApiResponse<Staff>>(this.baseUrl, request);
  }

  updateStaff(id: number, request: StaffRequest): Observable<ApiResponse<Staff>> {
    return this.http.put<ApiResponse<Staff>>(`${this.baseUrl}/${id}`, request);
  }

  updateStatus(id: number, status: StaffAccountStatus): Observable<ApiResponse<Staff>> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ApiResponse<Staff>>(`${this.baseUrl}/${id}/status`, null, { params });
  }

  deleteStaff(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
