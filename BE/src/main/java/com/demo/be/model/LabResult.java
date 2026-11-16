package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

// Kết quả của một chỉ định xét nghiệm (mỗi chỉ định có tối đa một kết quả)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "lab_results")
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lab_order_id", nullable = false, unique = true)
    private LabOrder labOrder;

    @Column(name = "result_value", nullable = false, length = 500)
    private String resultValue;

    // Đơn vị và khoảng tham chiếu lưu lại tại thời điểm có kết quả:
    // sửa danh mục xét nghiệm về sau không làm thay đổi kết quả cũ
    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "reference_range", length = 200)
    private String referenceRange;

    @Builder.Default
    @Column(name = "is_abnormal", nullable = false)
    private Boolean isAbnormal = false;

    @Column(name = "conclusion", columnDefinition = "NVARCHAR(MAX)")
    private String conclusion;

    @Column(name = "result_time", nullable = false)
    private LocalDateTime resultTime;
}
