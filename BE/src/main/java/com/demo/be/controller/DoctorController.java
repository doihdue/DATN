package com.demo.be.controller;

import com.demo.be.dto.request.DoctorRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.DoctorResponse;
import com.demo.be.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/doctors")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class DoctorController {

    private final DoctorService doctorService;

    // 1. Danh sách bác sĩ (lọc theo từ khóa, chuyên khoa, trạng thái tài khoản)
    @GetMapping
    public ResponseEntity<ApiResponse<List<DoctorResponse>>> getDoctors(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long specialtyId,
            @RequestParam(required = false) String status) {
        List<DoctorResponse> list = doctorService.searchDoctors(search, specialtyId, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách bác sĩ thành công"));
    }

    // 2. Chi tiết bác sĩ
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DoctorResponse>> getDoctorById(@PathVariable Long id) {
        DoctorResponse res = doctorService.getDoctorById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin bác sĩ thành công"));
    }

    // 3. Thêm bác sĩ mới kèm tài khoản đăng nhập
    @PostMapping
    public ResponseEntity<ApiResponse<DoctorResponse>> createDoctor(@Valid @RequestBody DoctorRequest request) {
        DoctorResponse res = doctorService.createDoctor(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Thêm bác sĩ mới thành công"));
    }

    // 4. Cập nhật hồ sơ bác sĩ
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateDoctor(
            @PathVariable Long id,
            @Valid @RequestBody DoctorRequest request) {
        DoctorResponse res = doctorService.updateDoctor(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật thông tin bác sĩ thành công"));
    }

    // 5. Khóa / mở khóa tài khoản bác sĩ
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<DoctorResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        DoctorResponse res = doctorService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật trạng thái tài khoản thành công"));
    }

    // 6. Xóa bác sĩ (chỉ khi chưa phát sinh dữ liệu khám chữa bệnh)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDoctor(@PathVariable Long id) {
        doctorService.deleteDoctor(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa bác sĩ khỏi hệ thống"));
    }
}
