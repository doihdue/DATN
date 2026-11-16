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

    // Loại xét nghiệm (Huyết học, Sinh hóa máu, Chẩn đoán hình ảnh...)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_category_id")
    private LabCategory category;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    // Khoa thực hiện lấy theo loại xét nghiệm; dịch vụ chưa gán loại mặc định do khoa Xét nghiệm làm
    @Transient
    public String getDepartment() {
        return category != null && category.getDepartment() != null ? category.getDepartment() : LabCategory.XET_NGHIEM;
    }

    @Transient
    public String getCategoryName() {
        return category != null ? category.getName() : null;
    }
}
