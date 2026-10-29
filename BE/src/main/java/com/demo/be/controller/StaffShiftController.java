package com.demo.be.controller;

import com.demo.be.dto.request.BatchStaffShiftRequest;
import com.demo.be.dto.request.StaffShiftRequest;
import com.demo.be.dto.response.BatchStaffShiftResponse;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.LabTechResponse;
import com.demo.be.dto.response.StaffShiftResponse;
import com.demo.be.service.StaffShiftService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

// Lịch trực của kỹ thuật viên tại các phòng cận lâm sàng
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class StaffShiftController {

    private final StaffShiftService staffShiftService;

    @GetMapping("/admin/staff-shifts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<StaffShiftResponse>>> getShifts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(staffShiftService.getShifts(startDate, endDate, roomId),
                "Lấy lịch trực kỹ thuật viên thành công"));
    }

    @GetMapping("/staff-shifts/my")
    @PreAuthorize("hasRole('LAB_TECH')")
    public ResponseEntity<ApiResponse<List<StaffShiftResponse>>> getMyShifts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(ApiResponse.success(staffShiftService.getMyShifts(startDate, endDate),
                "Lấy ca trực của tôi thành công"));
    }

    @PostMapping("/admin/staff-shifts")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StaffShiftResponse>> createShift(@Valid @RequestBody StaffShiftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(staffShiftService.createShift(request), "Xếp ca trực kỹ thuật viên thành công"));
    }

    @PostMapping("/admin/staff-shifts/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BatchStaffShiftResponse>> createBatchShifts(@Valid @RequestBody BatchStaffShiftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(staffShiftService.createBatchShifts(request), "Xếp ca trực nhiều ngày thành công"));
    }

    @PutMapping("/admin/staff-shifts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<StaffShiftResponse>> updateShift(@PathVariable Long id,
                                                                       @Valid @RequestBody StaffShiftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(staffShiftService.updateShift(id, request), "Cập nhật ca trực kỹ thuật viên thành công"));
    }

    @DeleteMapping("/admin/staff-shifts/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteShift(@PathVariable Long id) {
        staffShiftService.deleteShift(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Đã xoá ca trực kỹ thuật viên"));
    }

    // Bác sĩ cần để in nơi thực hiện trên phiếu chỉ định cận lâm sàng
    @GetMapping("/lab-rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'LAB_TECH', 'DOCTOR')")
    public ResponseEntity<ApiResponse<List<ExaminationRoomResponse>>> getLabRooms() {
        return ResponseEntity.ok(ApiResponse.success(staffShiftService.getLabRooms(), "Lấy danh sách phòng cận lâm sàng thành công"));
    }

    @GetMapping("/admin/lab-techs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<LabTechResponse>>> getLabTechs() {
        return ResponseEntity.ok(ApiResponse.success(staffShiftService.getLabTechs(), "Lấy danh sách kỹ thuật viên thành công"));
    }
}
