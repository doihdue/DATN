package com.demo.be.service.impl;

import com.demo.be.dto.request.DoctorRequest;
import com.demo.be.dto.response.DoctorResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Doctor;
import com.demo.be.model.Role;
import com.demo.be.model.Specialty;
import com.demo.be.model.User;
import com.demo.be.repository.*;
import com.demo.be.service.DoctorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DoctorServiceImpl implements DoctorService {

    private static final String ROLE_DOCTOR = "ROLE_DOCTOR";
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "LOCKED");

    private final DoctorRepository doctorRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;
    private final RoleRepository roleRepository;
    private final SpecialtyRepository specialtyRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<DoctorResponse> searchDoctors(String keyword, Long specialtyId, String status) {
        String kw = trimToNull(keyword);
        String st = trimToNull(status);
        return doctorRepository.searchDoctors(kw, specialtyId, st != null ? st.toUpperCase() : null).stream()
                .map(DoctorResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DoctorResponse getDoctorById(Long id) {
        return DoctorResponse.fromEntity(findDoctor(id));
    }

    @Override
    @Transactional
    public DoctorResponse createDoctor(DoctorRequest request) {
        String username = trimToNull(request.getUsername());
        if (username == null) {
            throw new BadRequestException("Tên đăng nhập không được để trống");
        }
        if (trimToNull(request.getPassword()) == null) {
            throw new BadRequestException("Mật khẩu không được để trống");
        }
        if (userRepository.existsByUsername(username)) {
            throw new BadRequestException("Tên đăng nhập '" + username + "' đã tồn tại trong hệ thống");
        }

        String email = request.getEmail().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email '" + email + "' đã được đăng ký trong hệ thống");
        }

        String employeeCode = normalizeCode(request.getEmployeeCode());
        if (employeeCode != null && employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new BadRequestException("Mã bác sĩ '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null && personRepository.findByNationalId(nationalId).isPresent()) {
            throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
        }

        Doctor doctor = Doctor.builder()
                .fullName(request.getFullName().trim())
                .gender(trimToNull(request.getGender()))
                .dateOfBirth(request.getDateOfBirth())
                .address(trimToNull(request.getAddress()))
                .nationalId(nationalId)
                .employeeCode(employeeCode)
                .position(defaultPosition(request.getPosition()))
                .hireDate(request.getHireDate() != null ? request.getHireDate() : LocalDate.now())
                .academicTitle(trimToNull(request.getAcademicTitle()))
                .yearsOfExperience(request.getYearsOfExperience())
                .averageConsultationTime(request.getAverageConsultationTime() != null ? request.getAverageConsultationTime() : 15)
                .biography(trimToNull(request.getBiography()))
                .specialty(resolveSpecialty(request.getSpecialtyId()))
                .build();
        doctor = doctorRepository.save(doctor);

        // Tự sinh mã bác sĩ nếu Admin không nhập
        if (doctor.getEmployeeCode() == null) {
            doctor.setEmployeeCode(String.format("DOC%03d", doctor.getId()));
        }

        Role doctorRole = roleRepository.findByName(ROLE_DOCTOR)
                .orElseGet(() -> roleRepository.save(Role.builder().name(ROLE_DOCTOR).description("Bác sĩ").build()));

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .phoneNumber(trimToNull(request.getPhoneNumber()))
                .status("ACTIVE")
                .person(doctor)
                .build();
        user.addRole(doctorRole);
        user = userRepository.save(user);
        doctor.setUser(user);

        log.info("-> Admin đã tạo bác sĩ mới: {} (Mã: {}, tài khoản: {})", doctor.getFullName(), doctor.getEmployeeCode(), username);
        return DoctorResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public DoctorResponse updateDoctor(Long id, DoctorRequest request) {
        Doctor doctor = findDoctor(id);
        User user = doctor.getUser();

        String email = request.getEmail().trim();
        userRepository.findByEmail(email)
                .filter(other -> user == null || !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new BadRequestException("Email '" + email + "' đã được đăng ký bởi tài khoản khác");
                });

        String employeeCode = normalizeCode(request.getEmployeeCode());
        if (employeeCode != null && !employeeCode.equalsIgnoreCase(doctor.getEmployeeCode())
                && employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new BadRequestException("Mã bác sĩ '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null) {
            personRepository.findByNationalId(nationalId)
                    .filter(other -> !other.getId().equals(doctor.getId()))
                    .ifPresent(other -> {
                        throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
                    });
        }

        doctor.setFullName(request.getFullName().trim());
        doctor.setGender(trimToNull(request.getGender()));
        doctor.setDateOfBirth(request.getDateOfBirth());
        doctor.setAddress(trimToNull(request.getAddress()));
        doctor.setNationalId(nationalId);
        if (employeeCode != null) {
            doctor.setEmployeeCode(employeeCode);
        }
        doctor.setPosition(defaultPosition(request.getPosition()));
        if (request.getHireDate() != null) {
            doctor.setHireDate(request.getHireDate());
        }
        doctor.setAcademicTitle(trimToNull(request.getAcademicTitle()));
        doctor.setYearsOfExperience(request.getYearsOfExperience());
        if (request.getAverageConsultationTime() != null) {
            doctor.setAverageConsultationTime(request.getAverageConsultationTime());
        }
        doctor.setBiography(trimToNull(request.getBiography()));
        doctor.setSpecialty(resolveSpecialty(request.getSpecialtyId()));

        if (user != null) {
            user.setEmail(email);
            user.setPhoneNumber(trimToNull(request.getPhoneNumber()));
            // Admin đặt lại mật khẩu khi có nhập mật khẩu mới
            if (trimToNull(request.getPassword()) != null) {
                user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
                refreshTokenRepository.deleteByUser(user);
            }
        }

        log.info("-> Đã cập nhật thông tin bác sĩ ID {}: {}", id, doctor.getFullName());
        return DoctorResponse.fromEntity(doctorRepository.save(doctor));
    }

    @Override
    @Transactional
    public DoctorResponse updateStatus(Long id, String status) {
        String newStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED");
        }

        Doctor doctor = findDoctor(id);
        User user = doctor.getUser();
        if (user == null) {
            throw new BadRequestException("Bác sĩ '" + doctor.getFullName() + "' chưa có tài khoản đăng nhập");
        }

        user.setStatus(newStatus);
        if ("LOCKED".equals(newStatus)) {
            // Thu hồi phiên đăng nhập để tài khoản bị khóa không thể làm mới token
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        log.info("-> Đã chuyển trạng thái tài khoản bác sĩ ID {} sang {}", id, newStatus);
        return DoctorResponse.fromEntity(doctor);
    }

    @Override
    @Transactional
    public void deleteDoctor(Long id) {
        Doctor doctor = findDoctor(id);

        if (!doctor.getAppointments().isEmpty() || !doctor.getQueueTickets().isEmpty()
                || !doctor.getMedicalRecords().isEmpty() || !doctor.getWorkSchedules().isEmpty()) {
            throw new BadRequestException("Bác sĩ '" + doctor.getFullName() + "' đã có lịch trực, lịch hẹn hoặc bệnh án trong hệ thống, không thể xóa! Bạn có thể khóa tài khoản thay thế.");
        }

        User user = doctor.getUser();
        if (user != null) {
            userRepository.delete(user);
        }
        doctorRepository.delete(doctor);
        log.info("-> Đã xóa bác sĩ ID {}: {}", id, doctor.getFullName());
    }

    private Doctor findDoctor(Long id) {
        return doctorRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", id));
    }

    private Specialty resolveSpecialty(Long specialtyId) {
        if (specialtyId == null) {
            return null;
        }
        return specialtyRepository.findById(specialtyId)
                .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", specialtyId));
    }

    private String defaultPosition(String position) {
        String value = trimToNull(position);
        return value != null ? value : "Bác sĩ chuyên khoa";
    }

    private String normalizeCode(String code) {
        String value = trimToNull(code);
        return value != null ? value.toUpperCase() : null;
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
