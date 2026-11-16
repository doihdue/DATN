package com.demo.be.service;

import com.demo.be.dto.request.ChangePasswordRequest;
import com.demo.be.dto.request.UpdateProfileRequest;
import com.demo.be.dto.response.UserProfileResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.Doctor;
import com.demo.be.model.Patient;
import com.demo.be.model.Role;
import com.demo.be.model.Specialty;
import com.demo.be.model.User;
import com.demo.be.repository.DoctorRepository;
import com.demo.be.repository.EmployeeRepository;
import com.demo.be.repository.PatientRepository;
import com.demo.be.repository.PersonRepository;
import com.demo.be.repository.RefreshTokenRepository;
import com.demo.be.repository.RoleRepository;
import com.demo.be.repository.SpecialtyRepository;
import com.demo.be.repository.UserRepository;
import com.demo.be.security.JwtService;
import com.demo.be.security.UserPrincipal;
import com.demo.be.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceProfileTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private SpecialtyRepository specialtyRepository;

    @Mock
    private PersonRepository personRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User sampleUser;
    private UserPrincipal userPrincipal;

    @BeforeEach
    void setUp() {
        sampleUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@clinic.com")
                .phoneNumber("0987654321")
                .passwordHash("hashed_old_password")
                .status("ACTIVE")
                .build();

        userPrincipal = UserPrincipal.create(sampleUser);
    }

    @Test
    @DisplayName("Đổi mật khẩu thành công khi thông tin hợp lệ")
    void changePassword_success() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass@123")
                .newPassword("NewPass@456")
                .confirmPassword("NewPass@456")
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("OldPass@123", "hashed_old_password")).thenReturn(true);
        when(passwordEncoder.matches("NewPass@456", "hashed_old_password")).thenReturn(false);
        when(passwordEncoder.encode("NewPass@456")).thenReturn("hashed_new_password");

        authService.changePassword(userPrincipal, request);

        assertEquals("hashed_new_password", sampleUser.getPasswordHash());
        verify(userRepository).save(sampleUser);
        verify(refreshTokenRepository).deleteByUser(sampleUser);
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi xác nhận mật khẩu không khớp")
    void changePassword_mismatchedConfirmPassword_throwsException() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass@123")
                .newPassword("NewPass@456")
                .confirmPassword("DifferentPass")
                .build();

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.changePassword(userPrincipal, request));

        assertTrue(ex.getMessage().contains("không khớp"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi mật khẩu hiện tại không đúng")
    void changePassword_wrongCurrentPassword_throwsException() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("WrongOldPass")
                .newPassword("NewPass@456")
                .confirmPassword("NewPass@456")
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("WrongOldPass", "hashed_old_password")).thenReturn(false);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.changePassword(userPrincipal, request));

        assertTrue(ex.getMessage().contains("không chính xác"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi mật khẩu mới trùng với mật khẩu cũ")
    void changePassword_sameAsOldPassword_throwsException() {
        ChangePasswordRequest request = ChangePasswordRequest.builder()
                .currentPassword("OldPass@123")
                .newPassword("OldPass@123")
                .confirmPassword("OldPass@123")
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(passwordEncoder.matches("OldPass@123", "hashed_old_password")).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.changePassword(userPrincipal, request));

        assertTrue(ex.getMessage().contains("không được trùng"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lấy hồ sơ cá nhân người dùng có vai trò Bác sĩ")
    void getProfile_doctor_returnsCorrectProfile() {
        Specialty specialty = Specialty.builder().id(10L).name("Nội tổng quát").build();
        Doctor doctor = Doctor.builder()
                .id(1L)
                .fullName("BS. Nguyễn Văn A")
                .gender("Nam")
                .dateOfBirth(LocalDate.of(1985, 5, 20))
                .address("Hà Nội")
                .nationalId("012345678901")
                .academicTitle("Thạc sĩ")
                .yearsOfExperience(12)
                .biography("Bác sĩ chuyên khoa tiêu hoá")
                .specialty(specialty)
                .build();

        sampleUser.setPerson(doctor);
        Role doctorRole = Role.builder().name("ROLE_DOCTOR").build();
        sampleUser.addRole(doctorRole);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));

        UserProfileResponse response = authService.getProfile(userPrincipal);

        assertNotNull(response);
        assertEquals("testuser", response.getUsername());
        assertEquals("BS. Nguyễn Văn A", response.getFullName());
        assertEquals("Thạc sĩ", response.getAcademicTitle());
        assertEquals(12, response.getYearsOfExperience());
        assertEquals("Nội tổng quát", response.getSpecialtyName());
        assertTrue(response.getRoles().contains("ROLE_DOCTOR"));
    }

    @Test
    @DisplayName("Cập nhật thông tin cá nhân thành công")
    void updateProfile_success() {
        Patient patient = Patient.builder()
                .id(1L)
                .fullName("Trần Thị B")
                .gender("Nữ")
                .dateOfBirth(LocalDate.of(1995, 8, 15))
                .address("Đà Nẵng")
                .bloodGroup("O+")
                .allergies("Dị ứng Penicillin")
                .build();

        sampleUser.setPerson(patient);

        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Trần Thị B (Đã đổi)")
                .email("newemail@clinic.com")
                .phoneNumber("0912345678")
                .address("TP. Hồ Chí Minh")
                .bloodGroup("A+")
                .allergies("Không có")
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(userRepository.existsByEmailAndIdNot("newemail@clinic.com", 1L)).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserProfileResponse response = authService.updateProfile(userPrincipal, request);

        assertNotNull(response);
        assertEquals("Trần Thị B (Đã đổi)", response.getFullName());
        assertEquals("newemail@clinic.com", response.getEmail());
        assertEquals("0912345678", response.getPhoneNumber());
        assertEquals("TP. Hồ Chí Minh", response.getAddress());
        assertEquals("A+", response.getBloodGroup());
        assertEquals("Không có", response.getAllergies());
        verify(patientRepository).save(patient);
        verify(userRepository).save(sampleUser);
    }

    @Test
    @DisplayName("Cập nhật hồ sơ thất bại khi email mới đã bị người khác sử dụng")
    void updateProfile_emailAlreadyExists_throwsException() {
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Trần Thị B")
                .email("taken@clinic.com")
                .build();

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(sampleUser));
        when(userRepository.existsByEmailAndIdNot("taken@clinic.com", 1L)).thenReturn(true);

        BadRequestException ex = assertThrows(BadRequestException.class, () ->
                authService.updateProfile(userPrincipal, request));

        assertTrue(ex.getMessage().contains("đã được sử dụng"));
        verify(userRepository, never()).save(any());
    }
}

