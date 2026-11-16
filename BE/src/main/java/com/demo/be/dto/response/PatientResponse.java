package com.demo.be.dto.response;

import com.demo.be.model.Patient;
import com.demo.be.model.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientResponse {

    private Long id;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;
    private String phoneNumber;

    private String bloodGroup;
    private String allergies;
    private String medicalHistorySummary;
    private String emergencyContactName;
    private String emergencyContactPhone;

    // Thông tin tài khoản (null nếu là bệnh nhân vãng lai đăng ký tại quầy)
    private boolean hasAccount;
    private Long userId;
    private String username;
    private String email;
    private String status;
    private LocalDateTime createdAt;

    // Thống kê khám chữa bệnh
    private long totalVisits;
    private LocalDateTime lastVisitAt;

    public static PatientResponse fromEntity(Patient patient, long totalVisits, LocalDateTime lastVisitAt) {
        if (patient == null) return null;
        User user = patient.getUser();
        return PatientResponse.builder()
                .id(patient.getId())
                .fullName(patient.getFullName())
                .gender(patient.getGender())
                .dateOfBirth(patient.getDateOfBirth())
                .address(patient.getAddress())
                .nationalId(patient.getNationalId())
                // Có tài khoản: SĐT chính là SĐT tài khoản; vãng lai: SĐT liên hệ ghi nhận tại quầy
                .phoneNumber(user != null ? user.getPhoneNumber() : patient.getEmergencyContactPhone())
                .bloodGroup(patient.getBloodGroup())
                .allergies(patient.getAllergies())
                .medicalHistorySummary(patient.getMedicalHistorySummary())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .hasAccount(user != null)
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .email(user != null ? user.getEmail() : null)
                .status(user != null ? user.getStatus() : null)
                .createdAt(user != null ? user.getCreatedAt() : null)
                .totalVisits(totalVisits)
                .lastVisitAt(lastVisitAt)
                .build();
    }
}
