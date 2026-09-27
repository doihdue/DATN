import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="register-wrapper">
      <div class="register-container">
        <!-- Title Banner -->
        <div class="register-header">
          <div class="header-badge">
            <i class="bi bi-hospital"></i> Dành Cho Bệnh Nhân
          </div>
          <h1 class="register-title">Đăng Ký Hồ Sơ Bệnh Nhân</h1>
          <p class="register-subtitle">
            Tạo tài khoản để đặt lịch khám nhanh chóng, lấy số thứ tự trực tuyến và theo dõi hồ sơ bệnh án
          </p>
        </div>

        <!-- Glassmorphism Card -->
        <div class="glass-card register-card">
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

          <form (ngSubmit)="onSubmit()" class="register-form">
            <!-- Section 1: Thông tin tài khoản -->
            <div class="form-section">
              <h3 class="section-title">
                <i class="bi bi-shield-lock"></i> 1. Thông Tin Tài Khoản
              </h3>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="username">Tên đăng nhập *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-person input-icon"></i>
                    <input
                      id="username"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.username"
                      name="username"
                      placeholder="vd: nguyenvana"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="email">Địa chỉ Email *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-envelope input-icon"></i>
                    <input
                      id="email"
                      type="email"
                      class="form-control"
                      [(ngModel)]="formData.email"
                      name="email"
                      placeholder="vd: nguyenvana@gmail.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="password">Mật khẩu *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-key input-icon"></i>
                    <input
                      id="password"
                      type="password"
                      class="form-control"
                      [(ngModel)]="formData.password"
                      name="password"
                      placeholder="Ít nhất 6 ký tự..."
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="confirmPassword">Nhập lại mật khẩu *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-check2-circle input-icon"></i>
                    <input
                      id="confirmPassword"
                      type="password"
                      class="form-control"
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      placeholder="Xác nhận mật khẩu..."
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 2: Thông tin cá nhân & Y tế -->
            <div class="form-section">
              <h3 class="section-title">
                <i class="bi bi-file-earmark-medical"></i> 2. Thông Tin Cá Nhân & Y Tế
              </h3>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="fullName">Họ và tên bệnh nhân *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-card-heading input-icon"></i>
                    <input
                      id="fullName"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.fullName"
                      name="fullName"
                      placeholder="vd: Nguyễn Văn A"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="phoneNumber">Số điện thoại liên hệ *</label>
                  <div class="input-wrapper">
                    <i class="bi bi-telephone input-icon"></i>
                    <input
                      id="phoneNumber"
                      type="tel"
                      class="form-control"
                      [(ngModel)]="formData.phoneNumber"
                      name="phoneNumber"
                      placeholder="vd: 0988123456"
                      required
                    />
                  </div>
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label" for="gender">Giới tính</label>
                  <select id="gender" class="form-control no-icon" [(ngModel)]="formData.gender" name="gender">
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label" for="dateOfBirth">Ngày sinh</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    class="form-control no-icon"
                    [(ngModel)]="formData.dateOfBirth"
                    name="dateOfBirth"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="bloodGroup">Nhóm máu</label>
                  <select id="bloodGroup" class="form-control no-icon" [(ngModel)]="formData.bloodGroup" name="bloodGroup">
                    <option value="">Chưa rõ</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="nationalId">Số CCCD / CMND</label>
                  <div class="input-wrapper">
                    <i class="bi bi-person-vcard input-icon"></i>
                    <input
                      id="nationalId"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.nationalId"
                      name="nationalId"
                      placeholder="12 số căn cước công dân..."
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="address">Địa chỉ thường trú</label>
                  <div class="input-wrapper">
                    <i class="bi bi-geo-alt input-icon"></i>
                    <input
                      id="address"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.address"
                      name="address"
                      placeholder="Số nhà, đường, quận/huyện, tỉnh/TP..."
                    />
                  </div>
                </div>
              </div>

              <!-- Liên hệ khẩn cấp -->
              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label" for="emergencyContactName">Người liên hệ khẩn cấp</label>
                  <div class="input-wrapper">
                    <i class="bi bi-person-heart input-icon"></i>
                    <input
                      id="emergencyContactName"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.emergencyContactName"
                      name="emergencyContactName"
                      placeholder="Họ tên người thân (bố/mẹ/vợ/chồng)..."
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label" for="emergencyContactPhone">SĐT liên hệ khẩn cấp</label>
                  <div class="input-wrapper">
                    <i class="bi bi-telephone-plus input-icon"></i>
                    <input
                      id="emergencyContactPhone"
                      type="tel"
                      class="form-control"
                      [(ngModel)]="formData.emergencyContactPhone"
                      name="emergencyContactPhone"
                      placeholder="Số điện thoại người thân..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              class="btn btn-primary btn-submit"
              [disabled]="isLoading()"
            >
              @if (isLoading()) {
                <span class="spinner"></span> Đang tạo tài khoản...
              } @else {
                <i class="bi bi-check2-circle"></i> Hoàn tất đăng ký & Đăng nhập
              }
            </button>
          </form>

          <div class="login-prompt">
            Đã có tài khoản?
            <a routerLink="/login" class="login-link">Đăng nhập tại đây</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-wrapper {
      min-height: calc(100vh - 80px);
      padding: 3rem 1.5rem;
      background: radial-gradient(circle at 10% 20%, rgba(224, 242, 254, 0.6) 0%, rgba(248, 250, 252, 0.95) 80%);
      display: flex;
      justify-content: center;
    }

    .register-container {
      width: 100%;
      max-width: 760px;
    }

    .register-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .header-badge {
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

    .register-title {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--primary-900);
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }

    .register-subtitle {
      font-size: 0.95rem;
      color: var(--text-muted);
      max-width: 550px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .register-card {
      padding: 2.5rem;
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
    }

    .section-title {
      font-size: 1.1rem;
      color: var(--primary-800);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

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
      margin-bottom: 1.5rem;
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
      margin-bottom: 1.5rem;
    }

    .btn-submit {
      width: 100%;
      padding: 0.95rem;
      font-size: 1.05rem;
      margin-top: 1rem;
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

    .login-prompt {
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color);
    }

    .login-link {
      font-weight: 700;
      color: var(--primary-600);
      margin-left: 0.25rem;
    }

    .login-link:hover {
      text-decoration: underline;
    }

    @media (max-width: 650px) {
      .form-grid-2, .form-grid-3 {
        grid-template-columns: 1fr;
      }
      .register-card {
        padding: 1.5rem;
      }
    }
  `]
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  formData: RegisterRequest = {
    username: '',
    password: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    gender: 'Nam',
    dateOfBirth: '',
    address: '',
    nationalId: '',
    bloodGroup: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  };

  confirmPassword = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.formData.username || !this.formData.password || !this.formData.email || !this.formData.fullName) {
      this.errorMessage.set('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    if (this.formData.password !== this.confirmPassword) {
      this.errorMessage.set('Mật khẩu và xác nhận mật khẩu không khớp');
      return;
    }

    if (this.formData.password.length < 6) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.formData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Đăng ký hồ sơ bệnh nhân thành công! Đang chuyển hướng...');
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 800);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.';
        this.errorMessage.set(msg);
      }
    });
  }
}
