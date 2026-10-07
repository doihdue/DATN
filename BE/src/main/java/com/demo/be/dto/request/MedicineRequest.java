package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineRequest {

    private String code;

    @NotBlank(message = "Tên thuốc không được để trống")
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
}
