package com.demo.be.email.scheduler;

import com.demo.be.email.service.EmailService;
import com.demo.be.model.Appointment;
import com.demo.be.model.Doctor;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.Patient;
import com.demo.be.model.WorkSchedule;
import com.demo.be.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AppointmentReminderScheduler {

    private final AppointmentRepository appointmentRepository;
    private final EmailService emailService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Tự động quét và gửi email nhắc lịch khám cho các bệnh nhân có lịch hẹn trong ngày hôm nay.
     * Mặc định kích hoạt lúc 07:00 sáng hàng ngày.
     */
    @Scheduled(cron = "${app.mail.reminder-cron:0 0 7 * * ?}")
    @Transactional(readOnly = true)
    public void sendDailyAppointmentReminders() {
        LocalDate today = LocalDate.now();
        List<Appointment> todayAppointments = appointmentRepository
                .findByAppointmentDateAndStatusIn(today, List.of("CONFIRMED", "PENDING"));

        if (todayAppointments.isEmpty()) {
            log.info("-> [SCHEDULER] Không có lịch hẹn khám nào cần gửi nhắc nhở trong ngày hôm nay ({})", today);
            return;
        }

        log.info("-> [SCHEDULER] Bắt đầu gửi email nhắc lịch cho {} bệnh nhân trong ngày hôm nay ({})", 
                todayAppointments.size(), today);

        int sentCount = 0;
        for (Appointment appointment : todayAppointments) {
            Patient patient = appointment.getPatient();
            if (patient == null || patient.getUser() == null || patient.getUser().getEmail() == null || patient.getUser().getEmail().isBlank()) {
                continue;
            }

            Doctor doctor = appointment.getDoctor();
            WorkSchedule schedule = appointment.getWorkSchedule();
            ExaminationRoom room = schedule != null ? schedule.getExaminationRoom() : null;

            Map<String, Object> vars = new HashMap<>();
            vars.put("patientName", patient.getFullName());
            vars.put("appointmentCode", appointment.getAppointmentCode());
            vars.put("bookingNumber", appointment.getBookingNumber() != null ? appointment.getBookingNumber() : 1);
            vars.put("doctorName", doctor != null ? doctor.getFullName() : "Bác sĩ phụ trách");
            vars.put("specialtyName", (doctor != null && doctor.getSpecialty() != null) ? doctor.getSpecialty().getName() : "Khám đa khoa");
            vars.put("roomNumber", room != null ? room.getRoomNumber() : "Quầy lễ tân");
            vars.put("estimatedTime", appointment.getEstimatedStartTime() != null ? appointment.getEstimatedStartTime().format(TIME_FMT) : "Giờ làm việc");

            String subject = "[SmartClinic] Nhắc nhở lịch hẹn khám bệnh hôm nay - Mã số: " + appointment.getAppointmentCode();
            emailService.sendHtmlMail(patient.getUser().getEmail(), subject, "appointment-reminder", vars);
            sentCount++;
        }

        log.info("-> [SCHEDULER] Đã kích hoạt tiến trình gửi email nhắc lịch cho {}/{} bệnh nhân", 
                sentCount, todayAppointments.size());
    }
}

