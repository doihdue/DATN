import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { ChatHistoryMessage, ChatReply } from '../models/chat.model';
import { ApiResponse } from '../models/auth.models';

const SESSION_STORAGE_KEY = 'medqueue.chat.sessionKey';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:8080/api/chat';

  // Mã phiên do server cấp ở tin nhắn đầu tiên. Lưu trong sessionStorage (không lưu nội dung tin nhắn)
  // để tải lại trang vẫn tiếp tục được cuộc trò chuyện; đóng tab là mất, server vẫn kiểm tra chủ phiên.
  private sessionKey: string | null = readStoredKey();

  hasSession(): boolean {
    return this.sessionKey !== null;
  }

  sendMessage(message: string): Observable<ChatReply> {
    return this.http
      .post<ApiResponse<ChatReply>>(`${this.baseUrl}/messages`, { sessionKey: this.sessionKey, message })
      .pipe(
        map(res => ({
          ...res.data,
          suggestedSpecialties: res.data.suggestedSpecialties ?? [],
          availableSchedules: res.data.availableSchedules ?? []
        })),
        tap(reply => {
          if (reply.sessionKey) {
            this.setSessionKey(reply.sessionKey);
          }
        })
      );
  }

  /** Lấy lại các tin nhắn của phiên hiện tại; trả về rỗng nếu chưa có phiên. */
  loadHistory(): Observable<ChatHistoryMessage[]> {
    const key = this.sessionKey;
    if (!key) {
      return of([]);
    }
    return this.http
      .get<ApiResponse<ChatHistoryMessage[]>>(`${this.baseUrl}/sessions/${encodeURIComponent(key)}/messages`)
      .pipe(map(res => (res.data ?? []).map(message => ({
        ...message,
        suggestedSpecialties: message.suggestedSpecialties ?? []
      }))));
  }

  resetSession(): void {
    this.setSessionKey(null);
  }

  private setSessionKey(key: string | null): void {
    this.sessionKey = key;
    try {
      if (key) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, key);
      } else {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // Trình duyệt chặn storage (chế độ riêng tư...): vẫn chat được, chỉ không giữ được khi tải lại trang
    }
  }
}

function readStoredKey(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}
