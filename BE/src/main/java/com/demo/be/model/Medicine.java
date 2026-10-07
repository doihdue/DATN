package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "medicines")
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", length = 50)
    private String code;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "active_ingredient", length = 255)
    private String activeIngredient;

    @Column(name = "dosage_form", length = 100)
    private String dosageForm;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "price")
    private Double price;

    @Column(name = "packaging", length = 150)
    private String packaging;

    @Column(name = "route_of_administration", length = 100)
    private String routeOfAdministration;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "contraindications", columnDefinition = "NVARCHAR(MAX)")
    private String contraindications;

    @Column(name = "default_usage_instructions", columnDefinition = "NVARCHAR(MAX)")
    private String defaultUsageInstructions;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private MedicineCategory category;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Builder.Default
    @OneToMany(mappedBy = "medicine")
    private List<PrescriptionItem> prescriptionItems = new ArrayList<>();
}
