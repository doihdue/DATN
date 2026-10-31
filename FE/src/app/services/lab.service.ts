import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/auth.models';
import { LabService, LabOrder, SendLabOrdersRequest, UpdateLabOrderResultRequest } from '../models/lab.model';
import { MedicalRecordResponse } from '../models/medical-record.model';

@Injectable({
  providedIn: 'root'
})
export class ClinicalLabService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api';

  // 1. Lấy danh mục dịch vụ cận lâm sàng / xét nghiệm
  getLabServices(search?: string): Observable<ApiResponse<LabService[]>> {
    let params = new HttpParams();
    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<ApiResponse<LabService[]>>(`${this.baseUrl}/lab-services`, { params });
  }

  // 1.1 Tạo mới kỹ thuật xét nghiệm (Admin)
  createLabService(service: Partial<LabService>): Observable<ApiResponse<LabService>> {
    return this.http.post<ApiResponse<LabService>>(`${this.baseUrl}/lab-services`, service);
  }

  // 1.2 Cập nhật dịch vụ xét nghiệm (Admin)
  updateLabService(id: number, service: Partial<LabService>): Observable<ApiResponse<LabService>> {
    return this.http.put<ApiResponse<LabService>>(`${this.baseUrl}/lab-services/${id}`, service);
  }

  // 1.3 Xóa dịch vụ xét nghiệm (Admin)
  deleteLabService(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/lab-services/${id}`);
  }

  // 2. Bác sĩ gửi chỉ định cận lâm sàng (Pha 1)
  sendLabOrders(request: SendLabOrdersRequest): Observable<ApiResponse<MedicalRecordResponse>> {
    return this.http.post<ApiResponse<MedicalRecordResponse>>(`${this.baseUrl}/lab-orders/send`, request);
  }

  // 3. Lấy danh sách chỉ định theo mã bệnh án
  getOrdersByRecordId(recordId: number): Observable<ApiResponse<LabOrder[]>> {
    return this.http.get<ApiResponse<LabOrder[]>>(`${this.baseUrl}/lab-orders/record/${recordId}`);
  }

  // 4. Lấy danh sách chỉ định theo mã vé khám
  getOrdersByTicketId(ticketId: number): Observable<ApiResponse<LabOrder[]>> {
    return this.http.get<ApiResponse<LabOrder[]>>(`${this.baseUrl}/lab-orders/ticket/${ticketId}`);
  }

  // 5. Danh sách làm việc của phòng Lab: chỉ định trong ngày + chỉ định còn dang dở
  getWorklist(date: string): Observable<ApiResponse<LabOrder[]>> {
    return this.http.get<ApiResponse<LabOrder[]>>(`${this.baseUrl}/lab-orders`, { params: { date } });
  }

  // 5.1 KTV tiếp nhận mẫu bệnh phẩm (PENDING -> PROCESSING)
  startProcessing(id: number): Observable<ApiResponse<LabOrder>> {
    return this.http.put<ApiResponse<LabOrder>>(`${this.baseUrl}/lab-orders/${id}/start`, null);
  }

  // 6. KTV cập nhật kết quả xét nghiệm & ký duyệt
  updateOrderResult(id: number, request: UpdateLabOrderResultRequest): Observable<ApiResponse<LabOrder>> {
    return this.http.put<ApiResponse<LabOrder>>(`${this.baseUrl}/lab-orders/${id}/result`, request);
  }

  // 7. Hủy chỉ định xét nghiệm (khi chưa có kết quả)
  cancelOrder(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/lab-orders/${id}`);
  }
}
