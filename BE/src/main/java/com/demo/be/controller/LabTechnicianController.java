package com.demo.be.controller;

import com.demo.be.dto.request.LabTechnicianRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.LabTechnicianResponse;
import com.demo.be.service.LabTechnicianService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/lab-technicians")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class LabTechnicianController {

    private final LabTechnicianService labTechnicianService;

    // 1. Danh sách kỹ thuật viên (lọc theo từ khóa, khoa/bộ phận, trạng thái tài khoản)
    @GetMapping
    public ResponseEntity<ApiResponse<List<LabTechnicianResponse>>> getTechnicians(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String status) {
        List<LabTechnicianResponse> list = labTechnicianService.searchTechnicians(search, department, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách kỹ thuật viên thành công"));
    }

    // 2. Chi tiết kỹ thuật viên
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabTechnicianResponse>> getTechnicianById(@PathVariable Long id) {
        LabTechnicianResponse res = labTechnicianService.getTechnicianById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin kỹ thuật viên thành công"));
    }

    // 3. Thêm mới kỹ thuật viên kèm tài khoản đăng nhập (ROLE_LAB_TECH)
    @PostMapping
    public ResponseEntity<ApiResponse<LabTechnicianResponse>> createTechnician(
            @Valid @RequestBody LabTechnicianRequest request) {
        LabTechnicianResponse res = labTechnicianService.createTechnician(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Thêm kỹ thuật viên mới thành công"));
    }

    // 4. Cập nhật hồ sơ kỹ thuật viên
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<LabTechnicianResponse>> updateTechnician(
            @PathVariable Long id,
            @Valid @RequestBody LabTechnicianRequest request) {
        LabTechnicianResponse res = labTechnicianService.updateTechnician(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật thông tin kỹ thuật viên thành công"));
    }

    // 5. Khóa / mở khóa tài khoản kỹ thuật viên
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<LabTechnicianResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        LabTechnicianResponse res = labTechnicianService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật trạng thái tài khoản thành công"));
    }

    // 6. Xóa kỹ thuật viên cùng tài khoản đăng nhập (nếu chưa có ca trực hoặc kết quả XN)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTechnician(@PathVariable Long id) {
        labTechnicianService.deleteTechnician(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa kỹ thuật viên khỏi hệ thống"));
    }
}

