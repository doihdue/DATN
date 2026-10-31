package com.demo.be.dto.response;

import com.demo.be.model.LabTechnician;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTechResponse {

    private Long id;
    private String fullName;
    private String employeeCode;
    private String department;

    public static LabTechResponse fromEntity(LabTechnician e) {
        return LabTechResponse.builder()
                .id(e.getId())
                .fullName(e.getFullName())
                .employeeCode(e.getEmployeeCode())
                .department(e.getDepartment())
                .build();
    }
}
