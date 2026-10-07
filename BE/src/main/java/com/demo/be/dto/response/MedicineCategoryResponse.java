package com.demo.be.dto.response;

import com.demo.be.model.MedicineCategory;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineCategoryResponse {

    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
    private Integer displayOrder;
    private Integer medicineCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MedicineCategoryResponse fromEntity(MedicineCategory category) {
        if (category == null) return null;
        return MedicineCategoryResponse.builder()
                .id(category.getId())
                .code(category.getCode())
                .name(category.getName())
                .description(category.getDescription())
                .isActive(category.getIsActive())
                .displayOrder(category.getDisplayOrder())
                .medicineCount(category.getMedicines() != null ? category.getMedicines().size() : 0)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}
