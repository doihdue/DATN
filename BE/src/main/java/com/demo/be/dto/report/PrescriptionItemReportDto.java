package com.demo.be.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionItemReportDto {
    private Integer stt;
    private String medicineName;
    private String activeIngredient;
    private Integer quantity;
    private String unit;
    private String instructions;
    private String dosageAndRoute;
}
