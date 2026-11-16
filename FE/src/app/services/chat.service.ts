import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ChatReply } from '../models/chat.model';
import { ApiResponse } from '../models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/chat';

  // Mã phiên do server cấp ở tin nhắn đầu tiên; giữ trong bộ nhớ để mỗi lần tải lại trang là một cuộc trò chuyện mới
  private sessionKey: string | null = null;

  sendMessage(message: string): Observable<ChatReply> {
    return this.http
      .post<ApiResponse<ChatReply>>(`${this.baseUrl}/messages`, { sessionKey: this.sessionKey, message })
      .pipe(
        map(res => ({ ...res.data, suggestedSpecialties: res.data.suggestedSpecialties ?? [] })),
        tap(reply => {
          if (reply.sessionKey) {
            this.sessionKey = reply.sessionKey;
          }
        })
      );
  }

  resetSession(): void {
    this.sessionKey = null;
  }
}
