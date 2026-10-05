package com.demo.be.service.impl;

import com.demo.be.dto.request.SpecialtyRequest;
import com.demo.be.dto.response.DoctorSimpleResponse;
import com.demo.be.dto.response.SpecialtyDetailResponse;
import com.demo.be.dto.response.SpecialtyResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Specialty;
import com.demo.be.repository.SpecialtyRepository;
import com.demo.be.service.SpecialtyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpecialtyServiceImpl implements SpecialtyService {

    private final SpecialtyRepository specialtyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SpecialtyResponse> getAllSpecialties() {
        return specialtyRepository.findAllByOrderByNameAsc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SpecialtyDetailResponse getSpecialtyById(Long id) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", id));

        List<DoctorSimpleResponse> doctors = specialty.getDoctors().stream()
                .map(doc -> DoctorSimpleResponse.builder()
                        .id(doc.getId())
                        .fullName(doc.getFullName())
                        .employeeCode(doc.getEmployeeCode())
                        .academicTitle(doc.getAcademicTitle())
                        .yearsOfExperience(doc.getYearsOfExperience())
                        .averageConsultationTime(doc.getAverageConsultationTime())
                        .specialtyName(specialty.getName())
                        .build())
                .collect(Collectors.toList());

        return SpecialtyDetailResponse.builder()
                .id(specialty.getId())
                .name(specialty.getName())
                .description(specialty.getDescription())
                .iconUrl(specialty.getIconUrl())
                .doctorCount(doctors.size())
                .doctors(doctors)
                .build();
    }

    @Override
    @Transactional
    public SpecialtyResponse createSpecialty(SpecialtyRequest request) {
        if (specialtyRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new BadRequestException("Chuyên khoa '" + request.getName() + "' đã tồn tại trong hệ thống.");
        }

        Specialty specialty = Specialty.builder()
                .name(request.getName().trim())
                .description(request.getDescription())
                .iconUrl(request.getIconUrl())
                .build();

        Specialty saved = specialtyRepository.save(specialty);
        log.info("-> Đã tạo chuyên khoa mới: {}", saved.getName());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public SpecialtyResponse updateSpecialty(Long id, SpecialtyRequest request) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", id));

        if (specialtyRepository.existsByNameIgnoreCaseAndIdNot(request.getName().trim(), id)) {
            throw new BadRequestException("Tên chuyên khoa '" + request.getName() + "' đã được sử dụng bởi chuyên khoa khác.");
        }

        specialty.setName(request.getName().trim());
        specialty.setDescription(request.getDescription());
        specialty.setIconUrl(request.getIconUrl());

        Specialty updated = specialtyRepository.save(specialty);
        log.info("-> Đã cập nhật chuyên khoa: {}", updated.getName());
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteSpecialty(Long id) {
        Specialty specialty = specialtyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Chuyên khoa", "id", id));

        if (specialty.getDoctors() != null && !specialty.getDoctors().isEmpty()) {
            throw new BadRequestException("Không thể xóa chuyên khoa '" + specialty.getName() + 
                    "' vì hiện có " + specialty.getDoctors().size() + " bác sĩ đang trực thuộc.");
        }

        specialtyRepository.delete(specialty);
        log.info("-> Đã xóa chuyên khoa ID: {}", id);
    }

    private SpecialtyResponse mapToResponse(Specialty specialty) {
        int docCount = specialty.getDoctors() != null ? specialty.getDoctors().size() : 0;
        return SpecialtyResponse.builder()
                .id(specialty.getId())
                .name(specialty.getName())
                .description(specialty.getDescription())
                .iconUrl(specialty.getIconUrl())
                .doctorCount(docCount)
                .build();
    }
}
