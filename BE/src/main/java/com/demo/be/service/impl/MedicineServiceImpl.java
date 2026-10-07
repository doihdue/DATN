package com.demo.be.service.impl;

import com.demo.be.dto.request.MedicineRequest;
import com.demo.be.dto.response.MedicineResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Medicine;
import com.demo.be.model.MedicineCategory;
import com.demo.be.repository.MedicineCategoryRepository;
import com.demo.be.repository.MedicineRepository;
import com.demo.be.service.MedicineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineServiceImpl implements MedicineService {

    private final MedicineRepository medicineRepository;
    private final MedicineCategoryRepository categoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> getAllMedicines() {
        return medicineRepository.findAllByOrderByNameAsc().stream()
                .map(MedicineResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> searchMedicines(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllMedicines();
        }
        return medicineRepository.searchMedicines(keyword.trim()).stream()
                .map(MedicineResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineResponse> searchMedicinesFiltered(String keyword, Long categoryId, Boolean activeOnly) {
        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        return medicineRepository.searchMedicinesFiltered(kw, categoryId, activeOnly).stream()
                .map(MedicineResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MedicineResponse> searchMedicinesPaged(String keyword, Long categoryId, Boolean activeOnly, Pageable pageable) {
        String kw = (keyword != null && !keyword.trim().isEmpty()) ? keyword.trim() : null;
        return medicineRepository.searchMedicinesPaged(kw, categoryId, activeOnly, pageable)
                .map(MedicineResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineResponse getMedicineById(Long id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));
        return MedicineResponse.fromEntity(medicine);
    }

    @Override
    @Transactional
    public MedicineResponse createMedicine(MedicineRequest request) {
        String name = request.getName().trim();
        if (medicineRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Thuốc với tên '" + name + "' đã tồn tại trong danh mục!");
        }

        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : null;
        if (code != null && !code.isEmpty() && medicineRepository.existsByCodeIgnoreCase(code)) {
            throw new BadRequestException("Mã thuốc '" + code + "' đã được sử dụng!");
        }

        MedicineCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Nhóm thuốc", "id", request.getCategoryId()));
        }

        Medicine medicine = Medicine.builder()
                .code(code)
                .name(name)
                .activeIngredient(request.getActiveIngredient())
                .dosageForm(request.getDosageForm())
                .unit(request.getUnit())
                .price(request.getPrice())
                .packaging(request.getPackaging())
                .routeOfAdministration(request.getRouteOfAdministration())
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .contraindications(request.getContraindications())
                .defaultUsageInstructions(request.getDefaultUsageInstructions())
                .category(category)
                .build();

        Medicine saved = medicineRepository.save(medicine);
        log.info("-> Đã tạo mới thuốc: {} (Mã: {})", saved.getName(), saved.getCode());
        return MedicineResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicineResponse updateMedicine(Long id, MedicineRequest request) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));

        String newName = request.getName().trim();
        if (!medicine.getName().equalsIgnoreCase(newName) && medicineRepository.existsByNameIgnoreCase(newName)) {
            throw new BadRequestException("Thuốc với tên '" + newName + "' đã tồn tại trong danh mục!");
        }

        String newCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : null;
        if (newCode != null && !newCode.isEmpty()) {
            if (medicine.getCode() == null || !medicine.getCode().equalsIgnoreCase(newCode)) {
                if (medicineRepository.existsByCodeIgnoreCase(newCode)) {
                    throw new BadRequestException("Mã thuốc '" + newCode + "' đã được sử dụng!");
                }
            }
        }

        MedicineCategory category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Nhóm thuốc", "id", request.getCategoryId()));
        }

        medicine.setName(newName);
        medicine.setCode(newCode);
        medicine.setActiveIngredient(request.getActiveIngredient());
        medicine.setDosageForm(request.getDosageForm());
        medicine.setUnit(request.getUnit());
        medicine.setPrice(request.getPrice());
        medicine.setPackaging(request.getPackaging());
        medicine.setRouteOfAdministration(request.getRouteOfAdministration());
        if (request.getStockQuantity() != null) {
            medicine.setStockQuantity(request.getStockQuantity());
        }
        if (request.getIsActive() != null) {
            medicine.setIsActive(request.getIsActive());
        }
        medicine.setContraindications(request.getContraindications());
        medicine.setDefaultUsageInstructions(request.getDefaultUsageInstructions());
        medicine.setCategory(category);

        Medicine updated = medicineRepository.save(medicine);
        log.info("-> Đã cập nhật thông tin thuốc ID {}: {}", id, updated.getName());
        return MedicineResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteMedicine(Long id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));

        if (!medicine.getPrescriptionItems().isEmpty()) {
            throw new BadRequestException("Thuốc '" + medicine.getName() + "' đã được kê trong đơn thuốc bệnh án, không thể xóa hoàn toàn! Bạn có thể chuyển trạng thái sang 'Ngừng sử dụng'.");
        }

        medicineRepository.delete(medicine);
        log.info("-> Đã xóa thuốc ID {}: {}", id, medicine.getName());
    }
}
