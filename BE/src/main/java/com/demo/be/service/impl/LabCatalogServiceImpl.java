package com.demo.be.service.impl;

import com.demo.be.dto.response.LabServiceResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.LabService;
import com.demo.be.repository.LabServiceRepository;
import com.demo.be.service.LabCatalogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabCatalogServiceImpl implements LabCatalogService {

    private final LabServiceRepository labServiceRepository;

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
    public LabServiceResponse createService(LabService service) {
        if (service.getServiceCode() == null || service.getServiceCode().isBlank()
                || service.getServiceName() == null || service.getServiceName().isBlank()) {
            throw new BadRequestException("Mã và tên dịch vụ xét nghiệm không được để trống");
        }
        String code = service.getServiceCode().trim().toUpperCase();
        if (labServiceRepository.findByServiceCode(code).isPresent()) {
            throw new BadRequestException("Mã dịch vụ " + code + " đã tồn tại");
        }
        // Luôn tạo bản ghi mới: bỏ id client gửi lên
        service.setId(null);
        service.setServiceCode(code);
        service.setIsActive(true);
        LabService saved = labServiceRepository.save(service);
        log.info("-> Đã tạo mới dịch vụ xét nghiệm: {} ({})", saved.getServiceName(), saved.getServiceCode());
        return LabServiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public LabServiceResponse updateService(Long id, LabService input) {
        LabService existing = labServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ xét nghiệm", "id", id));

        existing.setServiceName(input.getServiceName());
        existing.setPrice(input.getPrice());
        existing.setReferenceRange(input.getReferenceRange());
        existing.setLowerLimit(input.getLowerLimit());
        existing.setUpperLimit(input.getUpperLimit());
        existing.setUnit(input.getUnit());
        existing.setCategory(input.getCategory());
        existing.setDescription(input.getDescription());
        if (input.getIsActive() != null) {
            existing.setIsActive(input.getIsActive());
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
}
