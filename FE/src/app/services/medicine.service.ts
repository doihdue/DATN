import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { Medicine, MedicineRequest } from '../models/medicine.model';

@Injectable({
  providedIn: 'root'
})
export class MedicineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/medicines';

  getMedicines(search?: string, categoryId?: number, activeOnly?: boolean): Observable<ApiResponse<Medicine[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    if (categoryId) {
      params = params.set('categoryId', categoryId.toString());
    }
    if (activeOnly !== undefined) {
      params = params.set('activeOnly', activeOnly.toString());
    }
    return this.http.get<ApiResponse<Medicine[]>>(this.baseUrl, { params });
  }

  getMedicineById(id: number): Observable<ApiResponse<Medicine>> {
    return this.http.get<ApiResponse<Medicine>>(`${this.baseUrl}/${id}`);
  }

  createMedicine(request: MedicineRequest): Observable<ApiResponse<Medicine>> {
    return this.http.post<ApiResponse<Medicine>>(this.baseUrl, request);
  }

  updateMedicine(id: number, request: MedicineRequest): Observable<ApiResponse<Medicine>> {
    return this.http.put<ApiResponse<Medicine>>(`${this.baseUrl}/${id}`, request);
  }

  deleteMedicine(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
