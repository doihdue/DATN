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

    @Builder.Default
    @Column(name = "status", nullable = false, length = 50)
    private String status = "PENDING"; // PENDING, PROCESSING, COMPLETED, CANCELLED

    @Column(name = "notes", length = 500)
    private String notes;

    // KTV tiếp nhận mẫu, thực hiện và ký kết quả (null khi bác sĩ vừa chỉ định)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_id", foreignKey = @ForeignKey(name = "fk_lab_order_performer"))
    private LabTechnician performer;

    // Ca trực (phòng cận lâm sàng + khung giờ) của KTV lúc thực hiện; null nếu KTV làm ngoài ca trực
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_shift_id")
    private StaffShift staffShift;

    // Kết quả xét nghiệm (null khi chưa có kết quả)
    @OneToOne(mappedBy = "labOrder", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private LabResult result;
}
