package com.demo.be.controller;

import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.LabServiceResponse;
import com.demo.be.model.LabService;
import com.demo.be.service.LabCatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lab-services")
@RequiredArgsConstructor
public class LabCatalogController {

    private final LabCatalogService labCatalogService;

    // 1. Lấy danh sách dịch vụ xét nghiệm đang hoạt động (có tìm kiếm)
    @GetMapping
    public ResponseEntity<ApiResponse<List<LabServiceResponse>>> getLabServices(
            @RequestParam(required = false) String search) {
        List<LabServiceResponse> list = labCatalogService.searchServices(search);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh mục dịch vụ xét nghiệm thành công"));
    }

    // 2. Chi tiết dịch vụ
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LabServiceResponse>> getLabServiceById(@PathVariable Long id) {
        LabServiceResponse res = labCatalogService.getServiceById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy chi tiết dịch vụ xét nghiệm thành công"));
    }

    // 3. Tạo mới dịch vụ xét nghiệm (Admin)
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LabServiceResponse>> createLabService(@RequestBody LabService service) {
        LabServiceResponse res = labCatalogService.createService(service);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Tạo mới dịch vụ xét nghiệm thành công"));
    }

    // 4. Cập nhật dịch vụ xét nghiệm (Admin)
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LabServiceResponse>> updateLabService(
            @PathVariable Long id,
            @RequestBody LabService service) {
        LabServiceResponse res = labCatalogService.updateService(id, service);
        return ResponseEntity.ok(ApiResponse.success(res, "Cập nhật dịch vụ xét nghiệm thành công"));
    }

    // 5. Xóa dịch vụ xét nghiệm (Admin)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteLabService(@PathVariable Long id) {
        labCatalogService.deleteService(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xóa dịch vụ xét nghiệm"));
    }
}
