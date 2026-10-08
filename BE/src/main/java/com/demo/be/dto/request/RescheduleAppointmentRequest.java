package com.demo.be.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RescheduleAppointmentRequest {

    @NotNull(message = "Vui lòng chọn ca khám mới")
    private Long newWorkScheduleId;
}
