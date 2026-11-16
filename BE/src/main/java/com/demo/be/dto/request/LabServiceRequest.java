package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabServiceRequest {

    private String serviceCode;

    @NotBlank(message = "Tên dịch vụ xét nghiệm không được để trống")
    private String serviceName;

    @NotNull(message = "Vui lòng chọn loại xét nghiệm")
    private Long categoryId;

    @NotNull(message = "Giá dịch vụ không được để trống")
    @PositiveOrZero(message = "Giá dịch vụ không được âm")
    private Double price;

    private String referenceRange;

    private Double lowerLimit;

    private Double upperLimit;

    private String unit;

    private String description;

    private Boolean isActive;
}
