package com.demo.be.service;

public interface PdfExportService {

    /**
     * Xuất phiếu khám bệnh kèm đơn thuốc dưới định dạng PDF chuẩn JasperReports A4.
     *
     * @param medicalRecordId ID của hồ sơ bệnh án
     * @return Mảng byte chứa nội dung file PDF
     */
    byte[] exportMedicalRecordPdf(Long medicalRecordId);
}
