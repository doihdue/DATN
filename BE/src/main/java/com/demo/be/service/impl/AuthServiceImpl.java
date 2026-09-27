package com.demo.be.service.impl;

import com.demo.be.dto.request.CreateUserRequest;
import com.demo.be.dto.request.LoginRequest;
import com.demo.be.dto.request.RefreshTokenRequest;
import com.demo.be.dto.request.RegisterRequest;
import com.demo.be.dto.response.AuthResponse;
import com.demo.be.dto.response.UserSummaryResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.security.JwtService;
import com.demo.be.security.UserPrincipal;
import com.demo.be.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final EmployeeRepository employeeRepository;
    private final SpecialtyRepository specialtyRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống");
        }

        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email đã được đăng ký trong hệ thống");
        }

        // 1. Tạo hồ sơ Bệnh nhân (Patient kế thừa Person)
        Patient patient = Patient.builder()
                .fullName(request.getFullName().trim())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .address(request.getAddress())
                .nationalId(request.getNationalId())
                .bloodGroup(request.getBloodGroup())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .build();
        patient = patientRepository.save(patient);

        // 2. Lấy hoặc tạo vai trò ROLE_PATIENT
        Role patientRole = roleRepository.findByName("ROLE_PATIENT")
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name("ROLE_PATIENT")
                        .description("Bệnh nhân sử dụng dịch vụ khám chữa bệnh")
                        .build()));

        // 3. Tạo tài khoản User
        User user = User.builder()
                .username(request.getUsername().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail().trim())
                .phoneNumber(request.getPhoneNumber())
                .status("ACTIVE")
                .person(patient)
                .build();
        user.addRole(patientRole);
        user = userRepository.save(user);

        // 4. Sinh Token và RefreshToken
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        String accessToken = jwtService.generateToken(userPrincipal);
        String refreshToken = jwtService.generateRefreshToken(userPrincipal);

        saveRefreshToken(user, refreshToken);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername().trim(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        User user = userRepository.findByUsername(userPrincipal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userPrincipal.getUsername()));

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new BadRequestException("Tài khoản của bạn đã bị khóa hoặc chưa kích hoạt");
        }

        String accessToken = jwtService.generateToken(userPrincipal);
        String refreshToken = jwtService.generateRefreshToken(userPrincipal);

        saveRefreshToken(user, refreshToken);

        return buildAuthResponse(user, accessToken, refreshToken);
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String tokenStr = request.getRefreshToken();
        RefreshToken refreshToken = refreshTokenRepository.findByToken(tokenStr)
                .orElseThrow(() -> new BadRequestException("Refresh token không hợp lệ hoặc không tồn tại"));

        if (Boolean.TRUE.equals(refreshToken.getRevoked())) {
            throw new BadRequestException("Refresh token này đã bị thu hồi");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Refresh token đã hết hạn, vui lòng đăng nhập lại");
        }

        User user = refreshToken.getUser();
        UserPrincipal userPrincipal = UserPrincipal.create(user);

        String newAccessToken = jwtService.generateToken(userPrincipal);
        String newRefreshToken = jwtService.generateRefreshToken(userPrincipal);

        // Cập nhật lại refresh token
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        saveRefreshToken(user, newRefreshToken);

        return buildAuthResponse(user, newAccessToken, newRefreshToken);
    }

    @Override
    @Transactional
    public void logout(UserPrincipal currentUser) {
        if (currentUser != null && currentUser.getUser() != null) {
            refreshTokenRepository.deleteByUser(currentUser.getUser());
        }
    }

    @Override
    public UserSummaryResponse getCurrentUser(UserPrincipal currentUser) {
        if (currentUser == null) {
            throw new BadRequestException("Chưa đăng nhập");
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", currentUser.getId()));

        return mapToUserSummary(user);
    }

    @Override
    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new BadRequestException("Tên đăng nhập đã tồn tại trong hệ thống");
        }

        if (userRepository.existsByEmail(request.getEmail().trim())) {
            throw new BadRequestException("Email đã được đăng ký trong hệ thống");
        }

        List<String> roleNames = request.getRoles();
        if (roleNames == null || roleNames.isEmpty()) {
            roleNames = List.of("ROLE_STAFF");
        }

        Person person;
        boolean isDoctor = roleNames.contains("ROLE_DOCTOR");

        if (isDoctor) {
            Specialty specialty = null;
            if (request.getSpecialtyId() != null) {
                specialty = specialtyRepository.findById(request.getSpecialtyId()).orElse(null);
            }

            Doctor doctor = Doctor.builder()
                    .fullName(request.getFullName().trim())
                    .gender(request.getGender())
                    .dateOfBirth(request.getDateOfBirth())
                    .address(request.getAddress())
                    .nationalId(request.getNationalId())
                    .employeeCode(request.getEmployeeCode())
                    .position("Bác sĩ chuyên khoa")
                    .academicTitle(request.getAcademicTitle())
                    .yearsOfExperience(request.getYearsOfExperience())
                    .biography(request.getBiography())
                    .specialty(specialty)
                    .build();
            person = doctorRepository.save(doctor);
        } else {
            Employee employee = Employee.builder()
                    .fullName(request.getFullName().trim())
                    .gender(request.getGender())
                    .dateOfBirth(request.getDateOfBirth())
                    .address(request.getAddress())
                    .nationalId(request.getNationalId())
                    .employeeCode(request.getEmployeeCode())
                    .position(request.getPosition() != null ? request.getPosition() : "Nhân viên tiếp đón")
                    .build();
            person = employeeRepository.save(employee);
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail().trim())
                .phoneNumber(request.getPhoneNumber())
                .status("ACTIVE")
                .person(person)
                .build();

        for (String roleName : roleNames) {
            String formattedRole = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
            Role role = roleRepository.findByName(formattedRole)
                    .orElseGet(() -> roleRepository.save(Role.builder().name(formattedRole).description(formattedRole).build()));
            user.addRole(role);
        }

        user = userRepository.save(user);

        return mapToUserSummary(user);
    }

    private void saveRefreshToken(User user, String token) {
        RefreshToken refreshToken = RefreshToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationTime() / 1000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, String accessToken, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationTime() / 1000)
                .user(mapToUserSummary(user))
                .build();
    }

    private UserSummaryResponse mapToUserSummary(User user) {
        List<String> roles = user.getUserRoles().stream()
                .map(ur -> ur.getRole().getName())
                .collect(Collectors.toList());

        String fullName = user.getPerson() != null ? user.getPerson().getFullName() : user.getUsername();
        String avatarUrl = user.getPerson() != null ? user.getPerson().getAvatarUrl() : null;
        Long personId = user.getPerson() != null ? user.getPerson().getId() : null;

        return UserSummaryResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(fullName)
                .phoneNumber(user.getPhoneNumber())
                .avatarUrl(avatarUrl)
                .status(user.getStatus())
                .personId(personId)
                .roles(roles)
                .build();
    }
}
