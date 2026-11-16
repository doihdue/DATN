package com.demo.be.service;

import com.demo.be.dto.request.CreateMedicalRecordRequest;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.dto.response.PatientMedicalHistoryResponse;

import java.time.LocalDate;
import java.util.List;

public interface MedicalRecordService {

    MedicalRecordResponse createMedicalRecord(CreateMedicalRecordRequest request);

    MedicalRecordResponse getMedicalRecordById(Long id);

    MedicalRecordResponse getMedicalRecordByTicketId(Long ticketId);

    // Bệnh nhân tra cứu không đăng nhập: chỉ trả mã hồ sơ khi số vé + ngày + 4 số cuối SĐT khớp
    Long findRecordIdForPublicLookup(String ticketNumber, LocalDate ticketDate, String phoneLast4);

    PatientMedicalHistoryResponse getPatientMedicalHistory(Long patientId);

    List<MedicalRecordResponse> getRecordsByDoctorId(Long doctorId);

    List<MedicalRecordResponse> getMyDoctorRecords();
}
