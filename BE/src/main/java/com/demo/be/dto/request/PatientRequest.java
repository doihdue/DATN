package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientRequest {

    // Thông tin hành chính
    @NotBlank(message = "Họ và tên không được để trống")
    @Size(max = 150, message = "Họ và tên tối đa 150 ký tự")
    private String fullName;

    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;

    // SĐT liên hệ chính: bệnh nhân có tài khoản -> SĐT tài khoản; vãng lai -> SĐT liên hệ dùng để tra cứu tại quầy
    @Pattern(regexp = "^$|^[0-9+ ]{8,15}$", message = "Số điện thoại không hợp lệ")
    private String phoneNumber;

    // Thông tin y tế
    private String bloodGroup;
    private String allergies;
    private String medicalHistorySummary;

    // Người liên hệ khẩn cấp
    private String emergencyContactName;

    @Pattern(regexp = "^$|^[0-9+ ]{8,15}$", message = "Số điện thoại người liên hệ không hợp lệ")
    private String emergencyContactPhone;
}
