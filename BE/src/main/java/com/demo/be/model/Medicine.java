package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "active_ingredient", length = 255)
    private String activeIngredient;

    @Column(name = "dosage_form", length = 100)
    private String dosageForm;

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "default_usage_instructions", columnDefinition = "NVARCHAR(MAX)")
    private String defaultUsageInstructions;

    @Builder.Default
    @OneToMany(mappedBy = "medicine")
    private List<PrescriptionItem> prescriptionItems = new ArrayList<>();
}
