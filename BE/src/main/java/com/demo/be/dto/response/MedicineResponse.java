package com.demo.be.dto.response;

import com.demo.be.model.Medicine;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineResponse {

    private Long id;
    private String name;
    private String activeIngredient;
    private String dosageForm;
    private String unit;
    private String defaultUsageInstructions;

    public static MedicineResponse fromEntity(Medicine medicine) {
        if (medicine == null) return null;
        return MedicineResponse.builder()
                .id(medicine.getId())
                .name(medicine.getName())
                .activeIngredient(medicine.getActiveIngredient())
                .dosageForm(medicine.getDosageForm())
                .unit(medicine.getUnit())
                .defaultUsageInstructions(medicine.getDefaultUsageInstructions())
                .build();
    }
}
