package com.demo.be.dto.response;

import com.demo.be.model.LabCategory;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabCategoryResponse {

    private Long id;
    private String name;
    private String department;
    private String description;
    private long serviceCount; // số dịch vụ xét nghiệm đang hoạt động thuộc loại này

    public static LabCategoryResponse fromEntity(LabCategory entity, long serviceCount) {
        if (entity == null) return null;
        return LabCategoryResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .department(entity.getDepartment())
                .description(entity.getDescription())
                .serviceCount(serviceCount)
                .build();
    }
}
