import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-wrapper">
      <div class="login-container">
        <!-- Brand Section -->
        <div class="login-brand">
          <div class="brand-badge">
            <i class="bi bi-shield-lock-fill"></i> Cổng Xác Thực Hệ Thống
          </div>
          <h1 class="login-title">Đăng Nhập MedQueue</h1>
          <p class="login-subtitle">
            Hệ thống đặt lịch khám bệnh trực tuyến & quản lý điều phối hàng đợi thông minh
          </p>
        </div>

        <!-- Glassmorphism Card -->
        <div class="glass-card login-card">
          <!-- Quick Accounts Picker for Easy Demo -->
          <div class="quick-demo-box">
            <span class="quick-demo-label">
              <i class="bi bi-lightning-charge-fill"></i> Chọn nhanh tài khoản mẫu để test:
            </span>
            <div class="quick-chips">
              <button type="button" class="chip" (click)="fillAccount('patient_nam', 'Patient@123456')">
                <i class="bi bi-person-fill text-blue"></i> Bệnh nhân
              </button>
              <button type="button" class="chip" (click)="fillAccount('doctor_hung', 'Doctor@123456')">
                <i class="bi bi-heart-pulse-fill text-green"></i> Bác sĩ
              </button>
              <button type="button" class="chip" (click)="fillAccount('staff_mai', 'Staff@123456')">
                <i class="bi bi-person-badge-fill text-amber"></i> Lễ tân
              </button>
              <button type="button" class="chip" (click)="fillAccount('admin', 'Admin@123456')">
                <i class="bi bi-shield-check text-purple"></i> Admin
              </button>
            </div>
          </div>

          <!-- Alert message -->
          @if (errorMessage()) {
            <div class="alert-error">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="alert-success">
              <i class="bi bi-check-circle-fill"></i>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="login-form">
            <!-- Username or Email -->
            <div class="form-group">
              <label class="form-label" for="username">Tên đăng nhập hoặc Email</label>
              <div class="input-wrapper">
                <i class="bi bi-person input-icon"></i>
                <input
                  id="username"
                  type="text"
                  class="form-control"
                  [(ngModel)]="username"
                  name="username"
                  placeholder="Nhập username hoặc email..."
                  required
                />
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <div class="label-row">
                <label class="form-label" for="password">Mật khẩu</label>
                <a href="javascript:void(0)" class="forgot-link">Quên mật khẩu?</a>
              </div>
              <div class="input-wrapper">
                <i class="bi bi-key input-icon"></i>
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="Nhập mật khẩu..."
                  required
                />
                <button
                  type="button"
                  class="toggle-pwd-btn"
                  (click)="showPassword.set(!showPassword())"
                  tabindex="-1"
                >
                  <i class="bi" [ngClass]="showPassword() ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary btn-submit"
              [disabled]="isLoading() || !username || !password"
            >
              @if (isLoading()) {
                <span class="spinner"></span> Đang xác thực...
              } @else {
                <i class="bi bi-box-arrow-in-right"></i> Đăng nhập ngay
              }
            </button>
          </form>

          <!-- Register prompt -->
          <div class="register-prompt">
            Chưa có tài khoản bệnh nhân?
            <a routerLink="/register" class="register-link">Đăng ký khám bệnh ngay</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: calc(100vh - 80px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      background: radial-gradient(circle at 10% 20%, rgba(224, 242, 254, 0.6) 0%, rgba(248, 250, 252, 0.95) 80%);
    }

    .login-container {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .login-brand {
      text-align: center;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #e0f2fe;
      color: var(--primary-700);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      margin-bottom: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .login-title {
      font-size: 2rem;
      font-weight: 800;
      color: var(--primary-900);
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }

    .login-subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.4;
      max-width: 400px;
      margin: 0 auto;
    }

    .login-card {
      padding: 2.25rem 2rem;
    }

    .quick-demo-box {
      background: #f8fafc;
      border: 1px dashed var(--primary-300);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      margin-bottom: 1.5rem;
    }

    .quick-demo-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--primary-800);
      margin-bottom: 0.5rem;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .text-blue { color: #0284c7; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-purple { color: #9333ea; }

    .alert-error {
      background: #fee2e2;
      border: 1px solid #fca5a5;
      color: #991b1b;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .alert-success {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #166534;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary-600);
    }

    .toggle-pwd-btn {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      color: var(--text-light);
      cursor: pointer;
      font-size: 1.1rem;
    }

    .toggle-pwd-btn:hover {
      color: var(--text-main);
    }

    .btn-submit {
      width: 100%;
      padding: 0.875rem;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid #ffffff;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: rotation 1s linear infinite;
    }

    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .register-prompt {
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }

    .register-link {
      font-weight: 700;
      color: var(--primary-600);
      margin-left: 0.25rem;
    }

    .register-link:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  username = '';
  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  fillAccount(u: string, p: string): void {
    this.username = u;
    this.password = p;
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (!this.username || !this.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.successMessage.set('Đăng nhập thành công! Đang chuyển hướng...');
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        setTimeout(() => {
          this.router.navigateByUrl(returnUrl);
        }, 600);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.';
        this.errorMessage.set(msg);
      }
    });
  }
}
