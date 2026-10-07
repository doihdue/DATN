package com.demo.be.controller;

import com.demo.be.dto.request.MedicineRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.MedicineResponse;
import com.demo.be.service.MedicineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicines")
@RequiredArgsConstructor
public class MedicineController {

    private final MedicineService medicineService;

    // 1. Tìm kiếm & lấy danh sách thuốc (Dành cho Bác sĩ kê đơn, tra cứu & Admin quản lý)
    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicineResponse>>> getMedicines(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean activeOnly) {
        List<MedicineResponse> list = medicineService.searchMedicinesFiltered(search, categoryId, activeOnly);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh mục thuốc thành công"));
    }

    // 1b. Lấy danh sách thuốc có phân trang
    @GetMapping("/paged")
    public ResponseEntity<ApiResponse<Page<MedicineResponse>>> getMedicinesPaged(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Boolean activeOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<MedicineResponse> pagedResult = medicineService.searchMedicinesPaged(search, categoryId, activeOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success(pagedResult, "Lấy danh sách thuốc phân trang thành công"));
    }

    // 2. Chi tiết thuốc theo ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineResponse>> getMedicineById(@PathVariable Long id) {
        MedicineResponse res = medicineService.getMedicineById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin thuốc thành công"));
    }

    // 3. Thêm mới thuốc vào kho danh mục
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineResponse>> createMedicine(@Valid @RequestBody MedicineRequest request) {
        MedicineResponse res = medicineService.createMedicine(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Thêm mới thuốc thành công"));
    }

    // 4. Cập nhật thông tin thuốc
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineResponse>> updateMedicine(
            @PathVariable Long id,
            @Valid @RequestBody MedicineRequest request) {
        MedicineResponse res = medicineService.updateMedicine(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật thuốc thành công"));
    }

    // 5. Xóa thuốc khỏi danh mục
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(@PathVariable Long id) {
        medicineService.deleteMedicine(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa thuốc khỏi danh mục"));
    }
}
