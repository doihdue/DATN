package com.demo.be.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SendLabOrdersRequest {

    @NotNull(message = "Vé khám không được để trống")
    private Long queueTicketId;

    private Long patientId;
    private Long doctorId;

    // Chỉ số sinh tồn sơ bộ
    private String bloodPressure;
    private Integer heartRate;
    private Double temperature;
    private Double weight;
    private Double height;
    private String vitalSigns;

    // Lâm sàng sơ bộ
    private String symptoms;
    private String preliminaryDiagnosis;
    private String notes;

    // Danh sách các dịch vụ xét nghiệm được chỉ định
    @NotEmpty(message = "Vui lòng chọn ít nhất 1 dịch vụ xét nghiệm")
    private List<Long> labServiceIds;
}
