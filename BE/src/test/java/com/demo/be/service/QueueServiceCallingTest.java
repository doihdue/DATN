package com.demo.be.service;

import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.impl.QueueServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class QueueServiceCallingTest {

    @Mock private QueueTicketRepository queueTicketRepository;
    @Mock private ExaminationRoomRepository examinationRoomRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private UserRepository userRepository;
    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private QueueServiceImpl service;

    private ExaminationRoom room;
    private Doctor doctor;
    private Patient patient;
    private QueueTicket waitingTicket;

    @BeforeEach
    void setUp() {
        room = ExaminationRoom.builder().id(1L).roomNumber("P.101").roomName("Phòng khám Nội 1").build();
        doctor = Doctor.builder().id(10L).fullName("BS.CKII Nguyễn Văn Hùng").build();
        patient = Patient.builder().id(20L).fullName("Trần Thị Mai").emergencyContactPhone("0912345678").build();

        waitingTicket = QueueTicket.builder()
                .id(100L)
                .ticketNumber("P101-001")
                .ticketDate(LocalDate.now())
                .examinationRoom(room)
                .doctor(doctor)
                .patient(patient)
                .patientName(patient.getFullName())
                .patientPhone(patient.getEmergencyContactPhone())
                .status("WAITING")
                .priorityScore(10)
                .checkInTime(LocalTime.of(8, 0))
                .isEmergency(false)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockCurrentDoctor() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getName()).thenReturn("dr_hung");

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);

        User user = User.builder().username("dr_hung").person(doctor).build();
        when(userRepository.findByUsername("dr_hung")).thenReturn(Optional.of(user));
    }

    private void mockDoctorOnDuty(Long roomId) {
        WorkSchedule shift = WorkSchedule.builder()
                .id(50L)
                .doctor(doctor)
                .examinationRoom(room)
                .workDate(LocalDate.now())
                .startTime(LocalTime.of(7, 30))
                .endTime(LocalTime.of(12, 0))
                .status("AVAILABLE")
                .build();
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(roomId), eq(LocalDate.now())))
                .thenReturn(List.of(shift));
    }

    @Test
    void callNext_success() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        // Không có ai đang CALLED
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "CALLED"))
                .thenReturn(Collections.emptyList());
        // Danh sách chờ có 1 bệnh nhân
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "WAITING"))
                .thenReturn(List.of(waitingTicket));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.callNext(room.getId());

        assertThat(res).isNotNull();
        assertThat(res.getStatus()).isEqualTo("CALLED");
        assertThat(res.getCallTime()).isNotNull();
        assertThat(res.getTicketNumber()).isEqualTo("P101-001");
        verify(queueTicketRepository).save(waitingTicket);
    }

    @Test
    void callNext_queueEmpty_throwsBadRequestException() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "CALLED"))
                .thenReturn(Collections.emptyList());
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "WAITING"))
                .thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.callNext(room.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không còn bệnh nhân nào đang chờ");
    }

    @Test
    void callNext_ticketAlreadyBeingCalled_throwsBadRequestException() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        QueueTicket currentlyCalled = QueueTicket.builder()
                .id(99L).ticketNumber("P101-000").status("CALLED").build();

        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "CALLED"))
                .thenReturn(List.of(currentlyCalled));

        assertThatThrownBy(() -> service.callNext(room.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đang được mời vào phòng");
    }

    @Test
    void callNext_doctorNotOnDuty_throwsBadRequestException() {
        mockCurrentDoctor();
        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        // Phòng không có ca trực của bác sĩ này
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(room.getId()), eq(LocalDate.now())))
                .thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.callNext(room.getId()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn không có ca trực hôm nay");
    }

    @Test
    void startExamination_success() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        QueueTicket calledTicket = QueueTicket.builder()
                .id(101L)
                .ticketNumber("P101-002")
                .examinationRoom(room)
                .status("CALLED")
                .build();

        when(queueTicketRepository.findById(101L)).thenReturn(Optional.of(calledTicket));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.startExamination(101L);

        assertThat(res.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(res.getStartTime()).isNotNull();
        verify(queueTicketRepository).save(calledTicket);
    }

    @Test
    void skipTicket_success() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        QueueTicket calledTicket = QueueTicket.builder()
                .id(102L)
                .ticketNumber("P101-003")
                .examinationRoom(room)
                .status("CALLED")
                .build();

        when(queueTicketRepository.findById(102L)).thenReturn(Optional.of(calledTicket));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.skipTicket(102L);

        assertThat(res.getStatus()).isEqualTo("SKIPPED");
        verify(queueTicketRepository).save(calledTicket);
    }

    @Test
    void skipTicket_wrongStatus_throwsBadRequestException() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        // Vé đang ở trạng thái WAITING chứ chưa CALLED
        waitingTicket.setStatus("WAITING");
        when(queueTicketRepository.findById(100L)).thenReturn(Optional.of(waitingTicket));

        assertThatThrownBy(() -> service.skipTicket(100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ có thể đánh dấu vắng mặt cho số đang được gọi");
    }

    @Test
    void recallTicket_success() {
        mockCurrentDoctor();
        mockDoctorOnDuty(room.getId());

        QueueTicket skippedTicket = QueueTicket.builder()
                .id(103L)
                .ticketNumber("P101-004")
                .ticketDate(LocalDate.now())
                .examinationRoom(room)
                .status("SKIPPED")
                .build();

        when(queueTicketRepository.findById(103L)).thenReturn(Optional.of(skippedTicket));
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "CALLED"))
                .thenReturn(Collections.emptyList());
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.recallTicket(103L);

        assertThat(res.getStatus()).isEqualTo("CALLED");
        assertThat(res.getCallTime()).isNotNull();
        verify(queueTicketRepository).save(skippedTicket);
    }

    @Test
    void requeueTicket_success_elevatesPriorityScore() {
        QueueTicket skippedTicket = QueueTicket.builder()
                .id(104L)
                .ticketNumber("P101-005")
                .ticketDate(LocalDate.now())
                .examinationRoom(room)
                .status("SKIPPED")
                .priorityScore(5)
                .isEmergency(false)
                .build();

        QueueTicket waitingNormal = QueueTicket.builder()
                .id(105L)
                .isEmergency(false)
                .priorityScore(12)
                .status("WAITING")
                .build();

        when(queueTicketRepository.findById(104L)).thenReturn(Optional.of(skippedTicket));
        when(queueTicketRepository.findRoomQueueByStatus(LocalDate.now(), room.getId(), "WAITING"))
                .thenReturn(List.of(waitingNormal));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.requeueTicket(104L);

        assertThat(res.getStatus()).isEqualTo("WAITING");
        // Điểm ưu tiên mới phải lớn hơn điểm của bệnh nhân thường cao nhất (12 + 1 = 13)
        assertThat(res.getPriorityScore()).isGreaterThanOrEqualTo(13);
        verify(queueTicketRepository).save(skippedTicket);
    }

    @Test
    void setEmergency_success() {
        when(queueTicketRepository.findById(100L)).thenReturn(Optional.of(waitingTicket));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        int initialScore = waitingTicket.getPriorityScore();
        QueueTicketResponse res = service.setEmergency(100L);

        assertThat(res.getIsEmergency()).isTrue();
        assertThat(res.getPriorityScore()).isEqualTo(initialScore + 100);
        verify(queueTicketRepository).save(waitingTicket);
    }

    @Test
    void transferTicket_success() {
        ExaminationRoom targetRoom = ExaminationRoom.builder().id(2L).roomNumber("P.102").build();
        Doctor targetDoctor = Doctor.builder().id(11L).fullName("BS.CKI Trần Thị Mai Hoa").build();
        WorkSchedule targetShift = WorkSchedule.builder()
                .id(51L).doctor(targetDoctor).examinationRoom(targetRoom)
                .workDate(LocalDate.now()).startTime(LocalTime.MIN).endTime(LocalTime.MAX)
                .status("AVAILABLE").build();

        when(queueTicketRepository.findById(100L)).thenReturn(Optional.of(waitingTicket));
        when(examinationRoomRepository.findById(2L)).thenReturn(Optional.of(targetRoom));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(2L), any(LocalDate.class)))
                .thenReturn(List.of(targetShift));
        when(queueTicketRepository.save(any(QueueTicket.class))).thenAnswer(inv -> inv.getArgument(0));

        QueueTicketResponse res = service.transferTicket(100L, 2L, "Phòng 101 quá tải");

        assertThat(res.getRoomNumber()).isEqualTo("P.102");
        assertThat(res.getStatus()).isEqualTo("WAITING");
        verify(queueTicketRepository).save(waitingTicket);
    }
}

