package com.demo.be.email;

import com.demo.be.email.event.AppointmentBookedEvent;
import com.demo.be.email.event.AppointmentCancelledEvent;
import com.demo.be.email.event.MedicalRecordCompletedEvent;
import com.demo.be.email.listener.EmailEventListener;
import com.demo.be.email.scheduler.AppointmentReminderScheduler;
import com.demo.be.email.service.EmailService;
import com.demo.be.email.service.impl.EmailServiceImpl;
import com.demo.be.model.*;
import com.demo.be.repository.AppointmentRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock private JavaMailSender mailSender;
    @Mock private SpringTemplateEngine templateEngine;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private EmailService emailService;
    @Mock private MimeMessage mimeMessage;

    @InjectMocks
    private EmailServiceImpl service;

    private Patient patient;
    private Doctor doctor;
    private Appointment appointment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "fromAddress", "test@clinic.com");
        ReflectionTestUtils.setField(service, "fromName", "SmartClinic");
        ReflectionTestUtils.setField(service, "mailEnabled", true);

        User patientUser = User.builder().id(1L).email("patient@example.com").build();
        patient = Patient.builder().id(10L).fullName("Nguyễn Văn An").user(patientUser).build();
        doctor = Doctor.builder().id(20L).fullName("BS. Nguyễn Văn Hùng").build();

        appointment = Appointment.builder()
                .id(100L)
                .appointmentCode("LH261113-0001")
                .bookingNumber(1)
                .appointmentDate(LocalDate.now())
                .estimatedStartTime(LocalTime.of(8, 30))
                .patient(patient)
                .doctor(doctor)
                .status("CONFIRMED")
                .build();
    }

    @Test
    void sendHtmlMail_success() {
        when(templateEngine.process(eq("email/test-template"), any(Context.class)))
                .thenReturn("<html><body>Test Email Content</body></html>");
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        service.sendHtmlMail("patient@example.com", "Xác nhận lịch hẹn", "test-template", Map.of("key", "val"));

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void sendHtmlMail_disabled_doesNotSend() {
        ReflectionTestUtils.setField(service, "mailEnabled", false);
        when(templateEngine.process(eq("email/test-template"), any(Context.class)))
                .thenReturn("<html><body>Mock Content</body></html>");

        service.sendHtmlMail("patient@example.com", "Test", "test-template", Collections.emptyMap());

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendHtmlMail_emptyRecipient_skips() {
        service.sendHtmlMail("", "Test", "test-template", Collections.emptyMap());
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void sendMailWithPdfAttachment_success() {
        when(templateEngine.process(eq("email/medical-record-completed"), any(Context.class)))
                .thenReturn("<html><body>Don thuoc</body></html>");
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        byte[] samplePdf = "Sample PDF Content".getBytes();
        service.sendMailWithPdfAttachment("patient@example.com", "Đơn thuốc", "medical-record-completed", 
                Map.of("key", "val"), "don-thuoc.pdf", samplePdf);

        verify(mailSender).send(mimeMessage);
    }

    @Test
    void emailEventListener_handleAppointmentBooked_invokesEmailService() {
        EmailEventListener listener = new EmailEventListener(emailService);

        listener.handleAppointmentBooked(new AppointmentBookedEvent(appointment));

        verify(emailService).sendHtmlMail(eq("patient@example.com"), contains("LH261113-0001"), 
                eq("appointment-confirmation"), anyMap());
    }

    @Test
    void emailEventListener_handleAppointmentCancelled_invokesEmailService() {
        EmailEventListener listener = new EmailEventListener(emailService);

        listener.handleAppointmentCancelled(new AppointmentCancelledEvent(appointment, "Bác sĩ bận"));

        verify(emailService).sendHtmlMail(eq("patient@example.com"), contains("LH261113-0001"), 
                eq("appointment-cancelled"), anyMap());
    }

    @Test
    void emailEventListener_handleMedicalRecordCompleted_invokesEmailService() {
        EmailEventListener listener = new EmailEventListener(emailService);

        MedicalRecord record = MedicalRecord.builder()
                .id(500L)
                .patient(patient)
                .doctor(doctor)
                .finalDiagnosis("Viêm họng cấp")
                .build();
        byte[] pdfBytes = "PDF Bytes".getBytes();

        listener.handleMedicalRecordCompleted(new MedicalRecordCompletedEvent(record, pdfBytes));

        verify(emailService).sendMailWithPdfAttachment(eq("patient@example.com"), contains("Nguyễn Văn An"), 
                eq("medical-record-completed"), anyMap(), contains("500.pdf"), eq(pdfBytes));
    }

    @Test
    void appointmentReminderScheduler_sendDailyReminders_invokesEmailService() {
        AppointmentReminderScheduler scheduler = new AppointmentReminderScheduler(appointmentRepository, emailService);

        when(appointmentRepository.findByAppointmentDateAndStatusIn(any(LocalDate.class), anyList()))
                .thenReturn(List.of(appointment));

        scheduler.sendDailyAppointmentReminders();

        verify(emailService).sendHtmlMail(eq("patient@example.com"), contains("LH261113-0001"), 
                eq("appointment-reminder"), anyMap());
    }
}

