package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

// Kỹ thuật viên cận lâm sàng: thuộc một khoa, được xếp ca tại phòng cận lâm sàng của khoa đó
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "lab_technicians")
@PrimaryKeyJoinColumn(name = "id")
public class LabTechnician extends Employee {

    // XET_NGHIEM / CHAN_DOAN_HINH_ANH, trùng với loại phòng cận lâm sàng
    @Column(name = "department", nullable = false, length = 30)
    private String department;
}
