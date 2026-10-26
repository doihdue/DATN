package com.demo.be.dto.response;

import com.demo.be.model.Employee;
import com.demo.be.model.User;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffResponse {

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

    // Thông tin tài khoản
    private Long userId;
    private String username;
    private String email;
    private String phoneNumber;
    private String status;
    private LocalDateTime createdAt;

    public static StaffResponse fromEntity(Employee employee) {
        if (employee == null) return null;
        User user = employee.getUser();
        return StaffResponse.builder()
                .id(employee.getId())
                .fullName(employee.getFullName())
                .gender(employee.getGender())
                .dateOfBirth(employee.getDateOfBirth())
                .address(employee.getAddress())
                .nationalId(employee.getNationalId())
                .avatarUrl(employee.getAvatarUrl())
                .employeeCode(employee.getEmployeeCode())
                .position(employee.getPosition())
                .hireDate(employee.getHireDate())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .email(user != null ? user.getEmail() : null)
                .phoneNumber(user != null ? user.getPhoneNumber() : null)
                .status(user != null ? user.getStatus() : null)
                .createdAt(user != null ? user.getCreatedAt() : null)
                .build();
    }
}
