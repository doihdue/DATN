package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lab_services")
public class LabService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "service_code", nullable = false, unique = true, length = 50)
    private String serviceCode;

    @Column(name = "service_name", nullable = false, length = 250)
    private String serviceName;

    @Column(name = "price", nullable = false)
    private Double price;

    @Column(name = "reference_range", length = 200)
    private String referenceRange; // Ví dụ: "4.0 - 10.0 G/L" hoặc "3.9 - 6.4"

    @Column(name = "lower_limit")
    private Double lowerLimit; // Giới hạn dưới để đối soát số học

    @Column(name = "upper_limit")
    private Double upperLimit; // Giới hạn trên để đối soát số học

    @Column(name = "unit", length = 50)
    private String unit; // Ví dụ: "mmol/L", "mg/dL", "G/L"

    @Column(name = "category", length = 100)
    private String category; // Ví dụ: "Huyết học", "Sinh hóa", "Chẩn đoán hình ảnh"

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
