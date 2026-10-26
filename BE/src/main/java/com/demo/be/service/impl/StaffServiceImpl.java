package com.demo.be.service.impl;

import com.demo.be.dto.request.StaffRequest;
import com.demo.be.dto.response.StaffResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Employee;
import com.demo.be.model.Role;
import com.demo.be.model.User;
import com.demo.be.repository.*;
import com.demo.be.service.StaffService;
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
public class StaffServiceImpl implements StaffService {

    private static final String ROLE_STAFF = "ROLE_STAFF";
    private static final String DEFAULT_POSITION = "Nhân viên Tiếp đón & Lễ tân";
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "LOCKED");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<StaffResponse> searchStaff(String keyword, String status) {
        String st = trimToNull(status);
        return employeeRepository.searchStaff(trimToNull(keyword), st != null ? st.toUpperCase() : null).stream()
                .map(StaffResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public StaffResponse getStaffById(Long id) {
        return StaffResponse.fromEntity(findStaff(id));
    }

    @Override
    @Transactional
    public StaffResponse createStaff(StaffRequest request) {
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
            throw new BadRequestException("Mã nhân viên '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null && personRepository.findByNationalId(nationalId).isPresent()) {
            throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
        }

        Employee employee = Employee.builder()
                .fullName(request.getFullName().trim())
                .gender(trimToNull(request.getGender()))
                .dateOfBirth(request.getDateOfBirth())
                .address(trimToNull(request.getAddress()))
                .nationalId(nationalId)
                .employeeCode(employeeCode)
                .position(defaultPosition(request.getPosition()))
                .hireDate(request.getHireDate() != null ? request.getHireDate() : LocalDate.now())
                .build();
        employee = employeeRepository.save(employee);

        // Tự sinh mã nhân viên nếu Admin không nhập
        if (employee.getEmployeeCode() == null) {
            employee.setEmployeeCode(String.format("STF%03d", employee.getId()));
        }

        Role staffRole = roleRepository.findByName(ROLE_STAFF)
                .orElseGet(() -> roleRepository.save(Role.builder().name(ROLE_STAFF).description("Nhân viên tiếp đón và điều phối hàng đợi").build()));

        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .email(email)
                .phoneNumber(trimToNull(request.getPhoneNumber()))
                .status("ACTIVE")
                .person(employee)
                .build();
        user.addRole(staffRole);
        user = userRepository.save(user);
        employee.setUser(user);

        log.info("-> Admin đã tạo lễ tân mới: {} (Mã: {}, tài khoản: {})", employee.getFullName(), employee.getEmployeeCode(), username);
        return StaffResponse.fromEntity(employee);
    }

    @Override
    @Transactional
    public StaffResponse updateStaff(Long id, StaffRequest request) {
        Employee employee = findStaff(id);
        User user = employee.getUser();

        String email = request.getEmail().trim();
        userRepository.findByEmail(email)
                .filter(other -> !other.getId().equals(user.getId()))
                .ifPresent(other -> {
                    throw new BadRequestException("Email '" + email + "' đã được đăng ký bởi tài khoản khác");
                });

        String employeeCode = normalizeCode(request.getEmployeeCode());
        if (employeeCode != null && !employeeCode.equalsIgnoreCase(employee.getEmployeeCode())
                && employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new BadRequestException("Mã nhân viên '" + employeeCode + "' đã được sử dụng");
        }

        String nationalId = trimToNull(request.getNationalId());
        if (nationalId != null) {
            personRepository.findByNationalId(nationalId)
                    .filter(other -> !other.getId().equals(employee.getId()))
                    .ifPresent(other -> {
                        throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
                    });
        }

        employee.setFullName(request.getFullName().trim());
        employee.setGender(trimToNull(request.getGender()));
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setAddress(trimToNull(request.getAddress()));
        employee.setNationalId(nationalId);
        if (employeeCode != null) {
            employee.setEmployeeCode(employeeCode);
        }
        employee.setPosition(defaultPosition(request.getPosition()));
        if (request.getHireDate() != null) {
            employee.setHireDate(request.getHireDate());
        }

        user.setEmail(email);
        user.setPhoneNumber(trimToNull(request.getPhoneNumber()));
        // Admin đặt lại mật khẩu khi có nhập mật khẩu mới
        if (trimToNull(request.getPassword()) != null) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            refreshTokenRepository.deleteByUser(user);
        }

        log.info("-> Đã cập nhật thông tin lễ tân ID {}: {}", id, employee.getFullName());
        return StaffResponse.fromEntity(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public StaffResponse updateStatus(Long id, String status) {
        String newStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED");
        }

        Employee employee = findStaff(id);
        User user = employee.getUser();
        user.setStatus(newStatus);
        if ("LOCKED".equals(newStatus)) {
            // Thu hồi phiên đăng nhập để tài khoản bị khóa không thể làm mới token
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        log.info("-> Đã chuyển trạng thái tài khoản lễ tân ID {} sang {}", id, newStatus);
        return StaffResponse.fromEntity(employee);
    }

    @Override
    @Transactional
    public void deleteStaff(Long id) {
        Employee employee = findStaff(id);
        userRepository.delete(employee.getUser());
        employeeRepository.delete(employee);
        log.info("-> Đã xóa lễ tân ID {}: {}", id, employee.getFullName());
    }

    private Employee findStaff(Long id) {
        return employeeRepository.findStaffById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lễ tân", "id", id));
    }

    private String defaultPosition(String position) {
        String value = trimToNull(position);
        return value != null ? value : DEFAULT_POSITION;
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
