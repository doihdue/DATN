package com.demo.be.service;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.MyTicketStatusResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.impl.QueueServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueueServiceCheckInTest {

    @Mock private QueueTicketRepository queueTicketRepository;
    @Mock private ExaminationRoomRepository examinationRoomRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private UserRepository userRepository;
    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private com.demo.be.security.AccessGuard accessGuard;

    @InjectMocks
    private QueueServiceImpl service;

    private ExaminationRoom room;
    private Doctor morningDoctor;
    private Doctor afternoonDoctor;
    private Patient patient;

    @BeforeEach
    void setUp() {
        room = ExaminationRoom.builder().id(3L).roomNumber("P.101").build();
        morningDoctor = Doctor.builder().id(1L).fullName("BS. Ca Trước").build();
        afternoonDoctor = Doctor.builder().id(2L).fullName("BS. Ca Hiện Tại").build();
        patient = Patient.builder().id(10L).fullName("Nguyễn Văn Nam").emergencyContactPhone("0901234567").build();
    }

    private CheckInRequest request(String name) {
        return CheckInRequest.builder()
                .patientName(name)
                .patientPhone("0901234567")
                .examinationRoomId(room.getId())
                .build();
    }

    private WorkSchedule shift(Doctor doctor, LocalTime start, LocalTime end, String status) {
        return WorkSchedule.builder().doctor(doctor).examinationRoom(room)
                .workDate(LocalDate.now()).startTime(start).endTime(end).status(status).build();
    }

    // Phòng có 1 ca đang diễn ra (của afternoonDoctor)
    private void stubRoomWithCurrentShift() {
        LocalTime now = LocalTime.now();
        // Giữ ca trong cùng một ngày: cộng / trừ giờ gần nửa đêm sẽ quay vòng và làm ca "đã kết thúc"
        LocalTime start = now.isBefore(LocalTime.of(0, 30)) ? LocalTime.MIDNIGHT : now.minusMinutes(30);
        LocalTime end = now.isAfter(LocalTime.of(22, 29)) ? LocalTime.MAX : now.plusMinutes(90);
        when(examinationRoomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(room.getId()), any()))
                .thenReturn(List.of(shift(afternoonDoctor, start, end, "AVAILABLE")));
    }

    private void stubSaveTicket() {
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> {
            QueueTicket t = inv.getArgument(0);
            t.setId(500L);
            return t;
        });
    }

    @Test
    void assignsDoctorOfCurrentShift_notTheFirstShiftOfTheDay() {
        // Tránh ca bị tràn qua nửa đêm khi cộng/trừ giờ
        LocalTime now = LocalTime.now();
        assumeTrue(now.getHour() >= 4 && now.getHour() <= 21);

        when(examinationRoomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(room.getId()), any())).thenReturn(List.of(
                shift(morningDoctor, now.minusHours(4), now.minusHours(1), "AVAILABLE"),     // ca đã kết thúc
                shift(afternoonDoctor, now.minusMinutes(30), now.plusHours(2), "AVAILABLE") // ca đang trực
        ));
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        stubSaveTicket();

        QueueTicketResponse res = service.checkIn(request("Nguyễn Văn Nam"));

        assertThat(res.getDoctorId()).isEqualTo(afternoonDoctor.getId());
    }

    @Test
    void rejectsRoomWithoutRemainingShiftToday() {
        LocalTime now = LocalTime.now();
        assumeTrue(now.getHour() >= 4);

        when(examinationRoomRepository.findByIdForUpdate(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(room.getId()), any())).thenReturn(List.of(
                shift(morningDoctor, now.minusHours(4), now.minusHours(1), "AVAILABLE"),   // đã hết ca
                shift(afternoonDoctor, now.minusHours(1), now.plusHours(3), "CANCELLED")  // ca bị huỷ
        ));

        assertThatThrownBy(() -> service.checkIn(request("Nguyễn Văn Nam")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không còn ca trực");
        verify(queueTicketRepository, never()).save(any());
    }

    @Test
    void rejectsSecondActiveTicketForSamePatientToday() {
        stubRoomWithCurrentShift();
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        QueueTicket existing = QueueTicket.builder().id(1L).ticketNumber("P101-002")
                .examinationRoom(room).status("WAITING").build();
        when(queueTicketRepository.findPatientActiveTickets(any(), eq(10L), any()))
                .thenReturn(List.of(existing));

        assertThatThrownBy(() -> service.checkIn(request("Nguyễn Văn Nam")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã có số P101-002");
        verify(queueTicketRepository, never()).save(any());
    }

    @Test
    void nextTicketNumberFollowsHighestIssuedNumber_soTransferredTicketsDoNotCauseDuplicates() {
        stubRoomWithCurrentShift();
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        // P101-002 đã chuyển sang phòng khác: phòng chỉ còn 2 vé, nhưng số 003 đã được cấp
        when(queueTicketRepository.findTicketNumbersByDateAndPrefix(any(), eq("P101-")))
                .thenReturn(List.of("P101-001", "P101-002", "P101-003"));
        stubSaveTicket();

        QueueTicketResponse res = service.checkIn(request("Nguyễn Văn Nam"));

        assertThat(res.getTicketNumber()).isEqualTo("P101-004");
    }

    @Test
    void familyMemberSharingPhone_getsOwnPatientRecord_andParentNameIsUntouched() {
        stubRoomWithCurrentShift();
        Patient parent = Patient.builder().id(10L).fullName("Nguyễn Văn Nam").emergencyContactPhone("0901234567").build();
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(parent));
        when(patientRepository.save(any(Patient.class))).thenAnswer(inv -> {
            Patient p = inv.getArgument(0);
            p.setId(11L);
            return p;
        });
        stubSaveTicket();

        QueueTicketResponse res = service.checkIn(request("Nguyễn Bé Na"));

        ArgumentCaptor<Patient> created = ArgumentCaptor.forClass(Patient.class);
        verify(patientRepository).save(created.capture());
        assertThat(created.getValue().getFullName()).isEqualTo("Nguyễn Bé Na");
        assertThat(parent.getFullName()).isEqualTo("Nguyễn Văn Nam");
        assertThat(res.getPatientId()).isEqualTo(11L);
    }

    // ================= Bệnh nhân tự lấy số online & kiểm tra lịch hẹn =================

    // Lưu vé và cho phép tra lại đúng vé vừa lưu theo số vé (selfCheckIn trả về trạng thái phiếu)
    private QueueTicket[] stubSaveAndLookupTicket() {
        QueueTicket[] holder = new QueueTicket[1];
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> {
            QueueTicket t = inv.getArgument(0);
            t.setId(500L);
            holder[0] = t;
            return t;
        });
        when(queueTicketRepository.findByTicketNumberAndTicketDate(anyString(), any()))
                .thenAnswer(inv -> Optional.ofNullable(holder[0]));
        return holder;
    }

    @Test
    void selfCheckIn_ignoresPrivilegedFields_andDoesNotEditExistingPatient() {
        LocalTime now = LocalTime.now();
        assumeTrue(now.getHour() >= 1 && now.isBefore(LocalTime.of(22, 25))); // ca giả lập kéo dài tới now + 90 phút
        stubRoomWithCurrentShift();
        patient.setDateOfBirth(LocalDate.of(1985, 3, 3));
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        QueueTicket[] saved = stubSaveAndLookupTicket();

        CheckInRequest req = request("Nguyễn Văn Nam");
        req.setPatientId(99L);
        req.setDoctorId(morningDoctor.getId());
        req.setAppointmentId(7L);
        req.setIsEmergency(true);
        req.setPatientDob(LocalDate.of(1990, 1, 1));

        MyTicketStatusResponse res = service.selfCheckIn(req);

        QueueTicket ticket = saved[0];
        assertThat(ticket.getIsEmergency()).isFalse();
        assertThat(ticket.getHasAppointment()).isFalse();
        assertThat(ticket.getPriorityScore()).isZero();
        assertThat(ticket.getDoctor()).isEqualTo(afternoonDoctor);
        assertThat(ticket.getPatient()).isSameAs(patient);
        // Hồ sơ có sẵn không bị sửa ngày sinh qua endpoint công khai
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1985, 3, 3));
        verify(patientRepository, never()).findById(any());
        verify(patientRepository, never()).save(any());
        verifyNoInteractions(appointmentRepository);
        // Người chưa đăng nhập chỉ thấy tên đã che
        assertThat(res.getPatientName()).isEqualTo("Nguyễn V. Nam");
    }

    @Test
    void staffCheckIn_appointmentOfAnotherPatient_isRejected() {
        LocalTime now = LocalTime.now();
        assumeTrue(now.getHour() >= 1 && now.isBefore(LocalTime.of(22, 25))); // ca giả lập kéo dài tới now + 90 phút
        stubRoomWithCurrentShift();
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        Patient someoneElse = Patient.builder().id(77L).fullName("Người Khác").build();
        when(appointmentRepository.findById(7L)).thenReturn(Optional.of(Appointment.builder()
                .id(7L).appointmentCode("LH-007").patient(someoneElse)
                .appointmentDate(LocalDate.now()).status("CONFIRMED").build()));

        CheckInRequest req = request("Nguyễn Văn Nam");
        req.setAppointmentId(7L);

        assertThatThrownBy(() -> service.checkIn(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không hợp lệ");
        verify(queueTicketRepository, never()).save(any());
    }

    @Test
    void staffCheckIn_validAppointment_addsAppointmentPriority() {
        LocalTime now = LocalTime.now();
        assumeTrue(now.getHour() >= 1 && now.isBefore(LocalTime.of(22, 25))); // ca giả lập kéo dài tới now + 90 phút
        stubRoomWithCurrentShift();
        when(patientRepository.findByPhoneNumber("0901234567")).thenReturn(List.of(patient));
        when(appointmentRepository.findById(7L)).thenReturn(Optional.of(Appointment.builder()
                .id(7L).appointmentCode("LH-007").patient(patient)
                .appointmentDate(LocalDate.now()).status("CONFIRMED").build()));
        stubSaveTicket();

        CheckInRequest req = request("Nguyễn Văn Nam");
        req.setAppointmentId(7L);

        QueueTicketResponse res = service.checkIn(req);

        assertThat(res.getPriorityScore()).isEqualTo(20);
    }
}
