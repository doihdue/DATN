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
            <i class="bi bi-shield-check"></i> Cổng Xác Thực Hệ Thống
          </div>
          <h1 class="login-title">Đăng Nhập MedQueue</h1>
          <p class="login-subtitle">
            Hệ thống đặt lịch khám bệnh trực tuyến &amp; điều phối hàng đợi y tế thông minh
          </p>
        </div>

        <!-- Clinical Card -->
        <div class="medical-card login-card">
          <!-- Quick Accounts Picker for Easy Demo -->
          <div class="quick-demo-box">
            <span class="quick-demo-label">
              <i class="bi bi-person-badge"></i> Tài khoản mẫu dùng thử:
            </span>
            <div class="quick-chips">
              <button type="button" class="chip-item" (click)="fillAccount('patient_nam', 'Patient@123456')">
                <i class="bi bi-person-fill text-blue"></i> Bệnh nhân
              </button>
              <button type="button" class="chip-item" (click)="fillAccount('doctor_hung', 'Doctor@123456')">
                <i class="bi bi-heart-pulse-fill text-green"></i> Bác sĩ
              </button>
              <button type="button" class="chip-item" (click)="fillAccount('staff_mai', 'Staff@123456')">
                <i class="bi bi-person-badge-fill text-amber"></i> Lễ tân
              </button>
              <button type="button" class="chip-item" (click)="fillAccount('admin', 'Admin@123456')">
                <i class="bi bi-shield-lock-fill text-purple"></i> Admin
              </button>
            </div>
          </div>

          <!-- Alert message -->
          @if (errorMessage()) {
            <div class="alert alert-danger">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="alert alert-success">
              <i class="bi bi-check-circle-fill"></i>
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="login-form">
            <!-- Username or Email -->
            <div class="form-group">
              <label class="form-label required" for="username">Tên đăng nhập hoặc Email</label>
              <div class="input-wrapper">
                <i class="bi bi-person input-icon"></i>
                <input
                  id="username"
                  type="text"
                  class="form-control"
                  [(ngModel)]="username"
                  name="username"
                  placeholder="Nhập tên tài khoản hoặc email..."
                  required
                />
              </div>
            </div>

            <!-- Password -->
            <div class="form-group">
              <div class="label-row">
                <label class="form-label required" for="password">Mật khẩu</label>
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
                <span class="spinner-sm"></span> Đang xác thực...
              } @else {
                <i class="bi bi-box-arrow-in-right"></i> Đăng Nhập
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
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      background-color: var(--bg-main);
    }

    .login-container {
      width: 100%;
      max-width: 460px;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .login-brand {
      text-align: center;
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background-color: var(--primary-50);
      color: var(--primary-700);
      font-size: 0.775rem;
      font-weight: 700;
      padding: 0.3rem 0.8rem;
      border-radius: var(--radius-full);
      margin-bottom: 0.6rem;
      border: 1px solid var(--primary-200);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .login-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary-950);
      letter-spacing: -0.01em;
      margin-bottom: 0.35rem;
    }

    .login-subtitle {
      font-size: 0.885rem;
      color: var(--text-muted);
      line-height: 1.45;
      max-width: 380px;
      margin: 0 auto;
    }

    .login-card {
      padding: 2rem 2.25rem;
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .quick-demo-box {
      background-color: var(--bg-subtle);
      border: 1px dashed #cbd5e1;
      border-radius: var(--radius-sm);
      padding: 0.75rem 0.95rem;
      margin-bottom: 1.25rem;
    }

    .quick-demo-label {
      display: block;
      font-size: 0.775rem;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 0.45rem;
    }

    .quick-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .chip-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-xs);
      font-size: 0.785rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .chip-item:hover {
      background-color: var(--primary-50);
      border-color: var(--primary-300);
      color: var(--primary-700);
    }

    .text-blue { color: #0284c7; }
    .text-green { color: #16a34a; }
    .text-amber { color: #d97706; }
    .text-purple { color: #9333ea; }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.85rem;
      color: var(--text-light);
      font-size: 1.05rem;
      pointer-events: none;
    }

    .form-control {
      padding-left: 2.5rem;
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
      right: 0.75rem;
      background: none;
      border: none;
      color: var(--text-light);
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
    }

    .toggle-pwd-btn:hover {
      color: var(--text-main);
    }

    .btn-submit {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      margin-top: 0.35rem;
    }

    .register-prompt {
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .register-link {
      color: var(--primary-600);
      font-weight: 700;
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

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

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
      next: res => {
        this.isLoading.set(false);
        if (res.success) {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
          this.router.navigateByUrl(returnUrl);
        } else {
          this.errorMessage.set(res.message || 'Đăng nhập không thành công');
        }
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Tài khoản hoặc mật khẩu không chính xác');
      }
    });
  }
}
