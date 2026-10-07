package com.demo.be.service.impl;

import com.demo.be.dto.request.MedicineCategoryRequest;
import com.demo.be.dto.response.MedicineCategoryResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.MedicineCategory;
import com.demo.be.repository.MedicineCategoryRepository;
import com.demo.be.repository.MedicineRepository;
import com.demo.be.service.MedicineCategoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicineCategoryServiceImpl implements MedicineCategoryService {

    private final MedicineCategoryRepository categoryRepository;
    private final MedicineRepository medicineRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MedicineCategoryResponse> getAllCategories() {
        return categoryRepository.findAllByOrderByDisplayOrderAscNameAsc().stream()
                .map(MedicineCategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicineCategoryResponse> getActiveCategories() {
        return categoryRepository.findByIsActiveTrueOrderByDisplayOrderAscNameAsc().stream()
                .map(MedicineCategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MedicineCategoryResponse getCategoryById(Long id) {
        MedicineCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm thuốc", "id", id));
        return MedicineCategoryResponse.fromEntity(category);
    }

    @Override
    @Transactional
    public MedicineCategoryResponse createCategory(MedicineCategoryRequest request) {
        String name = request.getName().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new BadRequestException("Nhóm thuốc với tên '" + name + "' đã tồn tại!");
        }

        String code = request.getCode() != null ? request.getCode().trim().toUpperCase() : null;
        if (code != null && !code.isEmpty() && categoryRepository.existsByCodeIgnoreCase(code)) {
            throw new BadRequestException("Mã nhóm thuốc '" + code + "' đã được sử dụng!");
        }

        MedicineCategory category = MedicineCategory.builder()
                .code(code)
                .name(name)
                .description(request.getDescription())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        MedicineCategory saved = categoryRepository.save(category);
        log.info("-> Đã tạo mới nhóm thuốc: {} (ID: {})", saved.getName(), saved.getId());
        return MedicineCategoryResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public MedicineCategoryResponse updateCategory(Long id, MedicineCategoryRequest request) {
        MedicineCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm thuốc", "id", id));

        String newName = request.getName().trim();
        if (!category.getName().equalsIgnoreCase(newName) && categoryRepository.existsByNameIgnoreCase(newName)) {
            throw new BadRequestException("Nhóm thuốc với tên '" + newName + "' đã tồn tại!");
        }

        String newCode = request.getCode() != null ? request.getCode().trim().toUpperCase() : null;
        if (newCode != null && !newCode.isEmpty()) {
            if (category.getCode() == null || !category.getCode().equalsIgnoreCase(newCode)) {
                if (categoryRepository.existsByCodeIgnoreCase(newCode)) {
                    throw new BadRequestException("Mã nhóm thuốc '" + newCode + "' đã được sử dụng!");
                }
            }
        }

        category.setName(newName);
        category.setCode(newCode);
        category.setDescription(request.getDescription());
        if (request.getIsActive() != null) {
            category.setIsActive(request.getIsActive());
        }
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }

        MedicineCategory updated = categoryRepository.save(category);
        log.info("-> Đã cập nhật nhóm thuốc ID {}: {}", id, updated.getName());
        return MedicineCategoryResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        MedicineCategory category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm thuốc", "id", id));

        long count = medicineRepository.countByCategoryId(id);
        if (count > 0) {
            throw new BadRequestException("Không thể xóa nhóm thuốc '" + category.getName() + 
                    "' vì đang có " + count + " loại thuốc thuộc nhóm này. Vui lòng chuyển nhóm hoặc xóa các thuốc trước!");
        }

        categoryRepository.delete(category);
        log.info("-> Đã xóa thành công nhóm thuốc ID {}: {}", id, category.getName());
    }
}
