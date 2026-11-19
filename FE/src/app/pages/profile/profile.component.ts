import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ChangePasswordRequest, UpdateProfileRequest, UserProfileResponse } from '../../models/auth.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page profile-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hồ sơ cá nhân</h1>
          <p class="page-subtitle">Thông tin tài khoản và mật khẩu đăng nhập</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" (click)="loadProfile()" [disabled]="loading()">
            <i class="bi bi-arrow-clockwise" [class.spin]="loading()"></i> Làm mới
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="panel loading-state">
          <div class="spinner"></div>
          <p>Đang tải hồ sơ...</p>
        </div>
      } @else if (profile()) {
        <section class="panel summary">
          <div class="summary-avatar">
            @if (profile()?.avatarUrl) {
              <img [src]="profile()?.avatarUrl" alt="Ảnh đại diện" (error)="onAvatarError($event)" />
            } @else {
              <span>{{ initials() }}</span>
            }
          </div>

          <div class="summary-main">
            <div class="summary-top">
              <h2 class="summary-name">{{ profile()?.fullName }}</h2>
              @if (profile()?.status === 'ACTIVE') {
                <span class="status success">Hoạt động</span>
              } @else {
                <span class="status">{{ profile()?.status }}</span>
              }
            </div>
            <div class="summary-meta">
              <span>{{ profile()?.username }}</span>
              <span>{{ profile()?.email || 'Chưa có email' }}</span>
              @if (profile()?.phoneNumber) {
                <span>{{ profile()?.phoneNumber }}</span>
              }
            </div>
          </div>

          <dl class="summary-facts">
            <div>
              <dt>Vai trò</dt>
              <dd>
                @for (role of profile()?.roles; track role; let last = $last) {
                  <span>{{ getRoleDisplayName(role) }}{{ last ? '' : ', ' }}</span>
                }
              </dd>
            </div>
            @if (profile()?.specialtyName) {
              <div><dt>Chuyên khoa</dt><dd>{{ profile()?.specialtyName }}</dd></div>
            }
            @if (profile()?.employeeCode) {
              <div><dt>Mã nhân viên</dt><dd class="mono">{{ profile()?.employeeCode }}</dd></div>
            }
          </dl>
        </section>

        <div class="profile-tabs" role="tablist">
          <button
            type="button"
            class="tab-btn"
            role="tab"
            [class.active]="activeTab() === 'profile'"
            (click)="activeTab.set('profile')">
            Thông tin cá nhân
          </button>
          <button
            type="button"
            class="tab-btn"
            role="tab"
            [class.active]="activeTab() === 'password'"
            (click)="activeTab.set('password')">
            Đổi mật khẩu
          </button>
        </div>

        @if (activeTab() === 'profile') {
          <section class="panel tab-content">
            <div class="panel-body">
              @if (profileSuccess()) {
                <div class="alert alert-success">{{ profileSuccess() }}</div>
              }
              @if (profileError()) {
                <div class="alert alert-danger">{{ profileError() }}</div>
              }

              <form (ngSubmit)="submitProfile()" #pForm="ngForm">
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label required">Họ và tên</label>
                    <input type="text" class="form-control" name="fullName"
                           [(ngModel)]="profileEditData.fullName" required />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Tên đăng nhập</label>
                    <input type="text" class="form-control disabled-input" [value]="profile()?.username"
                           disabled title="Không thể đổi tên đăng nhập" />
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Email</label>
                    <input type="email" class="form-control" name="email"
                           [(ngModel)]="profileEditData.email" required placeholder="ten@vidu.com" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Số điện thoại</label>
                    <input type="tel" class="form-control" name="phoneNumber"
                           [(ngModel)]="profileEditData.phoneNumber" placeholder="09xxxxxxxx" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Giới tính</label>
                    <select class="form-control" name="gender" [(ngModel)]="profileEditData.gender">
                      <option value="">-- Chọn --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Ngày sinh</label>
                    <input type="date" class="form-control" name="dateOfBirth" [(ngModel)]="profileEditData.dateOfBirth" />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Địa chỉ</label>
                    <input type="text" class="form-control" name="address"
                           [(ngModel)]="profileEditData.address" placeholder="Số nhà, đường, phường/xã, tỉnh/TP" />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Ảnh đại diện (URL)</label>
                    <div class="avatar-input-group">
                      <input type="url" class="form-control" name="avatarUrl"
                             [(ngModel)]="profileEditData.avatarUrl" placeholder="https://..." />
                      @if (profileEditData.avatarUrl) {
                        <div class="avatar-preview-mini">
                          <img [src]="profileEditData.avatarUrl" alt="Xem trước" (error)="onAvatarError($event)" />
                        </div>
                      }
                    </div>
                  </div>
                </div>

                @if (hasDoctorRole()) {
                  <h3 class="sub-section-title">Chuyên môn</h3>
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">Học hàm / học vị</label>
                      <input type="text" class="form-control" name="academicTitle"
                             [(ngModel)]="profileEditData.academicTitle" placeholder="vd: BS.CKII, ThS.BS" />
                    </div>

                    <div class="form-group">
                      <label class="form-label">Số năm kinh nghiệm</label>
                      <input type="number" min="0" max="60" class="form-control" name="yearsOfExperience"
                             [(ngModel)]="profileEditData.yearsOfExperience" />
                    </div>

                    <div class="form-group full-width">
                      <label class="form-label">Giới thiệu</label>
                      <textarea class="form-control" rows="3" name="biography"
                                [(ngModel)]="profileEditData.biography"
                                placeholder="Quá trình công tác, thế mạnh chuyên môn"></textarea>
                    </div>
                  </div>
                }

                @if (hasPatientRole()) {
                  <h3 class="sub-section-title">Thông tin y tế và liên hệ khẩn cấp</h3>
                  <div class="form-grid">
                    <div class="form-group">
                      <label class="form-label">Nhóm máu</label>
                      <select class="form-control" name="bloodGroup" [(ngModel)]="profileEditData.bloodGroup">
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

                    <div class="form-group">
                      <label class="form-label">Dị ứng thuốc, thực phẩm</label>
                      <input type="text" class="form-control" name="allergies"
                             [(ngModel)]="profileEditData.allergies" placeholder="vd: Penicillin, Aspirin" />
                    </div>

                    <div class="form-group">
                      <label class="form-label">Người liên hệ khẩn cấp</label>
                      <input type="text" class="form-control" name="emergencyContactName"
                             [(ngModel)]="profileEditData.emergencyContactName" placeholder="Họ tên người thân" />
                    </div>

                    <div class="form-group">
                      <label class="form-label">SĐT người liên hệ</label>
                      <input type="tel" class="form-control" name="emergencyContactPhone"
                             [(ngModel)]="profileEditData.emergencyContactPhone" />
                    </div>
                  </div>
                }

                <div class="form-actions-bar">
                  <button type="button" class="btn btn-secondary" (click)="resetProfileForm()">Hoàn tác</button>
                  <button
                    type="submit"
                    class="btn btn-primary"
                    [disabled]="savingProfile() || !profileEditData.fullName || !profileEditData.email">
                    @if (savingProfile()) {
                      <span class="spinner-sm"></span> Đang lưu...
                    } @else {
                      Lưu thay đổi
                    }
                  </button>
                </div>
              </form>
            </div>
          </section>
        }

        @if (activeTab() === 'password') {
          <section class="panel tab-content">
            <div class="panel-body">
              @if (passwordSuccess()) {
                <div class="alert alert-success">{{ passwordSuccess() }}</div>
              }
              @if (passwordError()) {
                <div class="alert alert-danger">{{ passwordError() }}</div>
              }

              <div class="password-layout-grid">
                <form (ngSubmit)="submitPassword()" #pwForm="ngForm" class="password-form-column">
                  <div class="form-group">
                    <label class="form-label required">Mật khẩu hiện tại</label>
                    <div class="input-password-wrapper">
                      <input [type]="showCurrentPw() ? 'text' : 'password'" class="form-control" name="currentPassword"
                             [(ngModel)]="passwordData.currentPassword" required autocomplete="current-password" />
                      <button type="button" class="btn-toggle-eye" (click)="showCurrentPw.set(!showCurrentPw())"
                              [attr.aria-label]="showCurrentPw() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" tabindex="-1">
                        <i class="bi" [ngClass]="showCurrentPw() ? 'bi-eye-slash' : 'bi-eye'"></i>
                      </button>
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Mật khẩu mới</label>
                    <div class="input-password-wrapper">
                      <input [type]="showNewPw() ? 'text' : 'password'" class="form-control" name="newPassword"
                             [(ngModel)]="passwordData.newPassword" required minlength="6"
                             placeholder="Tối thiểu 6 ký tự" autocomplete="new-password" />
                      <button type="button" class="btn-toggle-eye" (click)="showNewPw.set(!showNewPw())"
                              [attr.aria-label]="showNewPw() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" tabindex="-1">
                        <i class="bi" [ngClass]="showNewPw() ? 'bi-eye-slash' : 'bi-eye'"></i>
                      </button>
                    </div>
                    @if (passwordData.newPassword && passwordData.newPassword.length < 6) {
                      <span class="input-hint text-danger">Mật khẩu phải có ít nhất 6 ký tự</span>
                    }
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Nhập lại mật khẩu mới</label>
                    <div class="input-password-wrapper">
                      <input [type]="showConfirmPw() ? 'text' : 'password'" class="form-control" name="confirmPassword"
                             [(ngModel)]="passwordData.confirmPassword" required autocomplete="new-password" />
                      <button type="button" class="btn-toggle-eye" (click)="showConfirmPw.set(!showConfirmPw())"
                              [attr.aria-label]="showConfirmPw() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'" tabindex="-1">
                        <i class="bi" [ngClass]="showConfirmPw() ? 'bi-eye-slash' : 'bi-eye'"></i>
                      </button>
                    </div>
                    @if (passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
                      <span class="input-hint text-danger">Mật khẩu nhập lại chưa khớp</span>
                    }
                  </div>

                  <div class="form-actions-bar">
                    <button type="button" class="btn btn-secondary" (click)="resetPasswordForm()">Xóa nhập</button>
                    <button
                      type="submit"
                      class="btn btn-primary"
                      [disabled]="savingPassword() || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword.length < 6 || passwordData.newPassword !== passwordData.confirmPassword">
                      @if (savingPassword()) {
                        <span class="spinner-sm"></span> Đang cập nhật...
                      } @else {
                        Đổi mật khẩu
                      }
                    </button>
                  </div>
                </form>

                <aside class="security-info-panel">
                  <h4 class="side-title">Lưu ý</h4>
                  <ul class="security-rules-list">
                    <li>Mật khẩu tối thiểu 6 ký tự; nên kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</li>
                    <li>Mật khẩu mới phải khác mật khẩu đang dùng.</li>
                    <li>Sau khi đổi, mọi phiên đăng nhập sẽ kết thúc và bạn cần đăng nhập lại.</li>
                    <li>Nếu nghi ngờ tài khoản bị lộ, liên hệ quản trị viên.</li>
                  </ul>
                </aside>
              </div>
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .profile-page { max-width: 960px; }

    .loading-state {
      padding: 48px 16px;
      text-align: center;
      color: var(--text-muted);
    }

    .spin { animation: spin 0.8s linear infinite; }

    .alert {
      padding: 8px 12px;
      margin-bottom: 16px;
      font-size: 13px;
      border-radius: var(--radius-md);
    }

    /* Tóm tắt tài khoản */
    .summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      padding: 16px;
    }

    .summary-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--primary-100);
      color: var(--primary-700);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 600;
      overflow: hidden;
      flex-shrink: 0;
    }

    .summary-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .summary-top {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .summary-name {
      font-size: 16px;
      font-weight: 600;
    }

    .summary-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
      margin-top: 2px;
      font-size: 13px;
      color: var(--text-muted);
    }

    .summary-facts {
      margin: 0;
      display: flex;
      gap: 24px;
      padding-left: 16px;
      border-left: 1px solid var(--border-color);
    }

    .summary-facts dt {
      font-size: 12px;
      color: var(--text-muted);
    }

    .summary-facts dd {
      margin: 2px 0 0;
      font-size: 14px;
      color: var(--text-main);
    }

    /* Tab */
    .profile-tabs {
      display: flex;
      gap: 4px;
      margin: 20px 0 12px;
      border-bottom: 1px solid var(--border-color);
    }

    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      padding: 8px 12px;
      font: inherit;
      font-size: 14px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      transition: color 0.12s ease, border-color 0.12s ease;
    }

    .tab-btn:hover { color: var(--text-main); }

    .tab-btn.active {
      color: var(--primary-600);
      border-bottom-color: var(--primary-600);
    }

    /* Biểu mẫu */
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .form-group { margin-bottom: 14px; }
    .form-group.full-width { grid-column: 1 / -1; }

    textarea.form-control { resize: vertical; }

    .disabled-input {
      background: var(--bg-subtle);
      color: var(--text-muted);
      cursor: not-allowed;
    }

    .avatar-input-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-preview-mini {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid var(--border-color);
      flex-shrink: 0;
    }

    .avatar-preview-mini img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .sub-section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
      margin: 8px 0 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color);
    }

    .form-actions-bar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    /* Đổi mật khẩu */
    .password-layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 32px;
      align-items: start;
    }

    .input-password-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-password-wrapper .form-control { padding-right: 38px; }

    .btn-toggle-eye {
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

    .btn-toggle-eye:hover {
      color: var(--text-main);
      background: var(--bg-hover);
    }

    .input-hint {
      font-size: 12px;
      margin-top: 2px;
    }

    .text-danger { color: var(--danger-text); }

    .security-info-panel {
      padding: 14px 16px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
    }

    .side-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .security-rules-list {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--text-secondary);
    }

    .security-rules-list li + li { margin-top: 6px; }

    @media (max-width: 820px) {
      .summary { grid-template-columns: auto minmax(0, 1fr); }
      .summary-facts {
        grid-column: 1 / -1;
        padding-left: 0;
        padding-top: 12px;
        border-left: none;
        border-top: 1px solid var(--border-color);
        flex-wrap: wrap;
      }
      .password-layout-grid { grid-template-columns: 1fr; gap: 20px; }
    }

    @media (max-width: 640px) {
      .page { padding: 16px; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);

  readonly loading = signal<boolean>(true);
  readonly savingProfile = signal<boolean>(false);
  readonly savingPassword = signal<boolean>(false);
  readonly activeTab = signal<'profile' | 'password'>('profile');

  readonly profile = signal<UserProfileResponse | null>(null);
  readonly profileSuccess = signal<string>('');
  readonly profileError = signal<string>('');

  readonly passwordSuccess = signal<string>('');
  readonly passwordError = signal<string>('');

  readonly showCurrentPw = signal<boolean>(false);
  readonly showNewPw = signal<boolean>(false);
  readonly showConfirmPw = signal<boolean>(false);

  profileEditData: UpdateProfileRequest = {
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    gender: '',
    dateOfBirth: '',
    avatarUrl: '',
    academicTitle: '',
    yearsOfExperience: 0,
    biography: '',
    bloodGroup: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  };

  passwordData: ChangePasswordRequest = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.profileError.set('');
    this.authService.getProfile().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.profile.set(res.data);
          this.populateEditData(res.data);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.';
        this.profileError.set(msg);
      }
    });
  }

  private populateEditData(p: UserProfileResponse): void {
    this.profileEditData = {
      fullName: p.fullName || '',
      email: p.email || '',
      phoneNumber: p.phoneNumber || '',
      address: p.address || '',
      gender: p.gender || '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toString() : '',
      avatarUrl: p.avatarUrl || '',
      academicTitle: p.academicTitle || '',
      yearsOfExperience: p.yearsOfExperience ?? 0,
      biography: p.biography || '',
      bloodGroup: p.bloodGroup || '',
      allergies: p.allergies || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactPhone: p.emergencyContactPhone || ''
    };
  }

  resetProfileForm(): void {
    const current = this.profile();
    if (current) {
      this.populateEditData(current);
      this.profileSuccess.set('');
      this.profileError.set('');
    }
  }

  submitProfile(): void {
    this.profileSuccess.set('');
    this.profileError.set('');
    this.savingProfile.set(true);

    this.authService.updateProfile(this.profileEditData).subscribe({
      next: (res) => {
        this.savingProfile.set(false);
        if (res.success && res.data) {
          this.profile.set(res.data);
          this.populateEditData(res.data);
          this.profileSuccess.set('Cập nhật hồ sơ thông tin thành công!');
        }
      },
      error: (err) => {
        this.savingProfile.set(false);
        const msg = err.error?.message || 'Cập nhật thất bại. Vui lòng kiểm tra lại thông tin.';
        this.profileError.set(msg);
      }
    });
  }

  submitPassword(): void {
    this.passwordSuccess.set('');
    this.passwordError.set('');

    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordError.set('Mật khẩu xác nhận không khớp với mật khẩu mới');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      this.passwordError.set('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    this.savingPassword.set(true);
    this.authService.changePassword(this.passwordData).subscribe({
      next: (res) => {
        this.savingPassword.set(false);
        this.passwordSuccess.set('Đổi mật khẩu thành công! Vui lòng đăng nhập lại bằng mật khẩu mới.');
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        // Server đã vô hiệu hoá mọi token cũ (kể cả phiên này) nên chuyển về trang đăng nhập
        setTimeout(() => this.authService.logout(), 2000);
      },
      error: (err) => {
        this.savingPassword.set(false);
        const msg = err.error?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu hiện tại.';
        this.passwordError.set(msg);
      }
    });
  }

  resetPasswordForm(): void {
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordSuccess.set('');
    this.passwordError.set('');
  }

  onAvatarError(event: any): void {
    event.target.style.display = 'none';
  }

  hasDoctorRole(): boolean {
    return this.profile()?.roles?.some(r => r.includes('DOCTOR')) ?? false;
  }

  hasPatientRole(): boolean {
    return this.profile()?.roles?.some(r => r.includes('PATIENT')) ?? false;
  }

  /** Chữ viết tắt tên cho ô ảnh đại diện khi chưa có ảnh. */
  initials(): string {
    const parts = (this.profile()?.fullName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const last = parts[parts.length - 1][0];
    return parts.length > 1 ? (parts[parts.length - 2][0] + last).toUpperCase() : last.toUpperCase();
  }

  getRoleIcon(): string {
    const roles = this.profile()?.roles || [];
    if (roles.some(r => r.includes('ADMIN'))) return 'bi-shield-lock';
    if (roles.some(r => r.includes('DOCTOR'))) return 'bi-heart-pulse';
    if (roles.some(r => r.includes('STAFF'))) return 'bi-person-badge';
    if (roles.some(r => r.includes('LAB_TECH'))) return 'bi-eyedropper';
    return 'bi-person';
  }

  getRoleDisplayName(role: string): string {
    if (role.includes('ADMIN')) return 'Quản trị viên';
    if (role.includes('DOCTOR')) return 'Bác sĩ';
    if (role.includes('STAFF')) return 'Lễ tân';
    if (role.includes('LAB_TECH')) return 'Kỹ thuật viên';
    if (role.includes('PATIENT')) return 'Bệnh nhân';
    return role;
  }

  getRoleBadgeClass(role: string): string {
    if (role.includes('ADMIN')) return 'badge-admin';
    if (role.includes('DOCTOR')) return 'badge-doctor';
    if (role.includes('STAFF')) return 'badge-staff';
    if (role.includes('LAB_TECH')) return 'badge-lab';
    return 'badge-patient';
  }

  getRoleBadgeIcon(role: string): string {
    if (role.includes('ADMIN')) return 'bi-shield-shaded';
    if (role.includes('DOCTOR')) return 'bi-stethoscope';
    if (role.includes('STAFF')) return 'bi-person-workspace';
    if (role.includes('LAB_TECH')) return 'bi-droplet-half';
    return 'bi-heart-half';
  }
}
