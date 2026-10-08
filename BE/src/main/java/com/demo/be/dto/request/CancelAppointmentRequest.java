package com.demo.be.dto.request;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelAppointmentRequest {

    @Size(max = 500, message = "Lý do huỷ không được vượt quá 500 ký tự")
    private String reason;
}
