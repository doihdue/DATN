package com.demo.be.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecialtyResponse {

    private Long id;
    private String name;
    private String description;
    private String iconUrl;
    private int doctorCount;
}
