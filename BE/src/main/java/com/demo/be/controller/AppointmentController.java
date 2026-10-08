package com.demo.be.controller;

import com.demo.be.dto.request.BookAppointmentRequest;
import com.demo.be.dto.request.CancelAppointmentRequest;
import com.demo.be.dto.request.RescheduleAppointmentRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.AppointmentResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.security.UserPrincipal;
import com.demo.be.service.AppointmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    // Công khai: tra cứu các ca còn chỗ để đặt lịch
    @GetMapping("/available-schedules")
    public ResponseEntity<ApiResponse<List<WorkScheduleResponse>>> getAvailableSchedules(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) Long specialtyId
    ) {
        List<WorkScheduleResponse> schedules = appointmentService.getAvailableSchedules(startDate, endDate, doctorId, specialtyId);
        return ResponseEntity.ok(ApiResponse.success(schedules, "Lấy danh sách ca khám còn chỗ thành công"));
    }

    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> bookAppointment(
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody BookAppointmentRequest request
    ) {
        AppointmentResponse created = appointmentService.bookAppointment(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "Đặt lịch khám thành công, vui lòng chờ phòng khám xác nhận"));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> getMyAppointments(
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        List<AppointmentResponse> list = appointmentService.getMyAppointments(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách lịch hẹn thành công"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<AppointmentResponse>>> searchAppointments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) String keyword
    ) {
        List<AppointmentResponse> list = appointmentService.searchAppointments(date, status, doctorId, keyword);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách lịch hẹn thành công"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT', 'STAFF', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> getAppointmentById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        boolean canViewAll = isStaff(currentUser) || hasRole(currentUser, "ROLE_DOCTOR");
        AppointmentResponse appointment = appointmentService.getAppointmentById(id, currentUser.getId(), canViewAll);
        return ResponseEntity.ok(ApiResponse.success(appointment, "Lấy chi tiết lịch hẹn thành công"));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PATIENT', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> cancelAppointment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody(required = false) CancelAppointmentRequest request
    ) {
        String reason = request != null ? request.getReason() : null;
        AppointmentResponse cancelled = appointmentService.cancelAppointment(id, currentUser.getId(), isStaff(currentUser), reason);
        return ResponseEntity.ok(ApiResponse.success(cancelled, "Đã huỷ lịch hẹn"));
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('PATIENT', 'STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> rescheduleAppointment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody RescheduleAppointmentRequest request
    ) {
        AppointmentResponse updated = appointmentService.rescheduleAppointment(id, currentUser.getId(), isStaff(currentUser), request);
        return ResponseEntity.ok(ApiResponse.success(updated, "Đổi lịch khám thành công, vui lòng chờ phòng khám xác nhận lại"));
    }

    @PatchMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<AppointmentResponse>> confirmAppointment(@PathVariable Long id) {
        AppointmentResponse confirmed = appointmentService.confirmAppointment(id);
        return ResponseEntity.ok(ApiResponse.success(confirmed, "Đã xác nhận lịch hẹn"));
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> checkInAppointment(@PathVariable Long id) {
        QueueTicketResponse ticket = appointmentService.checkInAppointment(id);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(ticket, "Check-in thành công, đã cấp số " + ticket.getTicketNumber()));
    }

    private boolean isStaff(UserPrincipal user) {
        return hasRole(user, "ROLE_STAFF") || hasRole(user, "ROLE_ADMIN");
    }

    private boolean hasRole(UserPrincipal user, String role) {
        return user.getAuthorities().stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
