package com.demo.be.dto.response;

import com.demo.be.model.LabTechnician;
import com.demo.be.model.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabTechnicianResponse {

    private Long id;
    private String fullName;
    private String gender;
    private LocalDate dateOfBirth;
    private String address;
    private String nationalId;
    private String avatarUrl;

    private String employeeCode;
    private String position;
    private LocalDate hireDate;
    private String department;

    // Thông tin tài khoản
    private Long userId;
    private String username;
    private String email;
    private String phoneNumber;
    private String status;
    private LocalDateTime createdAt;

    public static LabTechnicianResponse fromEntity(LabTechnician ktv) {
        if (ktv == null) return null;
        User user = ktv.getUser();
        return LabTechnicianResponse.builder()
                .id(ktv.getId())
                .fullName(ktv.getFullName())
                .gender(ktv.getGender())
                .dateOfBirth(ktv.getDateOfBirth())
                .address(ktv.getAddress())
                .nationalId(ktv.getNationalId())
                .avatarUrl(ktv.getAvatarUrl())
                .employeeCode(ktv.getEmployeeCode())
                .position(ktv.getPosition())
                .hireDate(ktv.getHireDate())
                .department(ktv.getDepartment())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .status(user != null ? user.getStatus() : null)
                .createdAt(user != null ? user.getCreatedAt() : null)
                .build();
    }
}

