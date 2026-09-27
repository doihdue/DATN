import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, UserSummary } from '../models/auth.models';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = 'http://localhost:8080/api/auth';

  private readonly TOKEN_KEY = 'medqueue_access_token';
  private readonly REFRESH_TOKEN_KEY = 'medqueue_refresh_token';
  private readonly USER_KEY = 'medqueue_user_info';

  // Signals for reactive state
  readonly currentUser = signal<UserSummary | null>(this.getStoredUser());
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly userRoles = computed(() => this.currentUser()?.roles ?? []);

  constructor() {
    // Nếu có token, luôn đồng bộ thông tin người dùng mới nhất từ server
    if (this.getAccessToken()) {
      this.fetchCurrentUser().subscribe({
        error: () => this.clearAuthStorage()
      });
    }
  }

  login(request: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, request).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.handleAuthSuccess(res.data);
        }
      })
    );
  }

  register(request: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, request).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.handleAuthSuccess(res.data);
        }
      })
    );
  }

  logout(): void {
    const token = this.getAccessToken();
    if (token) {
      this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
        error: () => {} // ignore
      });
    }
    this.clearAuthStorage();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  fetchCurrentUser(): Observable<ApiResponse<UserSummary>> {
    return this.http.get<ApiResponse<UserSummary>>(`${this.apiUrl}/me`).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          localStorage.setItem(this.USER_KEY, JSON.stringify(res.data));
        }
      })
    );
  }

  hasRole(role: string): boolean {
    const formatted = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return this.userRoles().includes(formatted);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  private handleAuthSuccess(authData: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authData.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(authData.user));
    this.currentUser.set(authData.user);
  }

  private clearAuthStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  private getStoredUser(): UserSummary | null {
    const data = localStorage.getItem(this.USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as UserSummary;
    } catch {
      return null;
    }
  }
}
