package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MyTicketStatusResponse {

    private String ticketNumber;
    private LocalDate ticketDate;
    private String patientName;
    private String status; // WAITING, CALLED, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED
    private Integer priorityScore;

    private Long roomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;
    private String doctorName;
    private String specialtyName;

    private LocalTime checkInTime;
    private LocalTime callTime;

    private int positionInQueue;       // Vị trí thứ mấy trong danh sách chờ
    private int waitingAheadCount;     // Có bao nhiêu người đang chờ phía trước
    private int estimatedWaitingMinutes; // Số phút ước tính còn phải chờ
}
