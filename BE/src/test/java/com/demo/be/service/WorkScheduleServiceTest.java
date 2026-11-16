package com.demo.be.service;

import com.demo.be.dto.request.BatchWorkScheduleRequest;
import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.BatchWorkScheduleResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.model.Appointment;
import com.demo.be.model.Doctor;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.WorkSchedule;
import com.demo.be.repository.AppointmentRepository;
import com.demo.be.repository.DoctorRepository;
import com.demo.be.repository.ExaminationRoomRepository;
import com.demo.be.repository.UserRepository;
import com.demo.be.repository.WorkScheduleRepository;
import com.demo.be.service.impl.WorkScheduleServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
class WorkScheduleServiceTest {

    @Mock private WorkScheduleRepository workScheduleRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private ExaminationRoomRepository examinationRoomRepository;
    @Mock private AppointmentRepository appointmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private WorkScheduleServiceImpl service;

    private Doctor doctor;
    private ExaminationRoom room;
    private LocalDate futureDate;

    @BeforeEach
    void setUp() {
        doctor = Doctor.builder().id(1L).fullName("BS.CKII Nguyễn Văn Hùng").build();
        room = ExaminationRoom.builder().id(10L).roomNumber("P.101").roomName("Phòng khám Nội 1").build();
        futureDate = LocalDate.now().plusDays(2);
    }

    private WorkScheduleRequest buildRequest(LocalDate date, LocalTime start, LocalTime end) {
        return WorkScheduleRequest.builder()
                .doctorId(doctor.getId())
                .examinationRoomId(room.getId())
                .workDate(date)
                .startTime(start)
                .endTime(end)
                .shiftType("CA_SÁNG")
                .maxPatients(30)
                .build();
    }

    @Test
    void createSchedule_success() {
        WorkScheduleRequest req = buildRequest(futureDate, LocalTime.of(8, 0), LocalTime.of(12, 0));

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.hasDoctorConflict(eq(doctor.getId()), eq(futureDate), any(), any(), isNull()))
                .thenReturn(false);
        when(workScheduleRepository.hasRoomConflict(eq(room.getId()), eq(futureDate), any(), any(), isNull()))
                .thenReturn(false);
        when(workScheduleRepository.save(any(WorkSchedule.class))).thenAnswer(inv -> {
            WorkSchedule ws = inv.getArgument(0);
            ws.setId(100L);
            return ws;
        });

        WorkScheduleResponse res = service.createSchedule(req);

