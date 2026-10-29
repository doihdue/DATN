package com.demo.be.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

// Xếp 1 KTV vào cùng một phòng / khung giờ cho nhiều ngày chọn trên lịch tháng
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchStaffShiftRequest {

    @NotNull(message = "Kỹ thuật viên không được để trống")
    private Long employeeId;

    @NotNull(message = "Phòng cận lâm sàng không được để trống")
    private Long roomId;

    @NotEmpty(message = "Chưa chọn ngày trực nào")
    private List<@NotNull LocalDate> workDates;

    private String shiftType;

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    private String notes;
}
