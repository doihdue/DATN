package com.demo.be.dto.dashboard;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyStatDto {
    private LocalDate date;
    private String dayOfWeek;
    private long totalTickets;
    private long completedExaminations;
    private double avgWaitingMinutes;
}
