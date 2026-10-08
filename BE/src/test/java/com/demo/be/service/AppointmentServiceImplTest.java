package com.demo.be.service;

import com.demo.be.dto.request.BookAppointmentRequest;
import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.AppointmentResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.exception.AppException;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.impl.AppointmentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceImplTest {

    private static final Long USER_ID = 1L;

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private UserRepository userRepository;
    @Mock private QueueTicketRepository queueTicketRepository;
    @Mock private WorkScheduleService workScheduleService;
    @Mock private QueueService queueService;

    @InjectMocks
    private AppointmentServiceImpl service;

    private Patient patient;
    private Doctor doctor;
    private ExaminationRoom room;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "changeDeadlineHours", 2);
        ReflectionTestUtils.setField(service, "maxDaysAhead", 30);

        patient = Patient.builder().id(10L).fullName("Nguyễn Văn Nam").emergencyContactPhone("0901234567").build();
        doctor = Doctor.builder().id(5L).fullName("BS. Trần Hùng").build();
        room = ExaminationRoom.builder().id(3L).roomNumber("P.101").build();
    }

    private void stubCurrentPatient() {
        User user = User.builder().id(USER_ID).person(patient).build();
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
    }

    private WorkSchedule schedule(LocalDate date, int max, int booked, String status) {
        return WorkSchedule.builder()
                .id(7L)
                .doctor(doctor)
                .examinationRoom(room)
                .workDate(date)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(9, 30))
                .maxPatients(max)
                .currentBookedCount(booked)
                .status(status)
                .build();
    }

    private Appointment appointment(WorkSchedule ws, int bookingNumber, String status) {
        return Appointment.builder()
                .id(42L)
                .appointmentCode("LH-TEST")
                .patient(patient)
                .doctor(doctor)
                .workSchedule(ws)
                .appointmentDate(ws.getWorkDate())
                .bookingNumber(bookingNumber)
                .estimatedStartTime(ws.getStartTime())
                .status(status)
                .build();
    }

    @Test
    void book_reusesLowestFreeNumber_estimatesTime_andMarksScheduleFull() {
        LocalDate date = LocalDate.now().plusDays(3);
        WorkSchedule ws = schedule(date, 3, 2, "AVAILABLE");
        stubCurrentPatient();
        when(workScheduleRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(ws));
        when(appointmentRepository.existsActiveForPatientDoctorDate(any(), any(), any(), any(), isNull())).thenReturn(false);
        // Số 2 đã bị huỷ trước đó nên còn trống
        when(appointmentRepository.findByWorkScheduleIdAndStatusIn(eq(7L), any()))
                .thenReturn(List.of(appointment(ws, 1, "CONFIRMED"), appointment(ws, 3, "PENDING")));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> {
            Appointment a = inv.getArgument(0);
            a.setId(42L);
            return a;
        });

        AppointmentResponse res = service.bookAppointment(USER_ID,
                BookAppointmentRequest.builder().workScheduleId(7L).reasonForVisit("  Ho khan  ").build());

        assertThat(res.getBookingNumber()).isEqualTo(2);
        // Ca 90 phút / 3 người = 30 phút mỗi lượt -> số 2 khám lúc 08:30
        assertThat(res.getEstimatedStartTime()).isEqualTo(LocalTime.of(8, 30));
        assertThat(res.getStatus()).isEqualTo("PENDING");
        assertThat(res.getReasonForVisit()).isEqualTo("Ho khan");
        assertThat(res.getAppointmentCode())
                .isEqualTo("LH" + date.format(DateTimeFormatter.ofPattern("yyMMdd")) + "-0042");
        assertThat(ws.getCurrentBookedCount()).isEqualTo(3);
        assertThat(ws.getStatus()).isEqualTo("FULL");
    }

    @Test
    void book_rejectsWhenScheduleIsFull() {
        WorkSchedule ws = schedule(LocalDate.now().plusDays(1), 2, 2, "AVAILABLE");
        stubCurrentPatient();
        when(workScheduleRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(ws));

        assertThatThrownBy(() -> service.bookAppointment(USER_ID,
                BookAppointmentRequest.builder().workScheduleId(7L).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đủ số lượng");
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    void book_rejectsCancelledOrPastSchedule() {
        stubCurrentPatient();
        when(workScheduleRepository.findByIdForUpdate(7L))
                .thenReturn(Optional.of(schedule(LocalDate.now().plusDays(1), 5, 0, "CANCELLED")));
        assertThatThrownBy(() -> service.bookAppointment(USER_ID,
                BookAppointmentRequest.builder().workScheduleId(7L).build()))
                .isInstanceOf(BadRequestException.class);

        when(workScheduleRepository.findByIdForUpdate(7L))
                .thenReturn(Optional.of(schedule(LocalDate.now().minusDays(1), 5, 0, "AVAILABLE")));
        assertThatThrownBy(() -> service.bookAppointment(USER_ID,
                BookAppointmentRequest.builder().workScheduleId(7L).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã kết thúc");
    }

    @Test
    void book_rejectsSecondBookingWithSameDoctorSameDay() {
        WorkSchedule ws = schedule(LocalDate.now().plusDays(2), 5, 1, "AVAILABLE");
        stubCurrentPatient();
        when(workScheduleRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(ws));
        when(appointmentRepository.existsActiveForPatientDoctorDate(eq(10L), eq(5L), eq(ws.getWorkDate()), any(), isNull()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.bookAppointment(USER_ID,
                BookAppointmentRequest.builder().workScheduleId(7L).build()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã có lịch hẹn");
    }

    @Test
    void patientCancel_afterDeadline_isRejected_butStaffCanCancelAndSlotIsReleased() {
        // Ca hôm nay, giờ khám dự kiến còn < 2 tiếng -> quá hạn tự huỷ
        WorkSchedule ws = schedule(LocalDate.now(), 2, 2, "FULL");
        Appointment appt = appointment(ws, 1, "CONFIRMED");
        appt.setEstimatedStartTime(LocalTime.now().plusMinutes(30).withNano(0));
        when(appointmentRepository.findById(42L)).thenReturn(Optional.of(appt));
        stubCurrentPatient();

        assertThatThrownBy(() -> service.cancelAppointment(42L, USER_ID, false, null))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("quá hạn");

        when(workScheduleRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(ws));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(inv -> inv.getArgument(0));

        AppointmentResponse res = service.cancelAppointment(42L, 99L, true, "Bệnh nhân gọi điện huỷ");

        assertThat(res.getStatus()).isEqualTo("CANCELLED");
        assertThat(res.getCancellationReason()).isEqualTo("Bệnh nhân gọi điện huỷ");
        assertThat(ws.getCurrentBookedCount()).isEqualTo(1);
        assertThat(ws.getStatus()).isEqualTo("AVAILABLE");
    }

    @Test
    void patientCannotTouchSomeoneElsesAppointment() {
        Patient other = Patient.builder().id(77L).fullName("Người khác").build();
        Appointment appt = appointment(schedule(LocalDate.now().plusDays(5), 5, 1, "AVAILABLE"), 1, "PENDING");
        appt.setPatient(other);
        when(appointmentRepository.findById(42L)).thenReturn(Optional.of(appt));
        stubCurrentPatient();

        assertThatThrownBy(() -> service.cancelAppointment(42L, USER_ID, false, null))
                .isInstanceOf(AppException.class)
                .satisfies(ex -> assertThat(((AppException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
        assertThatThrownBy(() -> service.getAppointmentById(42L, USER_ID, false))
                .isInstanceOf(AppException.class);
    }

    @Test
    void checkIn_onlyAllowedOnAppointmentDate() {
        Appointment appt = appointment(schedule(LocalDate.now().plusDays(1), 5, 1, "AVAILABLE"), 1, "CONFIRMED");
        when(appointmentRepository.findById(42L)).thenReturn(Optional.of(appt));

        assertThatThrownBy(() -> service.checkInAppointment(42L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đúng ngày hẹn");
        verifyNoInteractions(queueService);
    }

    @Test
    void checkIn_issuesQueueTicketForScheduleRoomAndLinksIt() {
        Appointment appt = appointment(schedule(LocalDate.now(), 5, 1, "AVAILABLE"), 1, "CONFIRMED");
        when(appointmentRepository.findById(42L)).thenReturn(Optional.of(appt));
        when(queueService.checkIn(any())).thenReturn(QueueTicketResponse.builder().id(500L).ticketNumber("P101-004").build());
        QueueTicket ticket = QueueTicket.builder().id(500L).ticketNumber("P101-004").build();
        when(queueTicketRepository.findById(500L)).thenReturn(Optional.of(ticket));

        QueueTicketResponse res = service.checkInAppointment(42L);

        ArgumentCaptor<CheckInRequest> captor = ArgumentCaptor.forClass(CheckInRequest.class);
        verify(queueService).checkIn(captor.capture());
        CheckInRequest sent = captor.getValue();
        assertThat(sent.getAppointmentId()).isEqualTo(42L);
        assertThat(sent.getPatientId()).isEqualTo(10L);
        assertThat(sent.getExaminationRoomId()).isEqualTo(3L);
        assertThat(sent.getDoctorId()).isEqualTo(5L);
        assertThat(sent.getPatientPhone()).isEqualTo("0901234567");

        assertThat(res.getTicketNumber()).isEqualTo("P101-004");
        assertThat(appt.getStatus()).isEqualTo("CHECKED_IN");
        assertThat(appt.getQueueTicket()).isSameAs(ticket);
    }
}
