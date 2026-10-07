package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QueueTicketResponse {

    private Long id;
    private Long patientId;
    private String ticketNumber;
    private LocalDate ticketDate;
    private String patientName;
    private String patientPhone;
    private Integer patientYearOfBirth;
    private LocalDate patientDob;
    private Boolean isEmergency;
    private Boolean hasAppointment;
    private Integer priorityScore;
    private String status; // WAITING, CALLED, IN_PROGRESS, COMPLETED, SKIPPED, CANCELLED
    private LocalTime checkInTime;
    private LocalTime callTime;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer estimatedWaitingMinutes;
    private String notes;

    // Room info
    private Long examinationRoomId;
    private String roomNumber;
    private String roomName;

    // Doctor info
    private Long doctorId;
    private String doctorName;
    private String specialtyName;
}
