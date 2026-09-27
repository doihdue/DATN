package com.demo.be.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSummaryResponse {

    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String avatarUrl;
    private String status;
    private Long personId;
    private List<String> roles;
}
