package com.demo.be.service.impl;

import com.demo.be.dto.request.MedicineRequest;
import com.demo.be.dto.response.MedicineResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Medicine;
import com.demo.be.repository.MedicineRepository;
import com.demo.be.service.MedicineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineServiceImpl implements MedicineService {

    private final MedicineRepository medicineRepository;

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
    public MedicineResponse getMedicineById(Long id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));
        return MedicineResponse.fromEntity(medicine);
    }

    @Override
    @Transactional
    public MedicineResponse createMedicine(MedicineRequest request) {
        if (medicineRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new BadRequestException("Thuốc với tên '" + request.getName().trim() + "' đã tồn tại trong danh mục!");
        }

        Medicine medicine = Medicine.builder()
                .name(request.getName().trim())
                .activeIngredient(request.getActiveIngredient())
                .dosageForm(request.getDosageForm())
                .unit(request.getUnit())
                .defaultUsageInstructions(request.getDefaultUsageInstructions())
                .build();

        Medicine saved = medicineRepository.save(medicine);
        log.info("Đã tạo mới thuốc: {}", saved.getName());
        return MedicineResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicineResponse updateMedicine(Long id, MedicineRequest request) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));

        medicine.setName(request.getName().trim());
        medicine.setActiveIngredient(request.getActiveIngredient());
        medicine.setDosageForm(request.getDosageForm());
        medicine.setUnit(request.getUnit());
        medicine.setDefaultUsageInstructions(request.getDefaultUsageInstructions());

        Medicine updated = medicineRepository.save(medicine);
        log.info("Đã cập nhật thông tin thuốc ID {}: {}", id, updated.getName());
        return MedicineResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteMedicine(Long id) {
        Medicine medicine = medicineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", id));
        medicineRepository.delete(medicine);
        log.info("Đã xóa thuốc ID {}: {}", id, medicine.getName());
    }
}
