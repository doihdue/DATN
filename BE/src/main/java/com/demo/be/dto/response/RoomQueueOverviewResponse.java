package com.demo.be.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomQueueOverviewResponse {

    private Long examinationRoomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;

    private Long doctorId;
    private String doctorName;
    private String specialtyName;

    private QueueTicketResponse currentExaminingTicket; // Đang khám
    private QueueTicketResponse currentCalledTicket;    // Đang gọi vào phòng

    @Builder.Default
    private List<QueueTicketResponse> waitingTickets = new ArrayList<>(); // Danh sách đang chờ

    @Builder.Default
    private List<QueueTicketResponse> skippedTickets = new ArrayList<>(); // Danh sách bị nhỡ lượt

    @Builder.Default
    private List<QueueTicketResponse> completedTickets = new ArrayList<>(); // Danh sách đã khám xong hôm nay

    private int totalWaitingCount;
    private int totalExaminedCount;
    private int estimatedWaitMinutes;
}
