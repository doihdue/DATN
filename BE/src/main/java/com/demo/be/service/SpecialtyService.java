package com.demo.be.service;

import com.demo.be.dto.request.SpecialtyRequest;
import com.demo.be.dto.response.SpecialtyDetailResponse;
import com.demo.be.dto.response.SpecialtyResponse;

import java.util.List;

public interface SpecialtyService {

    List<SpecialtyResponse> getAllSpecialties();

    SpecialtyDetailResponse getSpecialtyById(Long id);

    SpecialtyResponse createSpecialty(SpecialtyRequest request);

    SpecialtyResponse updateSpecialty(Long id, SpecialtyRequest request);

    void deleteSpecialty(Long id);
}
