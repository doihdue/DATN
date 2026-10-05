package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientMedicalHistoryResponse {

    private Long patientId;
    private String patientName;
    private LocalDate dateOfBirth;
    private String gender;
    private String phoneNumber;
    private String bloodGroup;
    private String allergies;
    private String medicalHistorySummary;
    private Integer totalExaminations;
    private List<MedicalRecordResponse> records;
}
