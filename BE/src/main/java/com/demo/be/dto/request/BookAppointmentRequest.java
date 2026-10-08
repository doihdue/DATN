package com.demo.be.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookAppointmentRequest {

    @NotNull(message = "Vui lòng chọn ca khám")
    private Long workScheduleId;

    @Size(max = 500, message = "Lý do khám không được vượt quá 500 ký tự")
    private String reasonForVisit;
}
