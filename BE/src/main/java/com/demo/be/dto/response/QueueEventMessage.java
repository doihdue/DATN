package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueEventMessage {

    private String eventType; // TICKET_CREATED, TICKET_CALLED, TICKET_STARTED, TICKET_COMPLETED, TICKET_SKIPPED, TICKET_RECALLED
    private Long ticketId;
    private String ticketNumber;
    private String patientName;
    private Long roomId;
    private String roomNumber;
    private String doctorName;
    private String status;
    private Integer priorityScore;
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
    private String message;
}
