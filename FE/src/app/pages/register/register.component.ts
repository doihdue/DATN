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
    <div class="auth-page">
      <div class="auth-box">
        <h1 class="auth-title">Đăng ký hồ sơ bệnh nhân</h1>
        <p class="auth-subtitle">Tạo tài khoản để đặt lịch khám, lấy số trực tuyến và xem lại kết quả khám.</p>

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

          <form (ngSubmit)="onSubmit()" class="register-form">
            <h2 class="section-title">Tài khoản</h2>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label required" for="username">Tên đăng nhập</label>
                <input id="username" type="text" class="form-control" [(ngModel)]="formData.username"
                       name="username" placeholder="vd: nguyenvana" autocomplete="username" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="email">Email</label>
                <input id="email" type="email" class="form-control" [(ngModel)]="formData.email"
                       name="email" placeholder="vd: nguyenvana@gmail.com" autocomplete="email" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="password">Mật khẩu</label>
                <input id="password" type="password" class="form-control" [(ngModel)]="formData.password"
                       name="password" placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="confirmPassword">Nhập lại mật khẩu</label>
                <input id="confirmPassword" type="password" class="form-control" [(ngModel)]="confirmPassword"
                       name="confirmPassword" autocomplete="new-password" required />
              </div>
            </div>

            <h2 class="section-title">Thông tin cá nhân</h2>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label required" for="fullName">Họ và tên</label>
                <input id="fullName" type="text" class="form-control" [(ngModel)]="formData.fullName"
                       name="fullName" placeholder="vd: Nguyễn Văn A" required />
              </div>
              <div class="form-group">
                <label class="form-label required" for="phoneNumber">Số điện thoại</label>
                <input id="phoneNumber" type="tel" class="form-control" [(ngModel)]="formData.phoneNumber"
                       name="phoneNumber" placeholder="vd: 0988123456" required />
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
                <input id="dateOfBirth" type="date" class="form-control" [(ngModel)]="formData.dateOfBirth" name="dateOfBirth" />
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
                <label class="form-label" for="nationalId">Số CCCD</label>
                <input id="nationalId" type="text" class="form-control" [(ngModel)]="formData.nationalId"
                       name="nationalId" placeholder="12 chữ số" />
              </div>
              <div class="form-group">
                <label class="form-label" for="address">Địa chỉ</label>
                <input id="address" type="text" class="form-control" [(ngModel)]="formData.address"
                       name="address" placeholder="Số nhà, đường, phường/xã, tỉnh/TP" />
              </div>
            </div>

            <h2 class="section-title">Liên hệ khẩn cấp <span class="optional">(không bắt buộc)</span></h2>
            <div class="form-grid-2">
              <div class="form-group">
                <label class="form-label" for="emergencyContactName">Họ tên người thân</label>
                <input id="emergencyContactName" type="text" class="form-control" [(ngModel)]="formData.emergencyContactName"
                       name="emergencyContactName" />
              </div>
              <div class="form-group">
                <label class="form-label" for="emergencyContactPhone">SĐT người thân</label>
                <input id="emergencyContactPhone" type="tel" class="form-control" [(ngModel)]="formData.emergencyContactPhone"
                       name="emergencyContactPhone" />
              </div>
            </div>

            <div class="form-footer">
              <span class="text-muted">Đã có tài khoản? <a routerLink="/login">Đăng nhập</a></span>
              <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
                @if (isLoading()) {
                  <span class="spinner-sm"></span> Đang tạo tài khoản...
                } @else {
                  Tạo tài khoản
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: calc(100vh - 120px);
      display: flex;
      justify-content: center;
      padding: 40px 16px 48px;
    }

    .auth-box {
      width: 100%;
      max-width: 720px;
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

    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
      margin: 20px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }

    .register-form > .section-title:first-child { margin-top: 0; }

    .optional {
      font-weight: 400;
      color: var(--text-muted);
      font-size: 13px;
    }

    .form-group { margin-bottom: 14px; }

    .form-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
      font-size: 14px;
    }

    .form-footer a { font-weight: 500; }

    @media (max-width: 640px) {
      .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
      .form-footer { flex-direction: column-reverse; align-items: stretch; text-align: center; }
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
