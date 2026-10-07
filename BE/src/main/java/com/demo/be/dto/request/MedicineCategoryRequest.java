package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicineCategoryRequest {

    private String code;

    @NotBlank(message = "Tên nhóm thuốc không được để trống")
    private String name;

    private String description;

    private Boolean isActive;

    private Integer displayOrder;
}
