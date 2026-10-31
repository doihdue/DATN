package com.demo.be.service;

import com.demo.be.dto.request.LabTechnicianRequest;
import com.demo.be.dto.response.LabTechnicianResponse;

import java.util.List;

public interface LabTechnicianService {

    List<LabTechnicianResponse> searchTechnicians(String keyword, String department, String status);

    LabTechnicianResponse getTechnicianById(Long id);

    LabTechnicianResponse createTechnician(LabTechnicianRequest request);

    LabTechnicianResponse updateTechnician(Long id, LabTechnicianRequest request);

    LabTechnicianResponse updateStatus(Long id, String status);

    void deleteTechnician(Long id);
}

