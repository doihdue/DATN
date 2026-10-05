import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CheckInRequest,
  ClinicDisplayBoard,
  MyTicketStatus,
  QueueTicket,
  RoomQueueOverview
} from '../models/queue.model';
import { ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/queue';

  checkIn(request: CheckInRequest): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/check-in`, request);
  }

  getDisplayBoard(): Observable<ApiResponse<ClinicDisplayBoard[]>> {
    return this.http.get<ApiResponse<ClinicDisplayBoard[]>>(`${this.baseUrl}/display-board`);
  }

  getMyTicketStatus(ticketNumber: string): Observable<ApiResponse<MyTicketStatus>> {
    return this.http.get<ApiResponse<MyTicketStatus>>(`${this.baseUrl}/my-ticket/${ticketNumber}`);
  }

  getTicketById(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.get<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}`);
  }

  getRoomQueue(roomId: number): Observable<ApiResponse<RoomQueueOverview>> {
    return this.http.get<ApiResponse<RoomQueueOverview>>(`${this.baseUrl}/room/${roomId}`);
  }

  callNext(roomId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/room/${roomId}/call-next`, {});
  }

  startExamination(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}/start`, {});
  }

  completeExamination(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}/complete`, {});
  }

  skipTicket(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}/skip`, {});
  }

  recallTicket(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}/recall`, {});
  }

  setEmergency(ticketId: number): Observable<ApiResponse<QueueTicket>> {
    return this.http.post<ApiResponse<QueueTicket>>(`${this.baseUrl}/ticket/${ticketId}/emergency`, {});
  }
}
