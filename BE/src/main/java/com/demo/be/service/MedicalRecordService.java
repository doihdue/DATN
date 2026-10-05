package com.demo.be.service;

import com.demo.be.dto.request.CreateMedicalRecordRequest;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.dto.response.PatientMedicalHistoryResponse;

import java.util.List;

public interface MedicalRecordService {

    MedicalRecordResponse createMedicalRecord(CreateMedicalRecordRequest request);

    MedicalRecordResponse getMedicalRecordById(Long id);

    MedicalRecordResponse getMedicalRecordByTicketId(Long ticketId);

    PatientMedicalHistoryResponse getPatientMedicalHistory(Long patientId);

    List<MedicalRecordResponse> getRecordsByDoctorId(Long doctorId);
}
