package com.demo.be.dto.response;

import com.demo.be.model.PrescriptionItem;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionItemResponse {

    private Long id;
    private Long medicineId;
    private String medicineName;
    private String activeIngredient;
    private String dosageForm;
    private String unit;
    private Integer quantity;
    private String dosage;
    private String route;
    private Integer daysSupply;
    private String instructions;

    public static PrescriptionItemResponse fromEntity(PrescriptionItem item) {
        if (item == null) return null;
        return PrescriptionItemResponse.builder()
                .id(item.getId())
                .medicineId(item.getMedicine() != null ? item.getMedicine().getId() : null)
                .medicineName(item.getMedicine() != null ? item.getMedicine().getName() : null)
                .activeIngredient(item.getMedicine() != null ? item.getMedicine().getActiveIngredient() : null)
                .dosageForm(item.getMedicine() != null ? item.getMedicine().getDosageForm() : null)
                .unit(item.getMedicine() != null ? item.getMedicine().getUnit() : null)
                .quantity(item.getQuantity())
                .dosage(item.getDosage())
                .route(item.getRoute())
                .daysSupply(item.getDaysSupply())
                .instructions(item.getInstructions())
                .build();
    }
}
