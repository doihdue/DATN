package com.demo.be.service;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.ClinicDisplayBoardResponse;
import com.demo.be.dto.response.MyTicketStatusResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.dto.response.RoomQueueOverviewResponse;

import java.util.List;

public interface QueueService {

    QueueTicketResponse checkIn(CheckInRequest request);

    QueueTicketResponse callNext(Long roomId);

    QueueTicketResponse startExamination(Long ticketId);

    QueueTicketResponse completeExamination(Long ticketId);

    QueueTicketResponse skipTicket(Long ticketId);

    QueueTicketResponse recallTicket(Long ticketId);

    QueueTicketResponse setEmergency(Long ticketId);

    RoomQueueOverviewResponse getRoomQueueOverview(Long roomId);

    List<ClinicDisplayBoardResponse> getClinicDisplayBoard();

    MyTicketStatusResponse getMyTicketStatus(String ticketNumber);

    QueueTicketResponse getTicketById(Long ticketId);
}
