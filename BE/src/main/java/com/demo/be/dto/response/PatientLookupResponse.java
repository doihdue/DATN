package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientLookupResponse {
    private Long id;
    private String fullName;
    private String phoneNumber;
    private LocalDate dateOfBirth;
    private String gender;
    private String nationalId;
    private String address;
    private String bloodGroup;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
}
