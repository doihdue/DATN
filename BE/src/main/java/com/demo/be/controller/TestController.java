package com.demo.be.controller;

import com.demo.be.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

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
