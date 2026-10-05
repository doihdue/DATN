package com.demo.be.controller;

import com.demo.be.dto.request.SpecialtyRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.SpecialtyDetailResponse;
import com.demo.be.dto.response.SpecialtyResponse;
import com.demo.be.service.SpecialtyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SpecialtyController {

    private final SpecialtyService specialtyService;

    @GetMapping("/specialties")
    public ResponseEntity<ApiResponse<List<SpecialtyResponse>>> getAllSpecialties() {
        List<SpecialtyResponse> result = specialtyService.getAllSpecialties();
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy danh sách chuyên khoa thành công"));
    }

    @GetMapping("/specialties/{id}")
    public ResponseEntity<ApiResponse<SpecialtyDetailResponse>> getSpecialtyById(@PathVariable Long id) {
        SpecialtyDetailResponse result = specialtyService.getSpecialtyById(id);
        return ResponseEntity.ok(ApiResponse.success(result, "Lấy thông tin chi tiết chuyên khoa thành công"));
    }

    @PostMapping("/admin/specialties")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SpecialtyResponse>> createSpecialty(@Valid @RequestBody SpecialtyRequest request) {
        SpecialtyResponse created = specialtyService.createSpecialty(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Thêm chuyên khoa mới thành công"));
    }

    @PutMapping("/admin/specialties/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SpecialtyResponse>> updateSpecialty(
            @PathVariable Long id,
            @Valid @RequestBody SpecialtyRequest request
    ) {
        SpecialtyResponse updated = specialtyService.updateSpecialty(id, request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Cập nhật chuyên khoa thành công"));
    }

    @DeleteMapping("/admin/specialties/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSpecialty(@PathVariable Long id) {
        specialtyService.deleteSpecialty(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa chuyên khoa thành công"));
    }
}
