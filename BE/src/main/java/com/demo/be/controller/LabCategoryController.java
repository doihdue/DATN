package com.demo.be.controller;

import com.demo.be.dto.request.LabCategoryRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.LabCategoryResponse;
import com.demo.be.service.LabCatalogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lab-categories")
@RequiredArgsConstructor
public class LabCategoryController {

    private final LabCatalogService labCatalogService;

    // 1. Danh sách loại xét nghiệm (kèm khoa thực hiện và số dịch vụ)
    @GetMapping
    public ResponseEntity<ApiResponse<List<LabCategoryResponse>>> getCategories() {
        return ResponseEntity.ok(ApiResponse.success(labCatalogService.getCategories(),
                "Lấy danh sách loại xét nghiệm thành công"));
    }

    // 2. Thêm loại xét nghiệm (Admin)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LabCategoryResponse>> createCategory(@Valid @RequestBody LabCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(labCatalogService.createCategory(request), "Thêm loại xét nghiệm thành công"));
    }

    // 3. Sửa loại xét nghiệm (Admin)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LabCategoryResponse>> updateCategory(
            @PathVariable Long id, @Valid @RequestBody LabCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(labCatalogService.updateCategory(id, request),
                "Cập nhật loại xét nghiệm thành công"));
    }
}
