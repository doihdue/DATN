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
    <div class="auth-page">
      <div class="auth-box">
        <h1 class="auth-title">Đăng nhập</h1>
        <p class="auth-subtitle">Dùng tài khoản MedQueue của bạn để tiếp tục.</p>

        <div class="auth-card">
          @if (errorMessage()) {
            <div class="alert alert-danger">
              <span>{{ errorMessage() }}</span>
            </div>
          }

          @if (successMessage()) {
            <div class="alert alert-success">
              <span>{{ successMessage() }}</span>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="form-group">
              <label class="form-label" for="username">Tên đăng nhập hoặc email</label>
              <input
                id="username"
                type="text"
                class="form-control"
                [(ngModel)]="username"
                name="username"
                autocomplete="username"
                required
              />
            </div>

            <div class="form-group">
              <div class="label-row">
                <label class="form-label" for="password">Mật khẩu</label>
                <a href="javascript:void(0)" class="forgot-link">Quên mật khẩu?</a>
              </div>
              <div class="input-wrapper">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  autocomplete="current-password"
                  required
                />
                <button
                  type="button"
                  class="toggle-pwd-btn"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  tabindex="-1"
                >
                  <i class="bi" [ngClass]="showPassword() ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-submit"
              [disabled]="isLoading() || !username || !password"
            >
              @if (isLoading()) {
                <span class="spinner-sm"></span> Đang đăng nhập...
              } @else {
                Đăng nhập
              }
            </button>
          </form>

          <div class="demo-box">
            <span class="demo-label">Tài khoản dùng thử</span>
            <div class="demo-list">
              <button type="button" class="demo-btn" (click)="fillAccount('patient_nam', 'Patient@123456')">Bệnh nhân</button>
              <button type="button" class="demo-btn" (click)="fillAccount('doctor_hung', 'Doctor@123456')">Bác sĩ</button>
              <button type="button" class="demo-btn" (click)="fillAccount('staff_mai', 'Staff@123456')">Lễ tân</button>
              <button type="button" class="demo-btn" (click)="fillAccount('ktv_lan', '123456')">Kỹ thuật viên</button>
              <button type="button" class="demo-btn" (click)="fillAccount('admin', 'Admin@123456')">Quản trị</button>
            </div>
          </div>
        </div>

        <p class="auth-footer">
          Chưa có tài khoản?
          <a routerLink="/register">Đăng ký hồ sơ khám</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 120px);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 64px 16px 48px;
    }

    .auth-box {
      width: 100%;
      max-width: 400px;
    }

    .auth-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-main);
    }

    .auth-subtitle {
      margin-top: 4px;
      margin-bottom: 20px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .auth-card {
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .alert {
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 13px;
      border-radius: var(--radius-md);
    }

    .form-group { margin-bottom: 16px; }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 13px;
      font-weight: 500;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-wrapper .form-control { padding-right: 38px; }

    .toggle-pwd-btn {
      position: absolute;
      right: 4px;
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 15px;
    }

    .toggle-pwd-btn:hover {
      color: var(--text-main);
      background: var(--bg-hover);
    }

    .btn-submit {
      width: 100%;
      height: 38px;
      margin-top: 4px;
    }

    .demo-box {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .demo-label {
      display: block;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .demo-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .demo-btn {
      height: 28px;
      padding: 0 10px;
      background: #ffffff;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      font: inherit;
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: background-color 0.12s ease, color 0.12s ease;
    }

    .demo-btn:hover {
      background: var(--bg-hover);
      color: var(--text-main);
    }

    .auth-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 14px;
      color: var(--text-muted);
    }

    .auth-footer a { font-weight: 500; margin-left: 2px; }
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
        if (res.success && res.data) {
          const userRoles = res.data.user?.roles || [];
          const isAdmin = userRoles.includes('ROLE_ADMIN') || userRoles.includes('ADMIN');

          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          if (returnUrl && returnUrl !== '/') {
            this.router.navigateByUrl(returnUrl);
          } else if (isAdmin) {
            // Chỉ Admin vào thẳng Dashboard
            this.router.navigateByUrl('/dashboard');
          } else if (this.authService.isLabTech()) {
            // Kỹ thuật viên xét nghiệm vào thẳng phòng Lab
            this.router.navigateByUrl('/lab');
          } else {
            // Bác sĩ, Lễ tân và Bệnh nhân đều vào Trang chủ '/'
            this.router.navigateByUrl('/');
          }
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
