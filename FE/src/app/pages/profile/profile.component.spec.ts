import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileComponent } from './profile.component';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';
import { UserProfileResponse, ApiResponse } from '../../models/auth.models';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let authService: AuthService;

  const mockProfile: UserProfileResponse = {
    id: 1,
    username: 'doctor_hung',
    email: 'doctor_hung@clinic.com',
    phoneNumber: '0987654321',
    status: 'ACTIVE',
    roles: ['ROLE_DOCTOR'],
    fullName: 'BS. Nguyễn Văn Hùng',
    academicTitle: 'BSCKII',
    yearsOfExperience: 15,
    specialtyName: 'Khoa Nội'
  };

  const mockApiResponse: ApiResponse<UserProfileResponse> = {
    success: true,
    message: 'Thành công',
    data: mockProfile,
    timestamp: '2026-11-13T22:00:00'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService);
    vi.spyOn(authService, 'getProfile').mockReturnValue(of(mockApiResponse));

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('khởi tạo component thành công và tải thông tin hồ sơ', () => {
    expect(component).toBeTruthy();
    expect(component.profile()?.fullName).toBe('BS. Nguyễn Văn Hùng');
    expect(component.hasDoctorRole()).toBe(true);
    expect(component.hasPatientRole()).toBe(false);
  });

  it('chuyển đổi tab thông tin và tab đổi mật khẩu', () => {
    expect(component.activeTab()).toBe('profile');
    component.activeTab.set('password');
    expect(component.activeTab()).toBe('password');
  });

  it('bắt lỗi khi xác nhận mật khẩu không khớp', () => {
    component.passwordData = {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPassword123',
      confirmPassword: 'MismatchPassword'
    };
    component.submitPassword();
    expect(component.passwordError()).toContain('không khớp');
  });

  it('bắt lỗi khi mật khẩu mới dưới 6 ký tự', () => {
    component.passwordData = {
      currentPassword: 'OldPassword123',
      newPassword: '123',
      confirmPassword: '123'
    };
    component.submitPassword();
    expect(component.passwordError()).toContain('tối thiểu 6 ký tự');
  });
});

