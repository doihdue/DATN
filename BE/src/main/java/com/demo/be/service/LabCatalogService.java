package com.demo.be.service;

import com.demo.be.dto.response.LabServiceResponse;
import com.demo.be.model.LabService;

import java.util.List;

public interface LabCatalogService {

    List<LabServiceResponse> getActiveServices();

    List<LabServiceResponse> searchServices(String query);

    LabServiceResponse getServiceById(Long id);

    LabServiceResponse createService(LabService service);

    LabServiceResponse updateService(Long id, LabService service);

    void deleteService(Long id);
}
