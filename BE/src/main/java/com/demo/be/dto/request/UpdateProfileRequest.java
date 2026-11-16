package com.demo.be.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateProfileRequest {

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String phoneNumber;

    @Email(message = "Email không đúng định dạng")
    private String email;

    private String address;

    private LocalDate dateOfBirth;

    private String gender; // Nam, Nữ, Khác

    private String avatarUrl;

    // Bổ sung cho Bác sĩ (Doctor)
    private String academicTitle;
    private String biography;
    private Integer yearsOfExperience;

    // Bổ sung cho Bệnh nhân (Patient)
    private String bloodGroup;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
}

