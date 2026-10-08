package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppointmentResponse {

    private Long id;
    private String appointmentCode;
    private Integer bookingNumber;
    private LocalDate appointmentDate;
    private LocalTime estimatedStartTime;
    private String reasonForVisit;
    private String status; // PENDING, CONFIRMED, CHECKED_IN, COMPLETED, CANCELLED
    private String cancellationReason;
    private LocalDateTime createdAt;
    private LocalDateTime confirmedAt;

    // Hạn chót bệnh nhân được tự huỷ/đổi lịch
    private LocalDateTime changeDeadline;
    private Boolean canModify;

    // Patient info
    private Long patientId;
    private String patientName;
    private String patientPhone;
    private LocalDate patientDob;

    // Doctor & schedule info
    private Long doctorId;
    private String doctorName;
    private String academicTitle;
    private Long specialtyId;
    private String specialtyName;
    private Long workScheduleId;
    private String shiftType;
    private LocalTime shiftStartTime;
    private LocalTime shiftEndTime;
    private Long examinationRoomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;

    // Queue ticket (sau khi check-in)
    private Long queueTicketId;
    private String queueTicketNumber;
}
