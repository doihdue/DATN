package com.demo.be.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateUserRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống")
    @Size(min = 6)
    private String password;

    @NotBlank(message = "Email không được để trống")
    @Email
    private String email;

    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String phoneNumber;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;

    // Vai trò được gán (ROLE_DOCTOR, ROLE_STAFF, ROLE_ADMIN)
    private List<String> roles;

    // Dành cho Bác sĩ
    private Long specialtyId;
    private String academicTitle;
    private Integer yearsOfExperience;
    private String biography;

    // Dành cho Nhân viên / Bác sĩ (Employee)
    private String employeeCode;
    private String position;
}
