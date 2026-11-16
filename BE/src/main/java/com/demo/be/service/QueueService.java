package com.demo.be.service;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.*;

import java.util.List;

public interface QueueService {

    // Quầy lễ tân cấp số: tin các trường đặc quyền (bệnh nhân có sẵn, cấp cứu, lịch hẹn, bác sĩ)
    QueueTicketResponse checkIn(CheckInRequest request);

    // Bệnh nhân tự lấy số online (không đăng nhập): chỉ dùng họ tên, SĐT, ngày sinh, phòng, triệu chứng
    MyTicketStatusResponse selfCheckIn(CheckInRequest request);

    QueueTicketResponse callNext(Long roomId);

    QueueTicketResponse startExamination(Long ticketId);


    QueueTicketResponse skipTicket(Long ticketId);

    QueueTicketResponse recallTicket(Long ticketId);

    QueueTicketResponse requeueTicket(Long ticketId);

    QueueTicketResponse setEmergency(Long ticketId);

    QueueTicketResponse transferTicket(Long ticketId, Long targetRoomId, String reason);

    QueueTicketResponse cancelTicket(Long ticketId, String reason);

    List<QueueTicketResponse> getRecentTicketsToday();

    List<PatientLookupResponse> searchPatients(String keyword);

    RoomQueueOverviewResponse getRoomQueueOverview(Long roomId);

    RoomQueueOverviewResponse getMyRoomQueueOverview();

    List<ClinicDisplayBoardResponse> getClinicDisplayBoard();

    MyTicketStatusResponse getMyTicketStatus(String ticketNumber);

    MyTicketStatusResponse getMyActiveTicket();

    QueueTicketResponse getTicketById(Long ticketId);
}
