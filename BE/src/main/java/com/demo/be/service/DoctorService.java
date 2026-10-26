package com.demo.be.service;

import com.demo.be.dto.request.DoctorRequest;
import com.demo.be.dto.response.DoctorResponse;

import java.util.List;

public interface DoctorService {
    List<DoctorResponse> searchDoctors(String keyword, Long specialtyId, String status);
    DoctorResponse getDoctorById(Long id);
    DoctorResponse createDoctor(DoctorRequest request);
    DoctorResponse updateDoctor(Long id, DoctorRequest request);
    DoctorResponse updateStatus(Long id, String status);
    void deleteDoctor(Long id);
}
