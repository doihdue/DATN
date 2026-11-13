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
    <div class="profile-page-wrapper">
      <div class="profile-container">

        <!-- Top Header & Breadcrumb -->
        <div class="profile-header-bar">
          <div class="header-titles">
            <span class="badge-category"><i class="bi bi-person-circle"></i> Trung tâm tài khoản</span>
            <h1 class="main-title">Hồ Sơ Cá Nhân &amp; Bảo Mật</h1>
            <p class="subtitle">Quản lý thông tin cá nhân, hồ sơ chuyên môn và thay đổi mật khẩu đăng nhập</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-outline" (click)="loadProfile()" [disabled]="loading()">
              <i class="bi bi-arrow-clockwise" [class.spin]="loading()"></i> Làm mới
            </button>
          </div>
        </div>

        @if (loading()) {
          <div class="loading-state card">
            <div class="spinner"></div>
            <p>Đang tải thông tin hồ sơ tài khoản...</p>
          </div>
        } @else if (profile()) {
          <!-- User Banner Card -->
          <div class="user-hero-card">
            <div class="avatar-col">
              <div class="avatar-large">
                @if (profile()?.avatarUrl) {
                  <img [src]="profile()?.avatarUrl" alt="Avatar" (error)="onAvatarError($event)" />
                } @else {
                  <i class="bi" [ngClass]="getRoleIcon()"></i>
                }
              </div>
            </div>

            <div class="info-col">
              <div class="hero-top-row">
                <h2 class="user-name">{{ profile()?.fullName }}</h2>
                <span class="status-pill active">
                  <span class="dot"></span> {{ profile()?.status === 'ACTIVE' ? 'Đang hoạt động' : profile()?.status }}
                </span>
              </div>

              <div class="hero-meta-row">
                <span class="meta-item"><i class="bi bi-person"></i> &#64;{{ profile()?.username }}</span>
                <span class="meta-item"><i class="bi bi-envelope"></i> {{ profile()?.email || 'Chưa cập nhật email' }}</span>
                @if (profile()?.phoneNumber) {
                  <span class="meta-item"><i class="bi bi-telephone"></i> {{ profile()?.phoneNumber }}</span>
                }
              </div>

              <div class="hero-roles-row">
                @for (role of profile()?.roles; track role) {
                  <span class="role-badge" [ngClass]="getRoleBadgeClass(role)">
                    <i class="bi" [ngClass]="getRoleBadgeIcon(role)"></i>
                    {{ getRoleDisplayName(role) }}
                  </span>
                }
                @if (profile()?.specialtyName) {
                  <span class="role-badge badge-specialty">
                    <i class="bi bi-hospital"></i> {{ profile()?.specialtyName }}
                  </span>
                }
                @if (profile()?.employeeCode) {
                  <span class="role-badge badge-code">
                    <i class="bi bi-qr-code"></i> Mã: {{ profile()?.employeeCode }}
                  </span>
                }
              </div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="profile-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab() === 'profile'" 
              (click)="activeTab.set('profile')">
              <i class="bi bi-person-lines-fill"></i> Thông tin cá nhân &amp; Hồ sơ
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="activeTab() === 'password'" 
              (click)="activeTab.set('password')">
              <i class="bi bi-shield-lock-fill"></i> Đổi mật khẩu &amp; Bảo mật
            </button>
          </div>

          <!-- TAB 1: THÔNG TIN CÁ NHÂN -->
          @if (activeTab() === 'profile') {
            <div class="tab-content card">
              <div class="section-title">
                <div class="title-left">
                  <i class="bi bi-pencil-square text-primary"></i>
                  <h3>Chỉnh sửa thông tin cá nhân</h3>
                </div>
                <span class="note-hint">* Các trường có dấu sao là bắt buộc</span>
              </div>

              @if (profileSuccess()) {
                <div class="alert alert-success">
                  <i class="bi bi-check-circle-fill"></i>
                  <span>{{ profileSuccess() }}</span>
                </div>
              }
              @if (profileError()) {
                <div class="alert alert-danger">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>{{ profileError() }}</span>
                </div>
              }

              <form (ngSubmit)="submitProfile()" #pForm="ngForm">
                <!-- Nhóm thông tin cơ bản -->
                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label required">Họ và tên</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      name="fullName" 
                      [(ngModel)]="profileEditData.fullName" 
                      required 
                      placeholder="Nhập họ và tên đầy đủ" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Tên tài khoản (Username)</label>
                    <input 
                      type="text" 
                      class="form-control disabled-input" 
                      [value]="profile()?.username" 
                      disabled 
                      title="Tên tài khoản không thể thay đổi" />
                  </div>

                  <div class="form-group">
                    <label class="form-label required">Địa chỉ Email</label>
                    <input 
                      type="email" 
                      class="form-control" 
                      name="email" 
                      [(ngModel)]="profileEditData.email" 
                      required 
                      placeholder="example@clinic.com" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Số điện thoại</label>
                    <input 
                      type="tel" 
                      class="form-control" 
                      name="phoneNumber" 
                      [(ngModel)]="profileEditData.phoneNumber" 
                      placeholder="0912345678" />
                  </div>

                  <div class="form-group">
                    <label class="form-label">Giới tính</label>
                    <select class="form-control" name="gender" [(ngModel)]="profileEditData.gender">
                      <option value="">-- Chọn giới tính --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Ngày sinh</label>
                    <input 
                      type="date" 
                      class="form-control" 
                      name="dateOfBirth" 
                      [(ngModel)]="profileEditData.dateOfBirth" />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Địa chỉ liên hệ</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      name="address" 
                      [(ngModel)]="profileEditData.address" 
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" />
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label">Link ảnh đại diện (Avatar URL)</label>
                    <div class="avatar-input-group">
                      <input 
                        type="url" 
                        class="form-control" 
                        name="avatarUrl" 
                        [(ngModel)]="profileEditData.avatarUrl" 
                        placeholder="https://example.com/avatar.jpg" />
                      @if (profileEditData.avatarUrl) {
                        <div class="avatar-preview-mini">
                          <img [src]="profileEditData.avatarUrl" alt="Preview" (error)="onAvatarError($event)" />
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Bác sĩ: Trường chuyên môn -->
                @if (hasDoctorRole()) {
                  <div class="role-specific-section">
                    <h4 class="sub-section-title">
                      <i class="bi bi-heart-pulse-fill text-success"></i> Thông tin Chuyên môn Bác sĩ
                    </h4>
                    <div class="form-grid">
                      <div class="form-group">
                        <label class="form-label">Học hàm / Học vị</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          name="academicTitle" 
                          [(ngModel)]="profileEditData.academicTitle" 
                          placeholder="Ví dụ: BSCKII, ThS.BS, PGS.TS" />
                      </div>

                      <div class="form-group">
                        <label class="form-label">Năm kinh nghiệm</label>
                        <input 
                          type="number" 
                          min="0" 
                          max="60" 
                          class="form-control" 
                          name="yearsOfExperience" 
                          [(ngModel)]="profileEditData.yearsOfExperience" 
                          placeholder="Số năm hành nghề y" />
                      </div>

                      <div class="form-group full-width">
                        <label class="form-label">Tiểu sử chuyên môn &amp; Thế mạnh điều trị</label>
                        <textarea 
                          class="form-control" 
                          rows="3" 
                          name="biography" 
                          [(ngModel)]="profileEditData.biography" 
                          placeholder="Mô tả quá trình công tác, thành tựu, các kỹ thuật chuyên sâu..."></textarea>
                      </div>
                    </div>
                  </div>
                }

                <!-- Bệnh nhân: Trường y tế & liên hệ khẩn cấp -->
                @if (hasPatientRole()) {
                  <div class="role-specific-section">
                    <h4 class="sub-section-title">
                      <i class="bi bi-shield-plus text-primary"></i> Thông tin Y tế &amp; Khẩn cấp
                    </h4>
                    <div class="form-grid">
                      <div class="form-group">
                        <label class="form-label">Nhóm máu</label>
                        <select class="form-control" name="bloodGroup" [(ngModel)]="profileEditData.bloodGroup">
                          <option value="">-- Chưa xác định --</option>
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
                        <label class="form-label">Dị ứng thuốc / Thực phẩm</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          name="allergies" 
                          [(ngModel)]="profileEditData.allergies" 
                          placeholder="Ví dụ: Dị ứng Penicillin, Aspirin..." />
                      </div>

                      <div class="form-group">
                        <label class="form-label">Người liên hệ khẩn cấp</label>
                        <input 
                          type="text" 
                          class="form-control" 
                          name="emergencyContactName" 
                          [(ngModel)]="profileEditData.emergencyContactName" 
                          placeholder="Họ tên người thân" />
                      </div>

                      <div class="form-group">
                        <label class="form-label">Số điện thoại khẩn cấp</label>
                        <input 
                          type="tel" 
                          class="form-control" 
                          name="emergencyContactPhone" 
                          [(ngModel)]="profileEditData.emergencyContactPhone" 
                          placeholder="SĐT người thân khi cần báo" />
                      </div>
                    </div>
                  </div>
                }

                <div class="form-actions-bar">
                  <button 
                    type="submit" 
                    class="btn btn-primary" 
                    [disabled]="savingProfile() || !profileEditData.fullName || !profileEditData.email">
                    @if (savingProfile()) {
                      <span class="spinner-small"></span> Đang lưu...
                    } @else {
                      <i class="bi bi-floppy-fill"></i> Lưu thay đổi thông tin
                    }
                  </button>
                  <button type="button" class="btn btn-outline" (click)="resetProfileForm()">
                    <i class="bi bi-x-circle"></i> Khôi phục ban đầu
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- TAB 2: ĐỔI MẬT KHẨU -->
          @if (activeTab() === 'password') {
            <div class="tab-content card">
              <div class="section-title">
                <div class="title-left">
                  <i class="bi bi-shield-lock-fill text-primary"></i>
                  <h3>Thay đổi mật khẩu đăng nhập</h3>
                </div>
                <span class="note-hint">Đảm bảo mật khẩu an toàn theo tiêu chuẩn bảo mật y tế</span>
              </div>

              @if (passwordSuccess()) {
                <div class="alert alert-success">
                  <i class="bi bi-check-circle-fill"></i>
                  <span>{{ passwordSuccess() }}</span>
                </div>
              }
              @if (passwordError()) {
                <div class="alert alert-danger">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>{{ passwordError() }}</span>
                </div>
              }

              <div class="password-layout-grid">
                <!-- Cột trái: Form nhập mật khẩu -->
                <div class="password-form-column">
                  <form (ngSubmit)="submitPassword()" #pwForm="ngForm">
                    <div class="form-group">
                      <label class="form-label required">Mật khẩu hiện tại</label>
                      <div class="input-password-wrapper">
                        <input 
                          [type]="showCurrentPw() ? 'text' : 'password'" 
                          class="form-control" 
                          name="currentPassword" 
                          [(ngModel)]="passwordData.currentPassword" 
                          required 
                          placeholder="Nhập mật khẩu bạn đang dùng" />
                        <button 
                          type="button" 
                          class="btn-toggle-eye" 
                          (click)="showCurrentPw.set(!showCurrentPw())"
                          tabindex="-1">
                          <i class="bi" [ngClass]="showCurrentPw() ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                        </button>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label required">Mật khẩu mới</label>
                      <div class="input-password-wrapper">
                        <input 
                          [type]="showNewPw() ? 'text' : 'password'" 
                          class="form-control" 
                          name="newPassword" 
                          [(ngModel)]="passwordData.newPassword" 
                          required 
                          minlength="6" 
                          placeholder="Tối thiểu 6 ký tự" />
                        <button 
                          type="button" 
                          class="btn-toggle-eye" 
                          (click)="showNewPw.set(!showNewPw())"
                          tabindex="-1">
                          <i class="bi" [ngClass]="showNewPw() ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                        </button>
                      </div>
                      @if (passwordData.newPassword && passwordData.newPassword.length < 6) {
                        <span class="input-hint text-danger"><i class="bi bi-x-circle"></i> Mật khẩu phải có ít nhất 6 ký tự</span>
                      } @else if (passwordData.newPassword && passwordData.newPassword.length >= 6) {
                        <span class="input-hint text-success"><i class="bi bi-check-circle"></i> Độ dài mật khẩu hợp lệ (≥ 6 ký tự)</span>
                      }
                    </div>

                    <div class="form-group">
                      <label class="form-label required">Xác nhận mật khẩu mới</label>
                      <div class="input-password-wrapper">
                        <input 
                          [type]="showConfirmPw() ? 'text' : 'password'" 
                          class="form-control" 
                          name="confirmPassword" 
                          [(ngModel)]="passwordData.confirmPassword" 
                          required 
                          placeholder="Nhập lại mật khẩu mới vừa gõ" />
                        <button 
                          type="button" 
                          class="btn-toggle-eye" 
                          (click)="showConfirmPw.set(!showConfirmPw())"
                          tabindex="-1">
                          <i class="bi" [ngClass]="showConfirmPw() ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
                        </button>
                      </div>
                      @if (passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
                        <span class="input-hint text-danger"><i class="bi bi-x-circle"></i> Mật khẩu xác nhận chưa khớp</span>
                      } @else if (passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword) {
                        <span class="input-hint text-success"><i class="bi bi-check-circle"></i> Mật khẩu xác nhận khớp hoàn toàn</span>
                      }
                    </div>

                    <div class="form-actions-bar">
                      <button 
                        type="submit" 
                        class="btn btn-primary" 
                        [disabled]="savingPassword() || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword.length < 6 || passwordData.newPassword !== passwordData.confirmPassword">
                        @if (savingPassword()) {
                          <span class="spinner-small"></span> Đang xử lý...
                        } @else {
                          <i class="bi bi-shield-check"></i> Cập nhật mật khẩu mới
                        }
                      </button>
                      <button type="button" class="btn btn-outline" (click)="resetPasswordForm()">
                        <i class="bi bi-arrow-counterclockwise"></i> Làm lại
                      </button>
                    </div>
                  </form>
                </div>

                <!-- Cột phải: Bảng chính sách bảo mật -->
                <div class="security-info-panel">
                  <div class="panel-header">
                    <div class="panel-icon">
                      <i class="bi bi-shield-lock-fill"></i>
                    </div>
                    <div>
                      <h4 class="panel-title">Chính sách bảo mật tài khoản</h4>
                      <p class="panel-subtitle">Tiêu chuẩn an toàn dữ liệu y tế</p>
                    </div>
                  </div>

                  <div class="security-rules-list">
                    <div class="rule-item">
                      <i class="bi bi-check-circle-fill text-success"></i>
                      <div class="rule-text">
                        <strong>Độ dài &amp; Độ phức tạp</strong>
                        <span>Tối thiểu 6 ký tự. Khuyến khích kết hợp chữ hoa, chữ thường, số và ký tự (!&#64;#$%).</span>
                      </div>
                    </div>

                    <div class="rule-item">
                      <i class="bi bi-check-circle-fill text-success"></i>
                      <div class="rule-text">
                        <strong>Khác biệt với mật khẩu cũ</strong>
                        <span>Hệ thống tự động từ chối nếu bạn đặt trùng với mật khẩu đang sử dụng.</span>
                      </div>
                    </div>

                    <div class="rule-item">
                      <i class="bi bi-shield-shaded text-primary"></i>
                      <div class="rule-text">
                        <strong>Tự động thu hồi phiên đăng nhập</strong>
                        <span>Sau khi đổi mật khẩu, hệ thống sẽ đăng xuất các phiên làm việc khác để bảo vệ bệnh án.</span>
                      </div>
                    </div>
                  </div>

                  <div class="support-notice">
                    <i class="bi bi-headset"></i>
                    <span>Cần trợ giúp bảo mật hoặc nghi ngờ tài khoản bị xâm nhập? Liên hệ ngay Quản trị viên hệ thống.</span>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .profile-page-wrapper {
      min-height: calc(100vh - 120px);
      background-color: #f8fafc;
      padding: 24px 20px 80px;
    }

    .profile-container {
      max-width: 980px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .profile-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }

    .badge-category {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #0284c7;
      background: #e0f2fe;
      padding: 4px 10px;
      border-radius: 9999px;
      margin-bottom: 6px;
    }

    .main-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 4px 0;
    }

    .subtitle {
      font-size: 0.95rem;
      color: #64748b;
      margin: 0;
    }

    .card {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      padding: 24px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #64748b;
      gap: 16px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner-small {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 6px;
      vertical-align: middle;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spin {
      animation: spin 0.8s linear infinite;
    }

    /* User Hero Card */
    .user-hero-card {
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      border-radius: 16px;
      padding: 28px;
      display: flex;
      align-items: center;
      gap: 24px;
      box-shadow: 0 8px 24px rgba(2, 132, 199, 0.2);
    }

    @media (max-width: 640px) {
      .user-hero-card {
        flex-direction: column;
        text-align: center;
        padding: 20px;
      }
    }

    .avatar-large {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 3px solid #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.8rem;
      color: #ffffff;
      overflow: hidden;
      flex-shrink: 0;
    }

    .avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .info-col {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex-grow: 1;
    }

    .hero-top-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .user-name {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.2);
      color: #a7f3d0;
      border: 1px solid rgba(16, 185, 129, 0.4);
      padding: 2px 10px;
      border-radius: 9999px;
    }

    .status-pill .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
    }

    .hero-meta-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 0.9rem;
      color: #e0f2fe;
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .hero-roles-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 4px;
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .role-badge.badge-admin { background: #7c3aed; border-color: #9333ea; }
    .role-badge.badge-doctor { background: #059669; border-color: #10b981; }
    .role-badge.badge-staff { background: #d97706; border-color: #f59e0b; }
    .role-badge.badge-lab { background: #0d9488; border-color: #14b8a6; }
    .role-badge.badge-patient { background: #2563eb; border-color: #3b82f6; }
    .role-badge.badge-specialty { background: rgba(0, 0, 0, 0.25); border-color: rgba(255, 255, 255, 0.3); }
    .role-badge.badge-code { background: rgba(0, 0, 0, 0.25); border-color: rgba(255, 255, 255, 0.3); }

    /* Tabs */
    .profile-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0;
    }

    .tab-btn {
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      padding: 12px 18px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      color: #0284c7;
    }

    .tab-btn.active {
      color: #0284c7;
      border-bottom-color: #0284c7;
    }

    /* Form Styles */
    .section-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
    }

    .title-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-left h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .note-hint {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    @media (max-width: 640px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
    }

    .form-label.required::after {
      content: ' *';
      color: #ef4444;
    }

    .form-control {
      height: 42px;
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #1e293b;
      background: #ffffff;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .form-control:focus {
      border-color: #0284c7;
      box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
    }

    textarea.form-control {
      height: auto;
      resize: vertical;
    }

    .disabled-input {
      background-color: #f1f5f9;
      color: #64748b;
      cursor: not-allowed;
    }

    .avatar-input-group {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar-preview-mini {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      flex-shrink: 0;
    }

    .avatar-preview-mini img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .role-specific-section {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }

    .sub-section-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .form-actions-bar {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .btn-primary {
      background: #0284c7;
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #0369a1;
    }

    .btn-warning {
      background: #f59e0b;
      color: #ffffff;
    }

    .btn-warning:hover:not(:disabled) {
      background: #d97706;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #cbd5e1;
      color: #475569;
    }

    .btn-outline:hover:not(:disabled) {
      background: #f1f5f9;
      color: #0f172a;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }

    .alert-success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .alert-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Password 2-column layout */
    .password-layout-grid {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 32px;
      align-items: start;
    }

    @media (max-width: 820px) {
      .password-layout-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }
    }

    .password-form-column {
      display: flex;
      flex-direction: column;
    }

    .input-hint {
      font-size: 0.8rem;
      font-weight: 500;
      margin-top: 4px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .text-danger {
      color: #ef4444;
    }

    .text-success {
      color: #10b981;
    }

    .input-password-wrapper {
      position: relative;
    }

    .input-password-wrapper .form-control {
      padding-right: 42px;
    }

    .btn-toggle-eye {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 42px;
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
    }

    .btn-toggle-eye:hover {
      color: #0f172a;
    }

    /* Right column: Security Guidelines Panel */
    .security-info-panel {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .panel-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e2e8f0;
    }

    .panel-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #e0f2fe;
      color: #0284c7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .panel-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }

    .panel-subtitle {
      font-size: 0.775rem;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    .security-rules-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .rule-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 0.85rem;
    }

    .rule-item i {
      font-size: 1.15rem;
      margin-top: 2px;
      flex-shrink: 0;
    }

    .rule-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      line-height: 1.35;
    }

    .rule-text strong {
      color: #1e293b;
      font-size: 0.85rem;
    }

    .rule-text span {
      color: #64748b;
      font-size: 0.8rem;
    }

    .support-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: #f1f5f9;
      border-radius: 8px;
      font-size: 0.8rem;
      color: #475569;
      line-height: 1.4;
    }

    .support-notice i {
      font-size: 1.1rem;
      color: #0284c7;
      margin-top: 1px;
      flex-shrink: 0;
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
        this.passwordSuccess.set('Đổi mật khẩu thành công! Vui lòng ghi nhớ mật khẩu mới của bạn.');
        this.passwordData = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
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

  getRoleIcon(): string {
    const roles = this.profile()?.roles || [];
    if (roles.some(r => r.includes('ADMIN'))) return 'bi-shield-lock';
    if (roles.some(r => r.includes('DOCTOR'))) return 'bi-heart-pulse';
    if (roles.some(r => r.includes('STAFF'))) return 'bi-person-badge';
    if (roles.some(r => r.includes('LAB_TECH'))) return 'bi-eyedropper';
    return 'bi-person';
  }

  getRoleDisplayName(role: string): string {
    if (role.includes('ADMIN')) return 'Quản trị viên (Admin)';
    if (role.includes('DOCTOR')) return 'Bác sĩ chuyên khoa';
    if (role.includes('STAFF')) return 'Nhân viên lễ tân';
    if (role.includes('LAB_TECH')) return 'Kỹ thuật viên xét nghiệm';
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
