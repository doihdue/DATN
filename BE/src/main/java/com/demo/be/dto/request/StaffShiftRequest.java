package com.demo.be.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffShiftRequest {

    @NotNull(message = "Kỹ thuật viên không được để trống")
    private Long employeeId;

    @NotNull(message = "Phòng cận lâm sàng không được để trống")
    private Long roomId;

    @NotNull(message = "Ngày trực không được để trống")
    private LocalDate workDate;

    private String shiftType; // CA_SÁNG, CA_CHIỀU, CA_TỐI

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    private String notes;
}
