package com.demo.be.service.impl;

import com.demo.be.dto.request.PatientRequest;
import com.demo.be.dto.response.PatientResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Patient;
import com.demo.be.model.User;
import com.demo.be.repository.*;
import com.demo.be.service.PatientService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private static final String NO_ACCOUNT = "NO_ACCOUNT";
    private static final Set<String> ALLOWED_ACCOUNT_STATUSES = Set.of("ACTIVE", "LOCKED");
    private static final Set<String> ALLOWED_FILTER_STATUSES = Set.of("ACTIVE", "LOCKED", NO_ACCOUNT);

    private final PatientRepository patientRepository;
    private final PersonRepository personRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AppointmentRepository appointmentRepository;
    private final QueueTicketRepository queueTicketRepository;
    private final MedicalRecordRepository medicalRecordRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PatientResponse> searchPatients(String keyword, String gender, String accountStatus) {
        String st = trimToNull(accountStatus);
        if (st != null) {
            st = st.toUpperCase();
            if (!ALLOWED_FILTER_STATUSES.contains(st)) {
                throw new BadRequestException("Trạng thái lọc không hợp lệ. Chỉ chấp nhận ACTIVE, LOCKED hoặc NO_ACCOUNT");
            }
        }

        List<Patient> patients = patientRepository.adminSearch(trimToNull(keyword), trimToNull(gender), st);
        Map<Long, Object[]> visitStats = loadVisitStats(null);

        return patients.stream()
                .map(p -> toResponse(p, visitStats))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getPatientById(Long id) {
        Patient patient = findPatient(id);
        return toResponse(patient, loadVisitStats(id));
    }

    @Override
    @Transactional
    public PatientResponse createPatient(PatientRequest request) {
        String fullName = request.getFullName().trim();
        String phone = trimToNull(request.getPhoneNumber());
        if (phone == null) {
            throw new BadRequestException("Số điện thoại liên hệ không được để trống (dùng để tra cứu khi tiếp đón)");
        }

        // Trùng SĐT + họ tên => cùng một bệnh nhân (giống quy tắc nhận diện tại quầy tiếp đón)
        boolean duplicated = patientRepository.findByPhoneNumber(phone).stream()
                .anyMatch(p -> p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(fullName));
        if (duplicated) {
            throw new BadRequestException("Bệnh nhân '" + fullName + "' với số điện thoại " + phone + " đã có hồ sơ trong hệ thống");
        }

        String nationalId = trimToNull(request.getNationalId());
        ensureNationalIdAvailable(nationalId, null);
        validateDateOfBirth(request.getDateOfBirth());

        // Bệnh nhân vãng lai không có tài khoản: SĐT liên hệ lưu ở emergencyContactPhone (khớp luồng tiếp đón)
        Patient patient = Patient.builder()
                .fullName(fullName)
                .gender(trimToNull(request.getGender()))
                .dateOfBirth(request.getDateOfBirth())
                .address(trimToNull(request.getAddress()))
                .nationalId(nationalId)
                .bloodGroup(trimToNull(request.getBloodGroup()))
                .allergies(trimToNull(request.getAllergies()))
                .medicalHistorySummary(trimToNull(request.getMedicalHistorySummary()))
                .emergencyContactName(trimToNull(request.getEmergencyContactName()))
                .emergencyContactPhone(phone)
                .build();
        patient = patientRepository.save(patient);

        log.info("-> Admin đã tạo hồ sơ bệnh nhân mới: {} (ID: {}, SĐT: {})", patient.getFullName(), patient.getId(), phone);
        return PatientResponse.fromEntity(patient, 0, null);
    }

    @Override
    @Transactional
    public PatientResponse updatePatient(Long id, PatientRequest request) {
        Patient patient = findPatient(id);
        User user = patient.getUser();

        String nationalId = trimToNull(request.getNationalId());
        ensureNationalIdAvailable(nationalId, patient.getId());
        validateDateOfBirth(request.getDateOfBirth());

        String phone = trimToNull(request.getPhoneNumber());

        patient.setFullName(request.getFullName().trim());
        patient.setGender(trimToNull(request.getGender()));
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setAddress(trimToNull(request.getAddress()));
        patient.setNationalId(nationalId);
        patient.setBloodGroup(trimToNull(request.getBloodGroup()));
        patient.setAllergies(trimToNull(request.getAllergies()));
        patient.setMedicalHistorySummary(trimToNull(request.getMedicalHistorySummary()));
        patient.setEmergencyContactName(trimToNull(request.getEmergencyContactName()));

        if (user != null) {
            // Có tài khoản: SĐT chính nằm ở tài khoản, SĐT người liên hệ khẩn cấp tách riêng
            user.setPhoneNumber(phone);
            userRepository.save(user);
            patient.setEmergencyContactPhone(trimToNull(request.getEmergencyContactPhone()));
        } else {
            if (phone == null) {
                throw new BadRequestException("Số điện thoại liên hệ không được để trống (dùng để tra cứu khi tiếp đón)");
            }
            patient.setEmergencyContactPhone(phone);
        }

        patient = patientRepository.save(patient);
        log.info("-> Đã cập nhật hồ sơ bệnh nhân ID {}: {}", id, patient.getFullName());
        return toResponse(patient, loadVisitStats(id));
    }

    @Override
    @Transactional
    public PatientResponse updateAccountStatus(Long id, String status) {
        String newStatus = status != null ? status.trim().toUpperCase() : "";
        if (!ALLOWED_ACCOUNT_STATUSES.contains(newStatus)) {
            throw new BadRequestException("Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED");
        }

        Patient patient = findPatient(id);
        User user = patient.getUser();
        if (user == null) {
            throw new BadRequestException("Bệnh nhân '" + patient.getFullName() + "' chưa có tài khoản đăng nhập để khóa/mở khóa");
        }

        user.setStatus(newStatus);
        if ("LOCKED".equals(newStatus)) {
            refreshTokenRepository.deleteByUser(user);
        }
        userRepository.save(user);

        log.info("-> Đã chuyển trạng thái tài khoản bệnh nhân ID {} sang {}", id, newStatus);
        return toResponse(patient, loadVisitStats(id));
    }

    @Override
    @Transactional
    public void deletePatient(Long id) {
        Patient patient = findPatient(id);

        if (medicalRecordRepository.existsByPatientId(id)) {
            throw new BadRequestException("Bệnh nhân '" + patient.getFullName() +
                    "' đã có hồ sơ bệnh án, không thể xóa để bảo toàn dữ liệu y tế! Bạn có thể khóa tài khoản thay thế.");
        }
        if (queueTicketRepository.existsByPatientId(id)) {
            throw new BadRequestException("Bệnh nhân '" + patient.getFullName() +
                    "' đã từng được cấp phiếu khám, không thể xóa! Bạn có thể khóa tài khoản thay thế.");
        }
        if (appointmentRepository.existsByPatientId(id)) {
            throw new BadRequestException("Bệnh nhân '" + patient.getFullName() +
                    "' đã có lịch hẹn khám trong hệ thống, không thể xóa! Bạn có thể khóa tài khoản thay thế.");
        }

        User user = patient.getUser();
        if (user != null) {
            refreshTokenRepository.deleteByUser(user);
            userRepository.delete(user);
        }
        patientRepository.delete(patient);
        log.info("-> Đã xóa hồ sơ bệnh nhân ID {}: {}", id, patient.getFullName());
    }

    private Patient findPatient(Long id) {
        return patientRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", id));
    }

    private Map<Long, Object[]> loadVisitStats(Long patientId) {
        Map<Long, Object[]> stats = new HashMap<>();
        for (Object[] row : medicalRecordRepository.summarizeVisitsByPatient(patientId)) {
            stats.put((Long) row[0], row);
        }
        return stats;
    }

    private PatientResponse toResponse(Patient patient, Map<Long, Object[]> visitStats) {
        Object[] row = visitStats.get(patient.getId());
        long totalVisits = row != null ? ((Number) row[1]).longValue() : 0L;
        LocalDateTime lastVisitAt = row != null ? (LocalDateTime) row[2] : null;
        return PatientResponse.fromEntity(patient, totalVisits, lastVisitAt);
    }

    private void ensureNationalIdAvailable(String nationalId, Long currentId) {
        if (nationalId == null) return;
        personRepository.findByNationalId(nationalId)
                .filter(other -> !other.getId().equals(currentId))
                .ifPresent(other -> {
                    throw new BadRequestException("Số CCCD/CMND '" + nationalId + "' đã tồn tại trong hệ thống");
                });
    }

    private void validateDateOfBirth(LocalDate dob) {
        if (dob != null && dob.isAfter(LocalDate.now())) {
            throw new BadRequestException("Ngày sinh không được lớn hơn ngày hiện tại");
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
