package com.demo.be.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMedicalRecordRequest {

    // Liên kết ca khám
    private Long queueTicketId;

    @NotNull(message = "Bệnh nhân không được để trống")
    private Long patientId;

    private Long doctorId;

    private Long appointmentId;

    // Chỉ số sinh tồn
    private String bloodPressure; // Huyết áp: "120/80"

    private Integer heartRate; // Nhịp tim/mạch: 75

    private Double temperature; // Thân nhiệt: 36.8

    private Double weight; // Cân nặng: 65.0

    private Double height; // Chiều cao: 170.0

    private String vitalSigns; // Ghi chú sinh hiệu khác

    // Triệu chứng & Chẩn đoán
    @NotBlank(message = "Triệu chứng lâm sàng không được để trống")
    private String symptoms;

    private String preliminaryDiagnosis; // Chẩn đoán sơ bộ

    @NotBlank(message = "Chẩn đoán xác định không được để trống")
    private String finalDiagnosis; // Chẩn đoán xác định

    private String icd10Code; // Mã ICD-10

    private String notes; // Lời dặn dò của bác sĩ

    // Hẹn ngày tái khám (Extend UC)
    private LocalDate revisitDate;

    private String revisitNotes;

    // Kê đơn thuốc (Extend UC)
    private String prescriptionAdvice;

    @Valid
    private List<PrescriptionItemRequest> prescriptionItems;
}
