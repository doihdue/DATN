package com.demo.be.controller;

import com.demo.be.dto.request.MedicineCategoryRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.MedicineCategoryResponse;
import com.demo.be.service.MedicineCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medicine-categories")
@RequiredArgsConstructor
public class MedicineCategoryController {

    private final MedicineCategoryService categoryService;

    // 1. Lấy danh sách nhóm thuốc (Hỗ trợ lọc activeOnly nếu cần)
    @GetMapping
    public ResponseEntity<ApiResponse<List<MedicineCategoryResponse>>> getCategories(
            @RequestParam(required = false, defaultValue = "false") boolean activeOnly) {
        List<MedicineCategoryResponse> list = activeOnly 
                ? categoryService.getActiveCategories() 
                : categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh mục nhóm thuốc thành công"));
    }

    // 2. Chi tiết nhóm thuốc
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MedicineCategoryResponse>> getCategoryById(@PathVariable Long id) {
        MedicineCategoryResponse res = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy thông tin nhóm thuốc thành công"));
    }

    // 3. Thêm mới nhóm thuốc (Dành cho Admin)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineCategoryResponse>> createCategory(
            @Valid @RequestBody MedicineCategoryRequest request) {
        MedicineCategoryResponse res = categoryService.createCategory(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Thêm mới nhóm thuốc thành công"));
    }

    // 4. Cập nhật nhóm thuốc (Dành cho Admin)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<MedicineCategoryResponse>> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody MedicineCategoryRequest request) {
        MedicineCategoryResponse res = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật nhóm thuốc thành công"));
    }

    // 5. Xóa nhóm thuốc (Dành cho Admin)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa nhóm thuốc thành công"));
    }
}
