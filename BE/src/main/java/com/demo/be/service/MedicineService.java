package com.demo.be.service;

import com.demo.be.dto.request.MedicineRequest;
import com.demo.be.dto.response.MedicineResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MedicineService {
    List<MedicineResponse> getAllMedicines();
    List<MedicineResponse> searchMedicines(String keyword);
    List<MedicineResponse> searchMedicinesFiltered(String keyword, Long categoryId, Boolean activeOnly);
    Page<MedicineResponse> searchMedicinesPaged(String keyword, Long categoryId, Boolean activeOnly, Pageable pageable);
    MedicineResponse getMedicineById(Long id);
    MedicineResponse createMedicine(MedicineRequest request);
    MedicineResponse updateMedicine(Long id, MedicineRequest request);
    void deleteMedicine(Long id);
}
