package com.demo.be.service;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.*;

import java.util.List;

public interface QueueService {

    QueueTicketResponse checkIn(CheckInRequest request);

    QueueTicketResponse callNext(Long roomId);

    QueueTicketResponse startExamination(Long ticketId);

    QueueTicketResponse completeExamination(Long ticketId);

    QueueTicketResponse skipTicket(Long ticketId);

    QueueTicketResponse recallTicket(Long ticketId);

    QueueTicketResponse setEmergency(Long ticketId);

    QueueTicketResponse transferTicket(Long ticketId, Long targetRoomId, String reason);

    QueueTicketResponse cancelTicket(Long ticketId, String reason);

    List<QueueTicketResponse> getRecentTicketsToday();

    List<PatientLookupResponse> searchPatients(String keyword);

    RoomQueueOverviewResponse getRoomQueueOverview(Long roomId);

    List<ClinicDisplayBoardResponse> getClinicDisplayBoard();

    MyTicketStatusResponse getMyTicketStatus(String ticketNumber);

    QueueTicketResponse getTicketById(Long ticketId);
}
