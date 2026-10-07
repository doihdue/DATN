import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { MedicineCategory, MedicineCategoryRequest } from '../models/medicine-category.model';

@Injectable({
  providedIn: 'root'
})
export class MedicineCategoryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/medicine-categories';

  getCategories(activeOnly: boolean = false): Observable<ApiResponse<MedicineCategory[]>> {
    let params = new HttpParams();
    if (activeOnly) {
      params = params.set('activeOnly', 'true');
    }
    return this.http.get<ApiResponse<MedicineCategory[]>>(this.baseUrl, { params });
  }

  getCategoryById(id: number): Observable<ApiResponse<MedicineCategory>> {
    return this.http.get<ApiResponse<MedicineCategory>>(`${this.baseUrl}/${id}`);
  }

  createCategory(request: MedicineCategoryRequest): Observable<ApiResponse<MedicineCategory>> {
    return this.http.post<ApiResponse<MedicineCategory>>(this.baseUrl, request);
  }

  updateCategory(id: number, request: MedicineCategoryRequest): Observable<ApiResponse<MedicineCategory>> {
    return this.http.put<ApiResponse<MedicineCategory>>(`${this.baseUrl}/${id}`, request);
  }

  deleteCategory(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`);
  }
}
