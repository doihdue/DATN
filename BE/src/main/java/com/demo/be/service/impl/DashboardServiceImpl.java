package com.demo.be.service.impl;

import com.demo.be.dto.dashboard.DailyStatDto;
import com.demo.be.dto.dashboard.DashboardOverviewResponse;
import com.demo.be.dto.dashboard.RoomStatDto;
import com.demo.be.model.Appointment;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.QueueTicket;
import com.demo.be.model.WorkSchedule;
import com.demo.be.repository.AppointmentRepository;
import com.demo.be.repository.ExaminationRoomRepository;
import com.demo.be.repository.QueueTicketRepository;
import com.demo.be.repository.WorkScheduleRepository;
import com.demo.be.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final QueueTicketRepository queueTicketRepository;
    private final AppointmentRepository appointmentRepository;
    private final ExaminationRoomRepository examinationRoomRepository;
    private final WorkScheduleRepository workScheduleRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardOverviewResponse getOverview(String period, Long roomId) {
        LocalDate today = LocalDate.now();
        LocalDate fromDate;
        LocalDate toDate = today;

        String safePeriod = (period != null) ? period.trim().toUpperCase() : "WEEK";
        switch (safePeriod) {
            case "TODAY":
                fromDate = today;
                break;
            case "MONTH":
                fromDate = today.minusDays(29);
                break;
            case "WEEK":
            default:
                safePeriod = "WEEK";
                fromDate = today.minusDays(6);
                break;
        }

        // 1. Lấy toàn bộ phiếu tiếp đón / vé khám trong khoảng thời gian
        List<QueueTicket> allTickets = queueTicketRepository.findByTicketDateBetween(fromDate, toDate);
        if (roomId != null) {
            allTickets = allTickets.stream()
                    .filter(t -> t.getExaminationRoom() != null && roomId.equals(t.getExaminationRoom().getId()))
                    .collect(Collectors.toList());
        }

        long totalTickets = allTickets.size();
        long totalCompleted = allTickets.stream()
                .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .count();

        long todayTickets = allTickets.stream()
                .filter(t -> today.equals(t.getTicketDate()))
                .count();
        long todayCompleted = allTickets.stream()
                .filter(t -> today.equals(t.getTicketDate()) && "COMPLETED".equalsIgnoreCase(t.getStatus()))
                .count();

        // 2. Phân bổ trạng thái
        Map<String, Long> statusDistribution = new HashMap<>();
        statusDistribution.put("WAITING", 0L);
        statusDistribution.put("CALLED", 0L);
        statusDistribution.put("IN_PROGRESS", 0L);
        statusDistribution.put("COMPLETED", 0L);
        statusDistribution.put("SKIPPED", 0L);
        statusDistribution.put("CANCELLED", 0L);

        for (QueueTicket t : allTickets) {
            String status = (t.getStatus() != null) ? t.getStatus().toUpperCase() : "WAITING";
            statusDistribution.put(status, statusDistribution.getOrDefault(status, 0L) + 1L);
        }

        // 3. Tính toán thời gian chờ trung bình (phút)
        double avgWaitingMinutes = calculateAverageWaitMinutes(allTickets);
        String waitTimeAssessment;
        if (avgWaitingMinutes <= 15.0) {
            waitTimeAssessment = "EXCELLENT";
        } else if (avgWaitingMinutes <= 30.0) {
            waitTimeAssessment = "NORMAL";
        } else {
            waitTimeAssessment = "HIGH";
        }

        // 4. Lịch hẹn và tỷ lệ huỷ lịch hẹn
        List<Appointment> appointments = appointmentRepository.findByAppointmentDateBetween(fromDate, toDate);
        long totalAppointments = appointments.size();
        long cancelledAppointments = appointments.stream()
                .filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus()))
                .count();
        long confirmedAppointments = appointments.stream()
                .filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus()))
                .count();
        long completedAppointments = appointments.stream()
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus()))
                .count();

        double cancellationRate = 0.0;
        if (totalAppointments > 0) {
            cancellationRate = Math.round(((cancelledAppointments * 100.0) / totalAppointments) * 10.0) / 10.0;
        }

        // 5. Thống kê từng ngày (Daily Stats) cho Line Chart
        List<DailyStatDto> dailyStats = new ArrayList<>();
        LocalDate cur = fromDate;
        while (!cur.isAfter(toDate)) {
            final LocalDate dateCursor = cur;
            List<QueueTicket> dayTickets = allTickets.stream()
                    .filter(t -> dateCursor.equals(t.getTicketDate()))
                    .collect(Collectors.toList());

            long dayTotal = dayTickets.size();
            long dayComp = dayTickets.stream()
                    .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                    .count();
            double dayWait = calculateAverageWaitMinutes(dayTickets);

            dailyStats.add(DailyStatDto.builder()
                    .date(dateCursor)
                    .dayOfWeek(getDayOfWeekVietnamese(dateCursor.getDayOfWeek()))
                    .totalTickets(dayTotal)
                    .completedExaminations(dayComp)
                    .avgWaitingMinutes(dayWait)
                    .build());

            cur = cur.plusDays(1);
        }

        // 6. Hiệu suất theo từng phòng khám (Room Stats)
        List<ExaminationRoom> rooms = examinationRoomRepository.findAll();
        List<WorkSchedule> todaySchedules = workScheduleRepository.findByWorkDate(today);
        Map<Long, String> roomDoctorMap = new HashMap<>();
        for (WorkSchedule ws : todaySchedules) {
            if (ws.getExaminationRoom() != null && ws.getDoctor() != null) {
                roomDoctorMap.put(ws.getExaminationRoom().getId(), ws.getDoctor().getFullName());
            }
        }

        List<RoomStatDto> roomStats = new ArrayList<>();
        for (ExaminationRoom room : rooms) {
            List<QueueTicket> roomTickets = allTickets.stream()
                    .filter(t -> t.getExaminationRoom() != null && room.getId().equals(t.getExaminationRoom().getId()))
                    .collect(Collectors.toList());

            long rTotal = roomTickets.size();
            long rComp = roomTickets.stream()
                    .filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus()))
                    .count();
            long rWaiting = roomTickets.stream()
                    .filter(t -> today.equals(t.getTicketDate()) && "WAITING".equalsIgnoreCase(t.getStatus()))
                    .count();

            double rAvgWait = calculateAverageWaitMinutes(roomTickets);
            double utilizationRate = (rTotal > 0) ? Math.round(((rComp * 100.0) / rTotal) * 10.0) / 10.0 : 0.0;

            String activeDoctor = roomDoctorMap.getOrDefault(room.getId(), "Chưa phân công");

            roomStats.add(RoomStatDto.builder()
                    .roomId(room.getId())
                    .roomNumber(room.getRoomNumber())
                    .roomName(room.getRoomName())
                    .floor(room.getFloor())
                    .activeDoctorName(activeDoctor)
                    .specialtyName(room.getRoomName())
                    .totalTickets(rTotal)
                    .completedCount(rComp)
                    .waitingCount(rWaiting)
                    .avgWaitingMinutes(rAvgWait)
                    .utilizationRate(utilizationRate)
                    .build());
        }

        return DashboardOverviewResponse.builder()
                .period(safePeriod)
                .fromDate(fromDate)
                .toDate(toDate)
                .totalTickets(totalTickets)
                .totalExaminationsCompleted(totalCompleted)
                .todayTickets(todayTickets)
                .todayCompleted(todayCompleted)
                .avgWaitingMinutes(avgWaitingMinutes)
                .waitTimeAssessment(waitTimeAssessment)
                .totalAppointments(totalAppointments)
                .confirmedAppointments(confirmedAppointments)
                .completedAppointments(completedAppointments)
                .cancelledAppointments(cancelledAppointments)
                .cancellationRate(cancellationRate)
                .statusDistribution(statusDistribution)
                .dailyStats(dailyStats)
                .roomStats(roomStats)
                .build();
    }

    private double calculateAverageWaitMinutes(List<QueueTicket> tickets) {
        if (tickets == null || tickets.isEmpty()) {
            return 0.0;
        }

        List<Long> waitDurations = new ArrayList<>();
        for (QueueTicket t : tickets) {
            LocalTime checkIn = t.getCheckInTime();
            LocalTime callOrStart = (t.getStartTime() != null) ? t.getStartTime() : t.getCallTime();

            if (checkIn != null && callOrStart != null) {
                long minutes = Duration.between(checkIn, callOrStart).toMinutes();
                if (minutes >= 0 && minutes <= 360) {
                    waitDurations.add(minutes);
                    continue;
                }
            }

            // Nếu chưa có giờ gọi cụ thể nhưng đã có ước tính thời gian chờ
            if (t.getEstimatedWaitingMinutes() != null && t.getEstimatedWaitingMinutes() > 0) {
                waitDurations.add(t.getEstimatedWaitingMinutes().longValue());
            }
        }

        if (waitDurations.isEmpty()) {
            return 15.0; // Giá trị tham chiếu mặc định trung bình ngành y tế nếu chưa có ca kết thúc
        }

        double sum = 0;
        for (Long m : waitDurations) {
            sum += m;
        }
        double avg = sum / waitDurations.size();
        return Math.round(avg * 10.0) / 10.0;
    }

    private String getDayOfWeekVietnamese(DayOfWeek dow) {
        switch (dow) {
            case MONDAY: return "Thứ 2";
            case TUESDAY: return "Thứ 3";
            case WEDNESDAY: return "Thứ 4";
            case THURSDAY: return "Thứ 5";
            case FRIDAY: return "Thứ 6";
            case SATURDAY: return "Thứ 7";
            case SUNDAY: return "Chủ nhật";
            default: return dow.toString();
        }
    }
}
