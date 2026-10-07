package com.demo.be.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckInRequest {

    private Long patientId; // null nếu là khách vãng lai

    @NotBlank(message = "Họ và tên bệnh nhân không được để trống")
    private String patientName;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String patientPhone;

    private java.time.LocalDate patientDob; // Ngày tháng năm sinh đầy đủ

    private Integer patientYearOfBirth;

    @NotNull(message = "Phòng khám không được để trống")
    private Long examinationRoomId;

    private Long doctorId; // null nếu hệ thống tự chọn theo ca trực của phòng

    private Long appointmentId; // null nếu walk-in

    @Builder.Default
    private Boolean isEmergency = false;

    private String notes;
}
