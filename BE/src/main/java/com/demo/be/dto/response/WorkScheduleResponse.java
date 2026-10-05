package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkScheduleResponse {

    private Long id;
    private LocalDate workDate;
    private String shiftType;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer maxPatients;
    private Integer currentBookedCount;
    private Integer remainingSlots;
    private String status;

    // Doctor info
    private Long doctorId;
    private String doctorName;
    private String academicTitle;
    private Long specialtyId;
    private String specialtyName;

    // Examination Room info
    private Long examinationRoomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;
}
