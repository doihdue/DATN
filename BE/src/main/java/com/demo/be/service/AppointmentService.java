package com.demo.be.service;

import com.demo.be.dto.request.BookAppointmentRequest;
import com.demo.be.dto.request.RescheduleAppointmentRequest;
import com.demo.be.dto.response.AppointmentResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.dto.response.WorkScheduleResponse;

import java.time.LocalDate;
import java.util.List;

public interface AppointmentService {

    // ===== Bệnh nhân =====

    List<WorkScheduleResponse> getAvailableSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId
    );

    AppointmentResponse bookAppointment(Long userId, BookAppointmentRequest request);

    List<AppointmentResponse> getMyAppointments(Long userId);

    AppointmentResponse rescheduleAppointment(Long id, Long userId, boolean isStaff, RescheduleAppointmentRequest request);

    // ===== Dùng chung =====

    AppointmentResponse getAppointmentById(Long id, Long userId, boolean isStaff);

    AppointmentResponse cancelAppointment(Long id, Long userId, boolean isStaff, String reason);

    // ===== Lễ tân / Admin =====

    List<AppointmentResponse> searchAppointments(LocalDate date, String status, Long doctorId, String keyword);

    AppointmentResponse confirmAppointment(Long id);

    QueueTicketResponse checkInAppointment(Long id);
}
