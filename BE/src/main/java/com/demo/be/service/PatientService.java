package com.demo.be.service;

import com.demo.be.dto.request.PatientRequest;
import com.demo.be.dto.response.PatientResponse;

import java.util.List;

public interface PatientService {

    List<PatientResponse> searchPatients(String keyword, String gender, String accountStatus);

    PatientResponse getPatientById(Long id);

    PatientResponse createPatient(PatientRequest request);

    PatientResponse updatePatient(Long id, PatientRequest request);

    PatientResponse updateAccountStatus(Long id, String status);

    void deletePatient(Long id);
}
