package com.demo.be.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkScheduleRequest {

    @NotNull(message = "Bác sĩ không được để trống")
    private Long doctorId;

    @NotNull(message = "Phòng khám không được để trống")
    private Long examinationRoomId;

    @NotNull(message = "Ngày làm việc không được để trống")
    private LocalDate workDate;

    private String shiftType; // SÁNG, CHIỀU, TỐI, TỰ_DO

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @NotNull(message = "Số lượng bệnh nhân tối đa không được để trống")
    @Min(value = 1, message = "Số lượng bệnh nhân tối đa phải lớn hơn 0")
    private Integer maxPatients;

    private String status; // AVAILABLE, FULL, CANCELLED
}
