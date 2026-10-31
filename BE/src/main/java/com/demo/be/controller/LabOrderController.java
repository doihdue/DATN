package com.demo.be.controller;

import com.demo.be.dto.request.SendLabOrdersRequest;
import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.service.LabOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/lab-orders")
@RequiredArgsConstructor
public class LabOrderController {

    private final LabOrderService labOrderService;

    // 1. Pha 1: Bác sĩ gửi chỉ định cận lâm sàng & tạm dừng ca khám
    @PostMapping("/send")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> sendLabOrders(
            @Valid @RequestBody SendLabOrdersRequest request) {
        MedicalRecordResponse res = labOrderService.sendLabOrders(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Đã gửi chỉ định cận lâm sàng thành công! Bệnh nhân chuyển sang chờ kết quả."));
    }

    // 2. Lấy danh sách chỉ định theo mã bệnh án
    @GetMapping("/record/{recordId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getOrdersByRecord(@PathVariable Long recordId) {
        List<LabOrderResponse> list = labOrderService.getOrdersByMedicalRecordId(recordId);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách chỉ định xét nghiệm thành công"));
    }

    // 3. Lấy danh sách chỉ định theo mã phiếu khám hàng đợi
    @GetMapping("/ticket/{ticketId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getOrdersByTicket(@PathVariable Long ticketId) {
        List<LabOrderResponse> list = labOrderService.getOrdersByTicketId(ticketId);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách chỉ định xét nghiệm thành công"));
    }

    // 4. Danh sách làm việc của phòng Lab: chỉ định trong ngày + chỉ định còn dang dở
    @GetMapping
    @PreAuthorize("hasAnyRole('LAB_TECH', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<LabOrderResponse>>> getWorklist(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<LabOrderResponse> list = labOrderService.getWorklist(date);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách chỉ định xét nghiệm thành công"));
    }

    // 5. KTV tiếp nhận mẫu bệnh phẩm
    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('LAB_TECH')")
    public ResponseEntity<ApiResponse<LabOrderResponse>> startProcessing(@PathVariable Long id) {
        LabOrderResponse res = labOrderService.startProcessing(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Đã tiếp nhận mẫu xét nghiệm"));
    }

    // 6. KTV nhập kết quả xét nghiệm & Ký duyệt
    @PutMapping("/{id}/result")
    @PreAuthorize("hasRole('LAB_TECH')")
    public ResponseEntity<ApiResponse<LabOrderResponse>> updateOrderResult(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLabOrderResultRequest request) {
        LabOrderResponse res = labOrderService.updateOrderResult(id, request);
        return ResponseEntity.ok(ApiResponse.success(res, "Đã cập nhật kết quả xét nghiệm thành công"));
    }

    // 7. Hủy chỉ định xét nghiệm (khi chưa có kết quả)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(@PathVariable Long id) {
        labOrderService.cancelOrder(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã hủy chỉ định xét nghiệm"));
    }
}
