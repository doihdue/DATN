package com.demo.be.dto.response;

import com.demo.be.model.Prescription;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PrescriptionResponse {

    private Long id;
    private String doctorAdvice;
    private LocalDateTime createdAt;
    private List<PrescriptionItemResponse> items;

    public static PrescriptionResponse fromEntity(Prescription prescription) {
        if (prescription == null) return null;
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .doctorAdvice(prescription.getDoctorAdvice())
                .createdAt(prescription.getCreatedAt())
                .items(prescription.getItems() != null
                        ? prescription.getItems().stream()
                            .map(PrescriptionItemResponse::fromEntity)
                            .collect(Collectors.toList())
                        : Collections.emptyList())
                .build();
    }
}
