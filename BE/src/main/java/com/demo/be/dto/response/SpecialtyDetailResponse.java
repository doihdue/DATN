package com.demo.be.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SpecialtyDetailResponse {

    private Long id;
    private String name;
    private String description;
    private String iconUrl;
    private int doctorCount;

    @Builder.Default
    private List<DoctorSimpleResponse> doctors = new ArrayList<>();
}
