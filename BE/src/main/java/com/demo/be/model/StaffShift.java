package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

// Ca trực của KTV tại một phòng cận lâm sàng (một phòng / ca có thể có nhiều KTV)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "staff_shifts")
public class StaffShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Giữ tên cột employee_id của dữ liệu cũ; khoá ngoại trỏ sang bảng lab_technicians
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false, foreignKey = @ForeignKey(name = "fk_staff_shift_technician"))
    private LabTechnician technician;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private ExaminationRoom room;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "shift_type", length = 50)
    private String shiftType;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "notes", length = 255)
    private String notes;
}
