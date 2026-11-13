package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProfileResponse {

    private Long id;
    private String username;
    private String email;
    private String phoneNumber;
    private String status;
    private List<String> roles;

    // Thông tin cá nhân (Person)
    private Long personId;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;
    private String avatarUrl;

    // Nhân sự y tế (Employee / Doctor / LabTech)
    private String employeeCode;
    private String position;
    private String department;
    private String academicTitle;
    private Integer yearsOfExperience;
    private String biography;
    private Long specialtyId;
    private String specialtyName;

    // Bệnh nhân (Patient)
    private String bloodGroup;
    private String allergies;
    private String medicalHistorySummary;
    private String emergencyContactName;
    private String emergencyContactPhone;
}

