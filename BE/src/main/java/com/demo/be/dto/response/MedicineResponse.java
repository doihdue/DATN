package com.demo.be.dto.response;

import com.demo.be.model.Medicine;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineResponse {

    private Long id;
    private String code;
    private String name;
    private String activeIngredient;
    private String dosageForm;
    private String unit;
    private Double price;
    private String packaging;
    private String routeOfAdministration;
    private Integer stockQuantity;
    private Boolean isActive;
    private String contraindications;
    private String defaultUsageInstructions;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MedicineResponse fromEntity(Medicine medicine) {
        if (medicine == null) return null;
        return MedicineResponse.builder()
                .id(medicine.getId())
                .code(medicine.getCode())
                .name(medicine.getName())
                .activeIngredient(medicine.getActiveIngredient())
                .dosageForm(medicine.getDosageForm())
                .unit(medicine.getUnit())
                .price(medicine.getPrice())
                .packaging(medicine.getPackaging())
                .routeOfAdministration(medicine.getRouteOfAdministration())
                .stockQuantity(medicine.getStockQuantity())
                .isActive(medicine.getIsActive())
                .contraindications(medicine.getContraindications())
                .defaultUsageInstructions(medicine.getDefaultUsageInstructions())
                .categoryId(medicine.getCategory() != null ? medicine.getCategory().getId() : null)
                .categoryName(medicine.getCategory() != null ? medicine.getCategory().getName() : null)
                .createdAt(medicine.getCreatedAt())
                .updatedAt(medicine.getUpdatedAt())
                .build();
    }
}
