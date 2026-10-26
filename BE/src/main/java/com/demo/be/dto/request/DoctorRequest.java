package com.demo.be.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorRequest {

    // Thông tin tài khoản đăng nhập (username chỉ dùng khi tạo mới)
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    private String username;

    // Bắt buộc khi tạo mới; khi cập nhật để trống nghĩa là giữ nguyên mật khẩu
    @Size(min = 6, message = "Mật khẩu phải có ít nhất 6 ký tự")
    private String password;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không hợp lệ")
    private String email;

    private String phoneNumber;

    // Thông tin cá nhân
    @NotBlank(message = "Họ và tên không được để trống")
    private String fullName;

    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;

    // Thông tin nhân sự & chuyên môn
    private String employeeCode;
    private String position;
    private LocalDate hireDate;
    private Long specialtyId;
    private String academicTitle;

    @Min(value = 0, message = "Số năm kinh nghiệm không hợp lệ")
    private Integer yearsOfExperience;

    @Min(value = 1, message = "Thời gian khám trung bình phải lớn hơn 0")
    private Integer averageConsultationTime;

    private String biography;
}
