package com.demo.be.service.impl;

import com.demo.be.dto.request.LabTechnicianRequest;
import com.demo.be.dto.response.LabTechnicianResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.LabTechnician;
import com.demo.be.model.Role;
import com.demo.be.model.User;
import com.demo.be.repository.*;
import com.demo.be.service.LabTechnicianService;
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
public class LabTechnicianServiceImpl implements LabTechnicianService {

    private static final String ROLE_LAB_TECH = "ROLE_LAB_TECH";
    private static final Set<String> ALLOWED_DEPARTMENTS = Set.of("XET_NGHIEM", "CHAN_DOAN_HINH_ANH");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "LOCKED");

    private final LabTechnicianRepository labTechnicianRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final StaffShiftRepository staffShiftRepository;
    private final LabOrderRepository labOrderRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<LabTechnicianResponse> searchTechnicians(String keyword, String department, String status) {
        String dept = trimToNull(department);
        String st = trimToNull(status);
        return labTechnicianRepository.searchTechnicians(
                trimToNull(keyword),
                dept != null ? dept.toUpperCase() : null,
                st != null ? st.toUpperCase() : null
        ).stream()
                .map(LabTechnicianResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LabTechnicianResponse getTechnicianById(Long id) {
        return LabTechnicianResponse.fromEntity(findTechnician(id));
    }

    @Override
    @Transactional
    public LabTechnicianResponse createTechnician(LabTechnicianRequest request) {
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

        String department = normalizeDepartment(request.getDepartment());

        String employeeCode = normalizeCode(request.getEmployeeCode());
        if (employeeCode != null && employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new BadRequestException("Mã nhân viên '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null && personRepository.findByNationalId(nationalId).isPresent()) {
            throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
        }

        LabTechnician ktv = LabTechnician.builder()
                .fullName(request.getFullName().trim())
                .gender(trimToNull(request.getGender()))
                .dateOfBirth(request.getDateOfBirth())
                .address(trimToNull(request.getAddress()))
                .nationalId(nationalId)
                .avatarUrl(trimToNull(request.getAvatarUrl()))
                .employeeCode(employeeCode)
                .department(department)
                .position(defaultPosition(request.getPosition(), department))
                .hireDate(request.getHireDate() != null ? request.getHireDate() : LocalDate.now())
                .build();
        ktv = labTechnicianRepository.save(ktv);

        // Tự sinh mã KTV nếu Admin không nhập
        if (ktv.getEmployeeCode() == null) {
            ktv.setEmployeeCode(String.format("KTV%03d", ktv.getId()));
            ktv = labTechnicianRepository.save(ktv);
        }

        Role labTechRole = roleRepository.findByName(ROLE_LAB_TECH)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name(ROLE_LAB_TECH)
                        .description("Kỹ thuật viên xét nghiệm & cận lâm sàng")
                        .build()));

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .phoneNumber(trimToNull(request.getPhoneNumber()))
                .status("ACTIVE")
                .person(ktv)
                .build();
        user.addRole(labTechRole);
        user = userRepository.save(user);
        ktv.setUser(user);

        log.info("-> Admin đã tạo Kỹ thuật viên mới: {} (Mã: {}, Khoa: {}, tài khoản: {})",
                ktv.getFullName(), ktv.getEmployeeCode(), ktv.getDepartment(), username);
        return LabTechnicianResponse.fromEntity(ktv);
    }

    @Override
    @Transactional
    public LabTechnicianResponse updateTechnician(Long id, LabTechnicianRequest request) {
        LabTechnician ktv = findTechnician(id);
        User user = ktv.getUser();

        String email = request.getEmail().trim();
        userRepository.findByEmail(email)
                .filter(other -> !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new BadRequestException("Email '" + email + "' đã được đăng ký bởi tài khoản khác");
                });

        String employeeCode = normalizeCode(request.getEmployeeCode());
        if (employeeCode != null && !employeeCode.equalsIgnoreCase(ktv.getEmployeeCode())
                && employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new BadRequestException("Mã nhân viên '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null) {
            personRepository.findByNationalId(nationalId)
                    .filter(other -> !other.getId().equals(ktv.getId()))
                    .ifPresent(other -> {
                        throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
                    });
        }

        String department = normalizeDepartment(request.getDepartment());

        ktv.setFullName(request.getFullName().trim());
        ktv.setGender(trimToNull(request.getGender()));
        ktv.setDateOfBirth(request.getDateOfBirth());
        ktv.setAddress(trimToNull(request.getAddress()));
        ktv.setNationalId(nationalId);
        ktv.setAvatarUrl(trimToNull(request.getAvatarUrl()));
        if (employeeCode != null) {
            ktv.setEmployeeCode(employeeCode);
        }
        ktv.setDepartment(department);
        ktv.setPosition(defaultPosition(request.getPosition(), department));
        if (request.getHireDate() != null) {
            ktv.setHireDate(request.getHireDate());
        }

        user.setEmail(email);
        user.setPhoneNumber(trimToNull(request.getPhoneNumber()));
        // Admin đặt lại mật khẩu khi có nhập mật khẩu mới
        if (trimToNull(request.getPassword()) != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        log.info("-> Đã cập nhật thông tin Kỹ thuật viên ID {}: {}", id, ktv.getFullName());
        return LabTechnicianResponse.fromEntity(labTechnicianRepository.save(ktv));
    }

    @Override
    @Transactional
    public LabTechnicianResponse updateStatus(Long id, String status) {
        String newStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED");
        }

        LabTechnician ktv = findTechnician(id);
        User user = ktv.getUser();
        user.setStatus(newStatus);
        if ("LOCKED".equals(newStatus)) {
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        log.info("-> Đã chuyển trạng thái tài khoản KTV ID {} sang {}", id, newStatus);
        return LabTechnicianResponse.fromEntity(ktv);
    }

    @Override
    @Transactional
    public void deleteTechnician(Long id) {
        LabTechnician ktv = findTechnician(id);

        if (staffShiftRepository.existsByTechnicianId(id)) {
            throw new BadRequestException("Kỹ thuật viên '" + ktv.getFullName() +
                    "' đã được xếp ca trực trong hệ thống, không thể xóa! Bạn có thể khóa tài khoản thay thế.");
        }

        if (labOrderRepository.existsByPerformerId(id)) {
            throw new BadRequestException("Kỹ thuật viên '" + ktv.getFullName() +
                    "' đã từng tiếp nhận hoặc ký duyệt kết quả xét nghiệm, không thể xóa để bảo toàn dữ liệu bệnh án! Bạn có thể khóa tài khoản thay thế.");
        }

        User user = ktv.getUser();
        if (user != null) {
            refreshTokenRepository.deleteByUser(user);
            userRepository.delete(user);
        }
        labTechnicianRepository.delete(ktv);
        log.info("-> Đã xóa Kỹ thuật viên ID {}: {}", id, ktv.getFullName());
    }

    private LabTechnician findTechnician(Long id) {
        return labTechnicianRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kỹ thuật viên", "id", id));
    }

    private String normalizeDepartment(String department) {
        String value = trimToNull(department);
        if (value == null) {
            throw new BadRequestException("Vui lòng chọn Khoa/Bộ phận (Xét nghiệm hoặc Chẩn đoán hình ảnh)");
        }
        String upper = value.toUpperCase();
        if (!ALLOWED_DEPARTMENTS.contains(upper)) {
            throw new BadRequestException("Khoa/Bộ phận không hợp lệ. Chỉ chấp nhận 'XET_NGHIEM' hoặc 'CHAN_DOAN_HINH_ANH'");
        }
        return upper;
    }

    private String defaultPosition(String position, String department) {
        String value = trimToNull(position);
        if (value != null) return value;
        if ("CHAN_DOAN_HINH_ANH".equalsIgnoreCase(department)) {
            return "Kỹ thuật viên Chẩn đoán hình ảnh";
        }
        return "Kỹ thuật viên Xét nghiệm";
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

