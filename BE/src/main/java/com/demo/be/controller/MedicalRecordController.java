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

import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.QueueTicket;
import com.demo.be.repository.QueueTicketRepository;
import com.demo.be.service.PdfExportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final PdfExportService pdfExportService;
    private final QueueTicketRepository queueTicketRepository;

    // 1. Bác sĩ lập hồ sơ bệnh án & Kê đơn thuốc & Hẹn ngày tái khám
    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
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

    // 2b. XUẤT PHIẾU KHÁM & ĐƠN THUỐC DẠNG PDF (JASPER REPORTS)
    @GetMapping(value = {"/{id}/export-pdf", "/{id}/pdf"}, produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<byte[]> exportMedicalRecordPdf(@PathVariable Long id) {
        byte[] pdfBytes = pdfExportService.exportMedicalRecordPdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "phieu-kham-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    // 2c. XUẤT PDF THEO ID VÉ KHÁM HÀNG ĐỢI
    @GetMapping(value = "/ticket/{ticketId}/export-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAnyRole('DOCTOR', 'STAFF', 'ADMIN', 'PATIENT')")
    public ResponseEntity<byte[]> exportPdfByTicketId(@PathVariable Long ticketId) {
        MedicalRecordResponse record = medicalRecordService.getMedicalRecordByTicketId(ticketId);
        byte[] pdfBytes = pdfExportService.exportMedicalRecordPdf(record.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "phieu-kham-ve-" + ticketId + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    // 2d. XUẤT PDF THEO MÃ SỐ VÉ KHÁM (Dành cho bệnh nhân tra cứu kết quả trên trang theo dõi)
    @GetMapping(value = "/ticket-number/{ticketNumber}/export-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> exportPdfByTicketNumber(
            @PathVariable String ticketNumber,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate searchDate = date != null ? date : LocalDate.now();
        QueueTicket ticket = queueTicketRepository.findByTicketNumberAndTicketDate(ticketNumber, searchDate)
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu khám hàng đợi", "ticketNumber", ticketNumber));
        MedicalRecordResponse record = medicalRecordService.getMedicalRecordByTicketId(ticket.getId());
        byte[] pdfBytes = pdfExportService.exportMedicalRecordPdf(record.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("inline", "phieu-kham-" + ticketNumber + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
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
    public ResponseEntity<ApiResponse<PatientMedicalHistoryResponse>> getPatientHistory(@PathVariable Long patientId) {
        PatientMedicalHistoryResponse history = medicalRecordService.getPatientMedicalHistory(patientId);
        return ResponseEntity.ok(ApiResponse.success(history, "Lấy tiền sử bệnh của bệnh nhân thành công"));
    }

    // 5. Lấy danh sách bệnh án do bác sĩ đã khám
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<ApiResponse<List<MedicalRecordResponse>>> getRecordsByDoctor(@PathVariable Long doctorId) {
        List<MedicalRecordResponse> list = medicalRecordService.getRecordsByDoctorId(doctorId);
        return ResponseEntity.ok(ApiResponse.success(list, "Lấy danh sách bệnh án của bác sĩ thành công"));
    }
}
