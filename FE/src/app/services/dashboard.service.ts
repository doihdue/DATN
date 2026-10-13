import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { DashboardOverview } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/dashboard';

  getOverview(period: 'TODAY' | 'WEEK' | 'MONTH' = 'WEEK', roomId?: number): Observable<ApiResponse<DashboardOverview>> {
    let params = new HttpParams().set('period', period);
    if (roomId) {
      params = params.set('roomId', roomId.toString());
    }
    return this.http.get<ApiResponse<DashboardOverview>>(`${this.baseUrl}/overview`, { params });
  }
}
