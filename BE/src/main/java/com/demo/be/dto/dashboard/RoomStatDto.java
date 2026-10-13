package com.demo.be.dto.dashboard;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomStatDto {
    private Long roomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;
    private String activeDoctorName;
    private String specialtyName;
    private long totalTickets;
    private long completedCount;
    private long waitingCount;
    private double avgWaitingMinutes;
    private double utilizationRate; // % tỉ lệ hoàn thành / tổng vé
}
