package com.demo.be.controller;

import com.demo.be.dto.response.ApiResponse;
import com.demo.be.email.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final EmailService emailService;

    @GetMapping("/send-test-email")
    public ResponseEntity<ApiResponse<String>> sendTestEmail(@RequestParam String to) {
        Map<String, Object> vars = Map.of(
                "patientName", "Quý Khách Hàng (Test)",
                "appointmentCode", "LH-TEST-EMAIL",
                "bookingNumber", 1,
                "doctorName", "BS.CKII Nguyễn Văn Hùng",
                "specialtyName", "Khoa Nội Tổng Quát",
                "roomNumber", "Phòng P.101",
                "appointmentDate", "14/11/2026",
                "estimatedTime", "08:30",
                "reasonForVisit", "Kiểm tra hệ thống gửi mail tự động"
        );
        emailService.sendHtmlMail(to, "[SmartClinic] Thử nghiệm gửi Email Thông Báo Tự Động", "appointment-confirmation", vars);
        return ResponseEntity.ok(ApiResponse.success("Đã kích hoạt gửi email thử nghiệm tới: " + to));
    }

    @GetMapping("/public")
    public ResponseEntity<ApiResponse<String>> publicAccess() {
        return ResponseEntity.ok(ApiResponse.success("API Công khai - Không cần xác thực"));
    }

    @GetMapping("/patient")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<String>> patientAccess() {
        return ResponseEntity.ok(ApiResponse.success("API Bệnh nhân - Dành riêng cho ROLE_PATIENT"));
    }

    @GetMapping("/doctor")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<String>> doctorAccess() {
        return ResponseEntity.ok(ApiResponse.success("API Bác sĩ - Dành riêng cho ROLE_DOCTOR"));
    }

    @GetMapping("/staff")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<ApiResponse<String>> staffAccess() {
        return ResponseEntity.ok(ApiResponse.success("API Lễ tân / Tiếp đón - Dành riêng cho ROLE_STAFF"));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> adminAccess() {
        return ResponseEntity.ok(ApiResponse.success("API Quản trị viên - Dành riêng cho ROLE_ADMIN"));
    }
}
