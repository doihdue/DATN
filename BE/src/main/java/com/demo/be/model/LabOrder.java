package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lab_orders")
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medical_record_id", nullable = false)
    private MedicalRecord medicalRecord;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lab_service_id", nullable = false)
    private LabService labService;

    @Column(name = "price")
    private Double price; // Giá tại thời điểm chỉ định

    @CreationTimestamp
    @Column(name = "order_time", nullable = false)
    private LocalDateTime orderTime;

    @Column(name = "result_value", length = 500)
    private String resultValue;

    @Column(name = "is_abnormal")
    @Builder.Default
    private Boolean isAbnormal = false;

    @Column(name = "conclusion", columnDefinition = "NVARCHAR(MAX)")
    private String conclusion;

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "PENDING"; // PENDING, PROCESSING, COMPLETED, CANCELLED

    @Column(name = "performed_time")
    private LocalDateTime performedTime;

    @Column(name = "notes", length = 500)
    private String notes;

    // KTV tiếp nhận mẫu và ký duyệt kết quả (null khi bác sĩ vừa chỉ định)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id", foreignKey = @ForeignKey(name = "fk_lab_order_performer"))
    private LabTechnician performer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_schedule_id")
    private WorkSchedule workSchedule; // Ca làm việc tại phòng xét nghiệm (nullable lúc chỉ định)
}
