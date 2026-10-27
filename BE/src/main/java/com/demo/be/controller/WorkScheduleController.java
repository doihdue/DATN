package com.demo.be.controller;

import com.demo.be.dto.request.BatchWorkScheduleRequest;
import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.BatchWorkScheduleResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.service.WorkScheduleService;
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
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkScheduleController {

    private final WorkScheduleService workScheduleService;

    @GetMapping("/work-schedules")
    public ResponseEntity<ApiResponse<List<WorkScheduleResponse>>> getSchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long specialtyId,
            @RequestParam(required = false) Long roomId
    ) {
        List<WorkScheduleResponse> schedules = workScheduleService.getSchedules(startDate, endDate, doctorId, specialtyId, roomId);
        return ResponseEntity.ok(ApiResponse.success(schedules, "Lấy danh sách ca làm việc thành công"));
    }


    @GetMapping("/work-schedules/my")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<WorkScheduleResponse>>> getMySchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        List<WorkScheduleResponse> schedules = workScheduleService.getMySchedules(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(schedules, "Lấy lịch trực của bác sĩ thành công"));
    }

    @GetMapping("/examination-rooms")
    public ResponseEntity<ApiResponse<List<ExaminationRoomResponse>>> getAllRooms() {
        List<ExaminationRoomResponse> rooms = workScheduleService.getAllExaminationRooms();
        return ResponseEntity.ok(ApiResponse.success(rooms, "Lấy danh sách phòng khám thành công"));
    }

    @PostMapping("/admin/work-schedules")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkScheduleResponse>> createSchedule(
            @Valid @RequestBody WorkScheduleRequest request
    ) {
        WorkScheduleResponse created = workScheduleService.createSchedule(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Tạo ca làm việc mới thành công"));
    }

    @PostMapping("/admin/work-schedules/batch")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BatchWorkScheduleResponse>> createBatchSchedules(
            @Valid @RequestBody BatchWorkScheduleRequest request
    ) {
        BatchWorkScheduleResponse response = workScheduleService.createBatchSchedules(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Đăng ký ca làm việc định kỳ thành công"));
    }


    @PatchMapping("/admin/work-schedules/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkScheduleResponse>> cancelSchedule(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Bác sĩ có lịch đột xuất") String reason
    ) {
        WorkScheduleResponse cancelled = workScheduleService.cancelSchedule(id, reason);
        return ResponseEntity.ok(ApiResponse.success(cancelled, "Đã hủy ca làm việc thành công"));
    }

    @DeleteMapping("/admin/work-schedules/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable Long id) {
        workScheduleService.deleteSchedule(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Xóa ca làm việc thành công"));
    }
}
