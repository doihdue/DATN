package com.demo.be.controller;

import com.demo.be.dto.request.StaffRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.StaffResponse;
import com.demo.be.service.StaffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StaffController {

    private final StaffService staffService;

    // 1. Danh sách lễ tân (lọc theo từ khóa, trạng thái tài khoản)
    @GetMapping
    public ResponseEntity<ApiResponse<List<StaffResponse>>> getStaff(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        List<StaffResponse> list = staffService.searchStaff(search, status);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách lễ tân thành công"));
    }

    // 2. Chi tiết lễ tân
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StaffResponse>> getStaffById(@PathVariable Long id) {
        StaffResponse res = staffService.getStaffById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin lễ tân thành công"));
    }

    // 3. Thêm lễ tân mới kèm tài khoản đăng nhập
    @PostMapping
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(@Valid @RequestBody StaffRequest request) {
        StaffResponse res = staffService.createStaff(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Thêm lễ tân mới thành công"));
    }

    // 4. Cập nhật hồ sơ lễ tân
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
            @PathVariable Long id,
            @Valid @RequestBody StaffRequest request) {
        StaffResponse res = staffService.updateStaff(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật thông tin lễ tân thành công"));
    }

    // 5. Khóa / mở khóa tài khoản lễ tân
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        StaffResponse res = staffService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật trạng thái tài khoản thành công"));
    }

    // 6. Xóa lễ tân cùng tài khoản đăng nhập
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa lễ tân khỏi hệ thống"));
    }
}