        assertThat(res).isNotNull();
        assertThat(res.getDoctorId()).isEqualTo(doctor.getId());
        assertThat(res.getExaminationRoomId()).isEqualTo(room.getId());
        assertThat(res.getWorkDate()).isEqualTo(futureDate);
        assertThat(res.getStatus()).isEqualTo("AVAILABLE");
        verify(workScheduleRepository).save(any(WorkSchedule.class));
    }

    @Test
    void createSchedule_startTimeAfterEndTime_throwsBadRequest() {
        WorkScheduleRequest req = buildRequest(futureDate, LocalTime.of(16, 0), LocalTime.of(8, 0));

        assertThatThrownBy(() -> service.createSchedule(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải trước giờ kết thúc");
    }

    @Test
    void createSchedule_pastDate_throwsBadRequest() {
        LocalDate pastDate = LocalDate.now().minusDays(1);
        WorkScheduleRequest req = buildRequest(pastDate, LocalTime.of(8, 0), LocalTime.of(12, 0));

        assertThatThrownBy(() -> service.createSchedule(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể xếp ca vào ngày đã qua");
    }

    @Test
    void createSchedule_doctorConflict_throwsBadRequest() {
        WorkScheduleRequest req = buildRequest(futureDate, LocalTime.of(8, 0), LocalTime.of(12, 0));

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.hasDoctorConflict(eq(doctor.getId()), eq(futureDate), any(), any(), isNull()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.createSchedule(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã có ca làm việc khác trùng hoặc giao nhau");
    }

    @Test
    void createSchedule_roomConflict_throwsBadRequest() {
        WorkScheduleRequest req = buildRequest(futureDate, LocalTime.of(8, 0), LocalTime.of(12, 0));

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));
        when(workScheduleRepository.hasDoctorConflict(eq(doctor.getId()), eq(futureDate), any(), any(), isNull()))
                .thenReturn(false);
        when(workScheduleRepository.hasRoomConflict(eq(room.getId()), eq(futureDate), any(), any(), isNull()))
                .thenReturn(true);

        assertThatThrownBy(() -> service.createSchedule(req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã được xếp ca cho bác sĩ khác");
    }

    @Test
    void createBatchSchedules_successWithPartialConflict() {
        LocalDate date1 = LocalDate.now().plusDays(1);
        LocalDate date2 = LocalDate.now().plusDays(2);

        BatchWorkScheduleRequest batchReq = BatchWorkScheduleRequest.builder()
                .doctorId(doctor.getId())
                .examinationRoomId(room.getId())
                .workDates(List.of(date1, date2))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .shiftType("CA_SÁNG")
                .maxPatients(25)
                .build();

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(examinationRoomRepository.findById(room.getId())).thenReturn(Optional.of(room));

        // Date 1: Bác sĩ đã có lịch trùng
        WorkSchedule conflictSchedule = WorkSchedule.builder()
                .doctor(doctor)
                .workDate(date1)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .status("AVAILABLE")
                .build();
        when(workScheduleRepository.findDoctorSchedules(doctor.getId(), date1, date2))
                .thenReturn(List.of(conflictSchedule));
        when(workScheduleRepository.filterSchedules(date1, date2, null, null, room.getId()))
                .thenReturn(Collections.emptyList());

        when(workScheduleRepository.saveAll(anyList())).thenAnswer(inv -> {
            List<WorkSchedule> list = inv.getArgument(0);
            return list;
        });

        BatchWorkScheduleResponse response = service.createBatchSchedules(batchReq);

        assertThat(response.getTotalRequested()).isEqualTo(2);
        assertThat(response.getSuccessCount()).isEqualTo(1); // date2 succeeds
        assertThat(response.getConflictCount()).isEqualTo(1); // date1 conflicts
        assertThat(response.getConflictMessages()).hasSize(1);
        assertThat(response.getConflictMessages().get(0)).contains("Bác sĩ " + doctor.getFullName());
    }

    @Test
    void cancelSchedule_success() {
        WorkSchedule schedule = WorkSchedule.builder()
                .id(200L)
                .doctor(doctor)
                .examinationRoom(room)
                .workDate(futureDate)
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(12, 0))
                .status("AVAILABLE")
                .currentBookedCount(2)
                .build();

        Appointment app1 = Appointment.builder().id(1L).status("CONFIRMED").build();
        Appointment app2 = Appointment.builder().id(2L).status("PENDING").build();

        when(workScheduleRepository.findById(200L)).thenReturn(Optional.of(schedule));
        when(appointmentRepository.findByWorkScheduleIdAndStatusIn(eq(200L), anyList()))
                .thenReturn(List.of(app1, app2));
        when(workScheduleRepository.save(any(WorkSchedule.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkScheduleResponse res = service.cancelSchedule(200L, "Bác sĩ bận công tác đột xuất");

        assertThat(res.getStatus()).isEqualTo("CANCELLED");
        assertThat(app1.getStatus()).isEqualTo("CANCELLED");
        assertThat(app2.getStatus()).isEqualTo("CANCELLED");
        verify(appointmentRepository).saveAll(anyList());
    }

    @Test
    void deleteSchedule_withBookedAppointments_throwsBadRequest() {
        WorkSchedule schedule = WorkSchedule.builder()
                .id(201L)
                .workDate(futureDate)
                .currentBookedCount(3)
                .build();

        when(workScheduleRepository.findById(201L)).thenReturn(Optional.of(schedule));

        assertThatThrownBy(() -> service.deleteSchedule(201L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã có 3 bệnh nhân đặt lịch");
    }
}
