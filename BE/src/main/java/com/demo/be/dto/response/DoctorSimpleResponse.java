package com.demo.be.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DoctorSimpleResponse {

    private Long id;
    private String fullName;
    private String employeeCode;
    private String academicTitle;
    private Integer yearsOfExperience;
    private Integer averageConsultationTime;
    private String specialtyName;
}
