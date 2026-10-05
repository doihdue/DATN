package com.demo.be.dto.response;

import com.demo.be.model.MedicalRecord;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalRecordResponse {

    private Long id;
    private LocalDateTime createdAt;

    // Vé khám & Cuộc hẹn
    private Long queueTicketId;
    private String ticketNumber;
    private Long appointmentId;

    // Thông tin bệnh nhân
    private Long patientId;
    private String patientName;
    private LocalDate patientDob;
    private String patientGender;
    private String patientPhone;
    private String bloodGroup;
    private String allergies;
    private String medicalHistorySummary;

    // Thông tin Bác sĩ
    private Long doctorId;
    private String doctorName;
    private String doctorTitle;
    private String specialtyName;

    // Chỉ số sinh tồn
    private String bloodPressure;
    private Integer heartRate;
    private Double temperature;
    private Double weight;
    private Double height;
    private String vitalSigns;

    // Chẩn đoán & Lâm sàng
    private String symptoms;
    private String preliminaryDiagnosis;
    private String finalDiagnosis;
    private String icd10Code;
    private String notes;

    // Hẹn tái khám (Extend UC)
    private LocalDate revisitDate;
    private String revisitNotes;

    // Đơn thuốc (Extend UC)
    private PrescriptionResponse prescription;

    public static MedicalRecordResponse fromEntity(MedicalRecord record) {
        if (record == null) return null;

        MedicalRecordResponse.MedicalRecordResponseBuilder builder = MedicalRecordResponse.builder()
                .id(record.getId())
                .createdAt(record.getCreatedAt())
                .bloodPressure(record.getBloodPressure())
                .heartRate(record.getHeartRate())
                .temperature(record.getTemperature())
                .weight(record.getWeight())
                .height(record.getHeight())
                .vitalSigns(record.getVitalSigns())
                .symptoms(record.getSymptoms())
                .preliminaryDiagnosis(record.getPreliminaryDiagnosis())
                .finalDiagnosis(record.getFinalDiagnosis())
                .icd10Code(record.getIcd10Code())
                .notes(record.getNotes())
                .revisitDate(record.getRevisitDate())
                .revisitNotes(record.getRevisitNotes());

        if (record.getQueueTicket() != null) {
            builder.queueTicketId(record.getQueueTicket().getId());
            builder.ticketNumber(record.getQueueTicket().getTicketNumber());
        }

        if (record.getAppointment() != null) {
            builder.appointmentId(record.getAppointment().getId());
        }

        if (record.getPatient() != null) {
            builder.patientId(record.getPatient().getId());
            builder.patientName(record.getPatient().getFullName());
            builder.patientDob(record.getPatient().getDateOfBirth());
            builder.patientGender(record.getPatient().getGender());
            builder.patientPhone(record.getPatient().getPhoneNumber());
            builder.bloodGroup(record.getPatient().getBloodGroup());
            builder.allergies(record.getPatient().getAllergies());
            builder.medicalHistorySummary(record.getPatient().getMedicalHistorySummary());
        }

        if (record.getDoctor() != null) {
            builder.doctorId(record.getDoctor().getId());
            builder.doctorName(record.getDoctor().getFullName());
            builder.doctorTitle(record.getDoctor().getAcademicTitle());
            if (record.getDoctor().getSpecialty() != null) {
                builder.specialtyName(record.getDoctor().getSpecialty().getName());
            }
        }

        if (record.getPrescription() != null) {
            builder.prescription(PrescriptionResponse.fromEntity(record.getPrescription()));
        }

        return builder.build();
    }
}
