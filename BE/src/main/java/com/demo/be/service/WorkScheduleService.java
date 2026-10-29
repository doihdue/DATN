package com.demo.be.service;

import com.demo.be.dto.request.BatchWorkScheduleRequest;
import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.BatchWorkScheduleResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.WorkScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface WorkScheduleService {

    List<WorkScheduleResponse> getSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId,
            Long roomId
    );

    // Lịch trực của bác sĩ đang đăng nhập
    List<WorkScheduleResponse> getMySchedules(LocalDate startDate, LocalDate endDate);

    // Các ca còn nhận đặt lịch online (còn chỗ, chưa huỷ, chưa kết thúc)
    List<WorkScheduleResponse> getBookableSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId
    );

    WorkScheduleResponse createSchedule(WorkScheduleRequest request);

    BatchWorkScheduleResponse createBatchSchedules(BatchWorkScheduleRequest request);

    WorkScheduleResponse updateSchedule(Long id, WorkScheduleRequest request);

    WorkScheduleResponse cancelSchedule(Long id, String reason);

    void deleteSchedule(Long id);

    List<ExaminationRoomResponse> getAllExaminationRooms();
}
