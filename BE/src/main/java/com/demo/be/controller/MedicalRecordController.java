package com.demo.be.controller;

import com.demo.be.dto.request.CreateMedicalRecordRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.dto.response.PatientMedicalHistoryResponse;
import com.demo.be.service.MedicalRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;

    // 1. Bác sĩ lập hồ sơ bệnh án & Kê đơn thuốc & Hẹn ngày tái khám
    @PostMapping
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> createMedicalRecord(
            @Valid @RequestBody CreateMedicalRecordRequest request) {
        MedicalRecordResponse res = medicalRecordService.createMedicalRecord(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(res, "Đã lưu hồ sơ bệnh án và hoàn thành ca khám!"));
    }

    // 2. Xem chi tiết hồ sơ bệnh án theo ID (Dùng để in ấn đơn thuốc / phiếu khám)
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getRecordById(@PathVariable Long id) {
        MedicalRecordResponse res = medicalRecordService.getMedicalRecordById(id);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy chi tiết hồ sơ bệnh án thành công"));
    }

    // 3. Xem hồ sơ bệnh án theo ID vé khám
    @GetMapping("/ticket/{ticketId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<ApiResponse<MedicalRecordResponse>> getRecordByTicketId(@PathVariable Long ticketId) {
        MedicalRecordResponse res = medicalRecordService.getMedicalRecordByTicketId(ticketId);
        return ResponseEntity.ok(ApiResponse.success(res, "Lấy hồ sơ bệnh án theo vé thành công"));
    }

    // 4. Bác sĩ xem tiền sử bệnh của bệnh nhân (Lịch sử các lần khám trước)
    @GetMapping("/patient/{patientId}/history")
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<ApiResponse<PatientMedicalHistoryResponse>> getPatientHistory(@PathVariable Long patientId) {
        PatientMedicalHistoryResponse history = medicalRecordService.getPatientMedicalHistory(patientId);
        return ResponseEntity.ok(ApiResponse.success(history, "Lấy tiền sử bệnh của bệnh nhân thành công"));
    }

    // 5. Lấy danh sách bệnh án do bác sĩ đã khám
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getRecordsByDoctor(@PathVariable Long doctorId) {
        List<MedicalRecordResponse> list = medicalRecordService.getRecordsByDoctorId(doctorId);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách bệnh án của bác sĩ thành công"));
    }
}
