package com.demo.be.service;

import com.demo.be.dto.request.LabCategoryRequest;
import com.demo.be.dto.request.LabServiceRequest;
import com.demo.be.dto.response.LabCategoryResponse;
import com.demo.be.dto.response.LabServiceResponse;

import java.util.List;

public interface LabCatalogService {

    List<LabServiceResponse> getActiveServices();

    List<LabServiceResponse> searchServices(String query);

    LabServiceResponse getServiceById(Long id);

    LabServiceResponse createService(LabServiceRequest request);

    LabServiceResponse updateService(Long id, LabServiceRequest request);

    void deleteService(Long id);

    // Loại xét nghiệm
    List<LabCategoryResponse> getCategories();

    LabCategoryResponse createCategory(LabCategoryRequest request);

    LabCategoryResponse updateCategory(Long id, LabCategoryRequest request);
}
