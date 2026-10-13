package com.demo.be.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchWorkScheduleRequest {

    @NotNull(message = "Bác sĩ không được để trống")
    private Long doctorId;

    @NotNull(message = "Phòng khám không được để trống")
    private Long examinationRoomId;

    @NotNull(message = "Từ ngày không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Đến ngày không được để trống")
    private LocalDate endDate;

    /**
     * Danh sách thứ trong tuần (1 = Thứ 2, 2 = Thứ 3, ..., 7 = Chủ nhật).
     * Nếu để trống thì mặc định áp dụng tất cả các ngày trong khoảng startDate -> endDate.
     */
    private List<Integer> daysOfWeek;

    private String shiftType; // CA_SÁNG, CA_CHIỀU, CA_TỐI, TỰ_DO

    @NotNull(message = "Giờ bắt đầu không được để trống")
    private LocalTime startTime;

    @NotNull(message = "Giờ kết thúc không được để trống")
    private LocalTime endTime;

    @NotNull(message = "Số lượng bệnh nhân tối đa không được để trống")
    @Min(value = 1, message = "Số lượng bệnh nhân tối đa phải lớn hơn 0")
    private Integer maxPatients;

    private String status; // AVAILABLE, FULL, CANCELLED
}
