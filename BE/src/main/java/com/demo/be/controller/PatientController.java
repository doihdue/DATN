package com.demo.be.controller;

import com.demo.be.dto.request.PatientRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.PatientResponse;
import com.demo.be.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/patients")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class PatientController {

    private final PatientService patientService;

    // 1. Danh sách bệnh nhân (lọc theo từ khóa, giới tính, trạng thái tài khoản: ACTIVE / LOCKED / NO_ACCOUNT)
    @GetMapping
    public ResponseEntity<ApiResponse<List<PatientResponse>>> getPatients(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String status) {
        List<PatientResponse> list = patientService.searchPatients(search, gender, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách bệnh nhân thành công"));
    }

    // 2. Chi tiết hồ sơ bệnh nhân
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PatientResponse>> getPatientById(@PathVariable Long id) {
        PatientResponse res = patientService.getPatientById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin bệnh nhân thành công"));
    }

    // 3. Tạo hồ sơ bệnh nhân (vãng lai, chưa có tài khoản đăng nhập)
    @PostMapping
    public ResponseEntity<ApiResponse<PatientResponse>> createPatient(@Valid @RequestBody PatientRequest request) {
        PatientResponse res = patientService.createPatient(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Tạo hồ sơ bệnh nhân thành công"));
    }

    // 4. Cập nhật hồ sơ hành chính & thông tin y tế
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PatientResponse>> updatePatient(
            @PathVariable Long id,
            @Valid @RequestBody PatientRequest request) {
        PatientResponse res = patientService.updatePatient(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật hồ sơ bệnh nhân thành công"));
    }

    // 5. Khóa / mở khóa tài khoản đăng nhập của bệnh nhân
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<PatientResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        PatientResponse res = patientService.updateAccountStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật trạng thái tài khoản thành công"));
    }

    // 6. Xóa hồ sơ bệnh nhân (chỉ khi chưa phát sinh lịch hẹn, phiếu khám hoặc bệnh án)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePatient(@PathVariable Long id) {
        patientService.deletePatient(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa hồ sơ bệnh nhân khỏi hệ thống"));
    }
}
