package com.demo.be.dto.response;

import com.demo.be.model.Doctor;
import com.demo.be.model.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorResponse {

    private Long id;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;
    private String avatarUrl;

    private String employeeCode;
    private String position;
    private LocalDate hireDate;
    private String academicTitle;
    private Integer yearsOfExperience;
    private Integer averageConsultationTime;
    private String biography;
    private Long specialtyId;
    private String specialtyName;

    // Thông tin tài khoản
    private Long userId;
    private String username;
    private String email;
    private String phoneNumber;
    private String status;
    private LocalDateTime createdAt;

    public static DoctorResponse fromEntity(Doctor doctor) {
        if (doctor == null) return null;
        User user = doctor.getUser();
        return DoctorResponse.builder()
                .id(doctor.getId())
                .fullName(doctor.getFullName())
                .gender(doctor.getGender())
                .dateOfBirth(doctor.getDateOfBirth())
                .address(doctor.getAddress())
                .nationalId(doctor.getNationalId())
                .avatarUrl(doctor.getAvatarUrl())
                .employeeCode(doctor.getEmployeeCode())
                .position(doctor.getPosition())
                .hireDate(doctor.getHireDate())
                .academicTitle(doctor.getAcademicTitle())
                .yearsOfExperience(doctor.getYearsOfExperience())
                .averageConsultationTime(doctor.getAverageConsultationTime())
                .biography(doctor.getBiography())
                .specialtyId(doctor.getSpecialty() != null ? doctor.getSpecialty().getId() : null)
                .specialtyName(doctor.getSpecialty() != null ? doctor.getSpecialty().getName() : null)
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .status(user != null ? user.getStatus() : null)
                .createdAt(user != null ? user.getCreatedAt() : null)
                .build();
    }
}
