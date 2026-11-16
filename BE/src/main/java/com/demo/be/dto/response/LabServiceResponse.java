package com.demo.be.dto.response;

import com.demo.be.model.LabService;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabServiceResponse {

    private Long id;
    private String serviceCode;
    private String serviceName;
    private Double price;
    private String referenceRange;
    private Double lowerLimit;
    private Double upperLimit;
    private String unit;
    private Long categoryId;
    private String category;   // tên loại xét nghiệm
    private String department; // khoa thực hiện (theo loại xét nghiệm)
    private String description;
    private Boolean isActive;

    public static LabServiceResponse fromEntity(LabService entity) {
        if (entity == null) return null;
        return LabServiceResponse.builder()
                .id(entity.getId())
                .serviceCode(entity.getServiceCode())
                .serviceName(entity.getServiceName())
                .price(entity.getPrice())
                .referenceRange(entity.getReferenceRange())
                .lowerLimit(entity.getLowerLimit())
                .upperLimit(entity.getUpperLimit())
                .unit(entity.getUnit())
                .categoryId(entity.getCategory() != null ? entity.getCategory().getId() : null)
                .category(entity.getCategoryName())
                .department(entity.getDepartment())
                .description(entity.getDescription())
                .isActive(entity.getIsActive())
                .build();
    }
}
