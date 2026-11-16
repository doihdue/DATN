package com.demo.be.security;

import com.demo.be.exception.AppException;
import com.demo.be.model.Doctor;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.Patient;
import com.demo.be.model.User;
import com.demo.be.repository.UserRepository;
import com.demo.be.repository.WorkScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Kiểm tra quyền theo dữ liệu (không chỉ theo vai trò):
 *  - Bệnh nhân chỉ xem được hồ sơ, phiếu khám, kết quả xét nghiệm của chính mình.
 *  - Bác sĩ chỉ thao tác trên vé / hồ sơ thuộc phòng mình có ca trực hôm nay.
 * Lễ tân và quản trị viên không bị giới hạn theo phòng.
 */
@Component
@RequiredArgsConstructor
public class AccessGuard {

    private final UserRepository userRepository;
    private final WorkScheduleRepository workScheduleRepository;

    // Bệnh nhân thuần (không kiêm vai trò nhân viên y tế nào)
    public boolean isPatientOnly() {
        Set<String> roles = currentRoles();
        return roles.contains("ROLE_PATIENT")
                && !roles.contains("ROLE_ADMIN") && !roles.contains("ROLE_STAFF")
                && !roles.contains("ROLE_DOCTOR") && !roles.contains("ROLE_LAB_TECH");
    }

    // Bác sĩ không kiêm lễ tân / quản trị: bị giới hạn theo phòng trực
    public boolean isDoctorOnly() {
        Set<String> roles = currentRoles();
        return roles.contains("ROLE_DOCTOR") && !roles.contains("ROLE_ADMIN") && !roles.contains("ROLE_STAFF");
    }

    public Optional<Doctor> currentDoctor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Optional.empty();
        }
        return userRepository.findByUsername(auth.getName())
                .map(User::getPerson)
                .filter(Doctor.class::isInstance)
                .map(Doctor.class::cast);
    }

    public void assertCanViewPatientData(Patient patient) {
        if (!isPatientOnly()) {
            return;
        }
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        boolean owner = patient != null && patient.getUser() != null && username.equals(patient.getUser().getUsername());
        if (!owner) {
            throw new AppException("Bạn chỉ được xem hồ sơ khám bệnh của chính mình", HttpStatus.FORBIDDEN);
        }
    }

    public void assertDoctorWorksInRoom(ExaminationRoom room) {
        if (!isDoctorOnly()) {
            return;
        }
        Doctor doctor = currentDoctor()
                .orElseThrow(() -> new AppException("Tài khoản hiện tại không gắn với hồ sơ bác sĩ", HttpStatus.FORBIDDEN));
        boolean onDuty = room != null && workScheduleRepository.findByExaminationRoomIdAndWorkDate(room.getId(), LocalDate.now()).stream()
                .filter(ws -> !"CANCELLED".equals(ws.getStatus()))
                .anyMatch(ws -> ws.getDoctor() != null && doctor.getId().equals(ws.getDoctor().getId()));
        if (!onDuty) {
            throw new AppException("Bạn không có ca trực hôm nay tại phòng "
                    + (room != null ? room.getRoomNumber() : "này") + ", không thể thao tác trên bệnh nhân của phòng khác",
                    HttpStatus.FORBIDDEN);
        }
    }

    public void assertIsCurrentDoctor(Long doctorId) {
        if (!isDoctorOnly()) {
            return;
        }
        Long currentId = currentDoctor().map(Doctor::getId).orElse(null);
        if (currentId == null || !currentId.equals(doctorId)) {
            throw new AppException("Bạn chỉ được xem danh sách hồ sơ do chính mình khám", HttpStatus.FORBIDDEN);
        }
    }

    private Set<String> currentRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Set.of();
        }
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).collect(Collectors.toSet());
    }
}
