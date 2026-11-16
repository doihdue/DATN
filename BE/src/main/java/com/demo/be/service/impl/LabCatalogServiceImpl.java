package com.demo.be.service.impl;

import com.demo.be.dto.request.LabCategoryRequest;
import com.demo.be.dto.request.LabServiceRequest;
import com.demo.be.dto.response.LabCategoryResponse;
import com.demo.be.dto.response.LabServiceResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.LabCategory;
import com.demo.be.model.LabService;
import com.demo.be.repository.LabCategoryRepository;
import com.demo.be.repository.LabServiceRepository;
import com.demo.be.service.LabCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabCatalogServiceImpl implements LabCatalogService {

    private final LabServiceRepository labServiceRepository;
    private final LabCategoryRepository labCategoryRepository;

    @Override
    @Transactional(readOnly = true)
    public List<LabServiceResponse> getActiveServices() {
        return labServiceRepository.findByIsActiveTrueOrderByServiceNameAsc()
                .stream()
                .map(LabServiceResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabServiceResponse> searchServices(String query) {
        if (query == null || query.isBlank()) {
            return getActiveServices();
        }
        return labServiceRepository.searchActiveServices(query.trim())
                .stream()
                .map(LabServiceResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public LabServiceResponse getServiceById(Long id) {
        LabService service = labServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ xét nghiệm", "id", id));
        return LabServiceResponse.fromEntity(service);
    }

    @Override
    @Transactional
    public LabServiceResponse createService(LabServiceRequest request) {
        if (request.getServiceCode() == null || request.getServiceCode().isBlank()) {
            throw new BadRequestException("Mã dịch vụ xét nghiệm không được để trống");
        }
        String code = request.getServiceCode().trim().toUpperCase();
        if (labServiceRepository.findByServiceCode(code).isPresent()) {
            throw new BadRequestException("Mã dịch vụ " + code + " đã tồn tại");
        }
        LabService service = new LabService();
        service.setServiceCode(code);
        applyRequest(service, request);
        service.setIsActive(true);
        LabService saved = labServiceRepository.save(service);
        log.info("-> Đã tạo mới dịch vụ xét nghiệm: {} ({})", saved.getServiceName(), saved.getServiceCode());
        return LabServiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public LabServiceResponse updateService(Long id, LabServiceRequest request) {
        LabService existing = labServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ xét nghiệm", "id", id));

        applyRequest(existing, request);
        if (request.getIsActive() != null) {
            existing.setIsActive(request.getIsActive());
        }

        LabService updated = labServiceRepository.save(existing);
        log.info("-> Đã cập nhật dịch vụ xét nghiệm ID {}: {}", id, updated.getServiceName());
        return LabServiceResponse.fromEntity(updated);
    }

    @Override
    @Transactional
    public void deleteService(Long id) {
        LabService service = labServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ xét nghiệm", "id", id));
        service.setIsActive(false);
        labServiceRepository.save(service);
        log.info("-> Đã xóa mềm dịch vụ xét nghiệm ID {}: {}", id, service.getServiceName());
    }

    // Các trường sửa được của dịch vụ (mã dịch vụ không đổi sau khi tạo)
    private void applyRequest(LabService service, LabServiceRequest request) {
        LabCategory category = labCategoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new BadRequestException("Loại xét nghiệm không tồn tại"));
        if (request.getLowerLimit() != null && request.getUpperLimit() != null
                && request.getLowerLimit() > request.getUpperLimit()) {
            throw new BadRequestException("Ngưỡng dưới không được lớn hơn ngưỡng trên");
        }
        service.setServiceName(request.getServiceName().trim());
        service.setCategory(category);
        service.setPrice(request.getPrice());
        service.setReferenceRange(request.getReferenceRange());
        service.setLowerLimit(request.getLowerLimit());
        service.setUpperLimit(request.getUpperLimit());
        service.setUnit(request.getUnit());
        service.setDescription(request.getDescription());
    }

    // --- LOẠI XÉT NGHIỆM ---

    @Override
    @Transactional(readOnly = true)
    public List<LabCategoryResponse> getCategories() {
        Map<Long, Long> counts = new HashMap<>();
        for (Object[] row : labServiceRepository.countActiveByCategory()) {
            counts.put((Long) row[0], (Long) row[1]);
        }
        return labCategoryRepository.findAllByOrderByDepartmentDescNameAsc().stream()
                .map(c -> LabCategoryResponse.fromEntity(c, counts.getOrDefault(c.getId(), 0L)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabCategoryResponse createCategory(LabCategoryRequest request) {
        String name = request.getName().trim();
        if (labCategoryRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new BadRequestException("Loại xét nghiệm \"" + name + "\" đã tồn tại");
        }
        LabCategory saved = labCategoryRepository.save(LabCategory.builder()
                .name(name)
                .department(request.getDepartment())
                .description(request.getDescription())
                .build());
        log.info("-> Đã thêm loại xét nghiệm: {} ({})", saved.getName(), saved.getDepartment());
        return LabCategoryResponse.fromEntity(saved, 0);
    }

    @Override
    @Transactional
    public LabCategoryResponse updateCategory(Long id, LabCategoryRequest request) {
        LabCategory category = labCategoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Loại xét nghiệm", "id", id));
        String name = request.getName().trim();
        labCategoryRepository.findByNameIgnoreCase(name)
                .filter(other -> !other.getId().equals(id))
                .ifPresent(other -> {
                    throw new BadRequestException("Loại xét nghiệm \"" + name + "\" đã tồn tại");
                });
        category.setName(name);
        category.setDepartment(request.getDepartment());
        category.setDescription(request.getDescription());
        LabCategory saved = labCategoryRepository.save(category);
        long count = labServiceRepository.countActiveByCategory().stream()
                .filter(row -> id.equals(row[0])).mapToLong(row -> (Long) row[1]).findFirst().orElse(0L);
        return LabCategoryResponse.fromEntity(saved, count);
    }
}
