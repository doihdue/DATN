package com.demo.be.dto.dashboard;

import lombok.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardOverviewResponse {
    private String period; // TODAY, WEEK, MONTH
    private LocalDate fromDate;
    private LocalDate toDate;

    // 1. Chỉ số lượt khám
    private long totalTickets;
    private long totalExaminationsCompleted;
    private long todayTickets;
    private long todayCompleted;

    // 2. Chỉ số thời gian chờ trung bình (phút)
    private double avgWaitingMinutes;
    private String waitTimeAssessment; // "EXCELLENT" (<15m), "NORMAL" (15-30m), "HIGH" (>30m)

    // 3. Chỉ số lịch hẹn & Tỷ lệ huỷ lịch
    private long totalAppointments;
    private long confirmedAppointments;
    private long completedAppointments;
    private long cancelledAppointments;
    private double cancellationRate; // Tỷ lệ % huỷ lịch hẹn

    // 4. Phân bổ trạng thái vé khám
    private Map<String, Long> statusDistribution;

    // 5. Thống kê theo ngày (cho Line chart & Bar chart)
    private List<DailyStatDto> dailyStats;

    // 6. Hiệu suất theo từng phòng khám
    private List<RoomStatDto> roomStats;
}
