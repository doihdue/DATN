package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

// Loại xét nghiệm (Huyết học, Sinh hóa máu, Chẩn đoán hình ảnh...): nhóm các dịch vụ xét nghiệm
// và quyết định khoa nào thực hiện (khoa Xét nghiệm hay khoa Chẩn đoán hình ảnh)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lab_categories")
public class LabCategory {

    public static final String XET_NGHIEM = "XET_NGHIEM";
    public static final String CHAN_DOAN_HINH_ANH = "CHAN_DOAN_HINH_ANH";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    // Khoa thực hiện: XET_NGHIEM hoặc CHAN_DOAN_HINH_ANH (trùng với LabTechnician.department)
    @Builder.Default
    @Column(name = "department", nullable = false, length = 30)
    private String department = XET_NGHIEM;

    @Column(name = "description", columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Builder.Default
    @OneToMany(mappedBy = "category")
    private List<LabService> labServices = new ArrayList<>();
}
