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
            <i class="bi bi-hospital"></i> Cổng Đăng Ký Hồ Sơ Khám
          </div>
          <h1 class="register-title">Đăng Ký Hồ Sơ Bệnh Nhân</h1>
          <p class="register-subtitle">
            Tạo tài khoản để đăng ký khám bệnh trực tuyến, nhận số thứ tự tự động và theo dõi lịch sử khám
          </p>
        </div>

        <!-- Clinical Register Card -->
        <div class="medical-card register-card">
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

          <form (ngSubmit)="onSubmit()" class="register-form">
            <!-- Section 1: Thông tin tài khoản -->
            <div class="form-section">
              <h3 class="section-title">
                <i class="bi bi-shield-lock-fill text-primary"></i> 1. Thông Tin Tài Khoản
              </h3>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label required" for="username">Tên đăng nhập</label>
                  <div class="input-wrapper">
                    <i class="bi bi-person input-icon"></i>
                    <input
                      id="username"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.username"
                      name="username"
                      placeholder="Ví dụ: nguyenvana"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label required" for="email">Địa chỉ Email</label>
                  <div class="input-wrapper">
                    <i class="bi bi-envelope input-icon"></i>
                    <input
                      id="email"
                      type="email"
                      class="form-control"
                      [(ngModel)]="formData.email"
                      name="email"
                      placeholder="Ví dụ: nguyenvana@gmail.com"
                      required
                    />
                  </div>
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label required" for="password">Mật khẩu</label>
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
                  <label class="form-label required" for="confirmPassword">Nhập lại mật khẩu</label>
                  <div class="input-wrapper">
                    <i class="bi bi-check2-circle input-icon"></i>
                    <input
                      id="confirmPassword"
                      type="password"
                      class="form-control"
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      placeholder="Xác nhận lại mật khẩu..."
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Section 2: Thông tin bệnh nhân -->
            <div class="form-section">
              <h3 class="section-title">
                <i class="bi bi-person-vcard-fill text-primary"></i> 2. Thông Tin Cá Nhân &amp; Y Tế
              </h3>

              <div class="form-grid-2">
                <div class="form-group">
                  <label class="form-label required" for="fullName">Họ và tên bệnh nhân</label>
                  <div class="input-wrapper">
                    <i class="bi bi-card-heading input-icon"></i>
                    <input
                      id="fullName"
                      type="text"
                      class="form-control"
                      [(ngModel)]="formData.fullName"
                      name="fullName"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      required
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label required" for="phoneNumber">Số điện thoại liên hệ</label>
                  <div class="input-wrapper">
                    <i class="bi bi-telephone input-icon"></i>
                    <input
                      id="phoneNumber"
                      type="tel"
                      class="form-control"
                      [(ngModel)]="formData.phoneNumber"
                      name="phoneNumber"
                      placeholder="Ví dụ: 0988123456"
                      required
                    />
                  </div>
                </div>
              </div>

              <div class="form-grid-3">
                <div class="form-group">
                  <label class="form-label" for="gender">Giới tính</label>
                  <select id="gender" class="form-control" [(ngModel)]="formData.gender" name="gender">
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
                    class="form-control"
                    [(ngModel)]="formData.dateOfBirth"
                    name="dateOfBirth"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label" for="bloodGroup">Nhóm máu</label>
                  <select id="bloodGroup" class="form-control" [(ngModel)]="formData.bloodGroup" name="bloodGroup">
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
                  <label class="form-label" for="nationalId">Số CCCD / Định danh</label>
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
                  <label class="form-label" for="emergencyContactPhone">SĐT người thân khẩn cấp</label>
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
                <span class="spinner-sm"></span> Đang tạo hồ sơ...
              } @else {
                <i class="bi bi-check2-circle"></i> Hoàn Tất Đăng Ký Hồ Sơ
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
      min-height: calc(100vh - 120px);
      padding: 2.5rem 1.5rem 4rem;
      background-color: var(--bg-main);
      display: flex;
      justify-content: center;
    }

    .register-container {
      width: 100%;
      max-width: 760px;
    }

    .register-header {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background-color: var(--primary-50);
      color: var(--primary-700);
      font-size: 0.775rem;
      font-weight: 700;
      padding: 0.3rem 0.8rem;
      border-radius: var(--radius-full);
      margin-bottom: 0.5rem;
      border: 1px solid var(--primary-200);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .register-title {
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--primary-950);
      letter-spacing: -0.01em;
      margin-bottom: 0.35rem;
    }

    .register-subtitle {
      font-size: 0.9rem;
      color: var(--text-muted);
      line-height: 1.45;
      max-width: 580px;
      margin: 0 auto;
    }

    .register-card {
      padding: 2rem 2.25rem;
      background-color: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-sm);
    }

    .form-section {
      margin-bottom: 1.75rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }

    .form-section:last-of-type {
      border-bottom: none;
      margin-bottom: 1.25rem;
      padding-bottom: 0;
    }

    .section-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .form-grid-2, .form-grid-3 {
        grid-template-columns: 1fr;
      }
    }

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

    select.form-control {
      padding-left: 0.85rem;
    }

    input[type="date"].form-control {
      padding-left: 0.85rem;
    }

    .btn-submit {
      width: 100%;
      padding: 0.85rem;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .login-prompt {
      text-align: center;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-color);
    }

    .login-link {
      color: var(--primary-600);
      font-weight: 700;
      margin-left: 0.25rem;
    }

    .login-link:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  formData: RegisterRequest = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    phoneNumber: '',
    gender: 'Nam',
    dateOfBirth: '',
    address: '',
    nationalId: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodGroup: ''
  };

  confirmPassword = '';
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.formData.fullName?.trim()) {
      this.errorMessage.set('Vui lòng nhập họ và tên của bạn');
      return;
    }

    if (!this.formData.username?.trim()) {
      this.errorMessage.set('Vui lòng nhập tên đăng nhập');
      return;
    }

    if (this.formData.username.trim().length < 3) {
      this.errorMessage.set('Tên đăng nhập phải có ít nhất 3 ký tự');
      return;
    }

    if (!this.formData.email?.trim() || !this.formData.email.includes('@')) {
      this.errorMessage.set('Vui lòng nhập địa chỉ email hợp lệ');
      return;
    }

    if (!this.formData.phoneNumber?.trim()) {
      this.errorMessage.set('Vui lòng nhập số điện thoại liên hệ');
      return;
    }

    const phoneRegex = /^(0|\+84)[3|5|7|8|9][0-9]{8}$/;
    if (!phoneRegex.test(this.formData.phoneNumber.trim())) {
      this.errorMessage.set('Số điện thoại không hợp lệ (10 chữ số, VD: 0912345678)');
      return;
    }

    if (!this.formData.password) {
      this.errorMessage.set('Vui lòng nhập mật khẩu');
      return;
    }

    if (this.formData.password.length < 6) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (this.formData.password !== this.confirmPassword) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp, vui lòng kiểm tra lại');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.formData).subscribe({
      next: res => {
        this.isLoading.set(false);
        if (res.success) {
          this.successMessage.set('Đăng ký tài khoản thành công! Đang chuyển hướng...');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1000);
        } else {
          this.errorMessage.set(res.message || 'Đăng ký không thành công');
        }
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra trong quá trình đăng ký');
      }
    });
  }
}
