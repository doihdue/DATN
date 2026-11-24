package com.demo.be.service;

import com.demo.be.dto.request.BatchWorkScheduleRequest;
import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.BatchWorkScheduleResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.model.WorkSchedule;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

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

    // Hỗ trợ phân hệ Hàng đợi (Queue) tra cứu ca trực theo chuẩn kiến trúc phân tầng
    List<WorkSchedule> getActiveDoctorSchedulesToday(Long doctorId);

    Optional<WorkSchedule> findOnDutySchedule(Long roomId, LocalDate date, LocalTime time);

    boolean isDoctorOnDutyInRoom(Long doctorId, Long roomId, LocalDate date);
}
