package com.demo.be.service;

import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.security.AccessGuard;
import com.demo.be.service.impl.LabOrderServiceImpl;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LabOrderServiceTest {

    @Mock private LabOrderRepository labOrderRepository;
    @Mock private LabServiceRepository labServiceRepository;
    @Mock private MedicalRecordRepository medicalRecordRepository;
    @Mock private QueueTicketRepository queueTicketRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private AccessGuard accessGuard;
    @Mock private StaffShiftRepository staffShiftRepository;

    @InjectMocks
    private LabOrderServiceImpl service;

    private LabTechnician lan;
    private LabOrder order;
    private StaffShift morningShift;

    @BeforeEach
    void setUp() {
        lan = LabTechnician.builder().id(7L).fullName("Trần Thị Lan").department("XET_NGHIEM").build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "ktv_lan", null, List.of(new SimpleGrantedAuthority("ROLE_LAB_TECH"))));
        when(userRepository.findByUsername("ktv_lan"))
                .thenReturn(Optional.of(User.builder().username("ktv_lan").person(lan).build()));

        LabService glucose = LabService.builder().id(3L).serviceCode("XN-GLU-01").serviceName("Glucose")
                .category(LabCategory.builder().id(2L).name("Sinh hóa máu").department(LabCategory.XET_NGHIEM).build()).unit("mmol/L").referenceRange("3.9 - 6.4").lowerLimit(3.9).upperLimit(6.4).build();
        QueueTicket ticket = QueueTicket.builder().id(11L).ticketNumber("P101-005").status("WAITING_FOR_RESULTS").build();
        MedicalRecord record = MedicalRecord.builder().id(21L).queueTicket(ticket).build();
        order = LabOrder.builder().id(31L).medicalRecord(record).labService(glucose).status("PENDING").build();
        when(labOrderRepository.findById(31L)).thenReturn(Optional.of(order));
        when(labOrderRepository.save(any(LabOrder.class))).thenAnswer(inv -> inv.getArgument(0));

        morningShift = StaffShift.builder().id(41L).technician(lan)
                .room(ExaminationRoom.builder().id(5L).roomNumber("P.104").build())
                .workDate(LocalDate.of(2026, 11, 16)).shiftType("CA_SÁNG")
                .startTime(LocalTime.of(7, 30)).endTime(LocalTime.of(12, 0)).build();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private UpdateLabOrderResultRequest result(String value) {
        UpdateLabOrderResultRequest req = new UpdateLabOrderResultRequest();
        req.setResultValue(value);
        req.setConclusion("Kết luận thử");
        return req;
    }

    @Test
    void startProcessing_recordsTechnicianAndCurrentShift() {
        when(staffShiftRepository.findCurrentShifts(eq(7L), any(), any())).thenReturn(List.of(morningShift));

        LabOrderResponse res = service.startProcessing(31L);

        assertThat(order.getStatus()).isEqualTo("PROCESSING");
        assertThat(order.getPerformer()).isSameAs(lan);
        assertThat(order.getStaffShift()).isSameAs(morningShift);
        assertThat(res.getLabRoomNumber()).isEqualTo("P.104");
        assertThat(res.getShiftLabel()).startsWith("Ca sáng 16/11/2026");
    }

    @Test
    void startProcessing_outsideShift_isAllowed_andMarkedOutsideShift() {
        when(staffShiftRepository.findCurrentShifts(eq(7L), any(), any())).thenReturn(List.of());

        LabOrderResponse res = service.startProcessing(31L);

        assertThat(order.getStaffShift()).isNull();
        assertThat(res.getShiftLabel()).isEqualTo("Ngoài ca trực");
    }

    @Test
    void enterResult_createsLabResult_withSnapshotAndAbnormalFlag() {
        order.setStatus("PROCESSING");
        order.setPerformer(lan);
        order.setStaffShift(morningShift);
        when(labOrderRepository.findByMedicalRecordId(21L)).thenReturn(List.of(order));

        LabOrderResponse res = service.updateOrderResult(31L, result("9.8"));

        LabResult saved = order.getResult();
        assertThat(saved).isNotNull();
        assertThat(saved.getLabOrder()).isSameAs(order);
        assertThat(saved.getResultValue()).isEqualTo("9.8");
        assertThat(saved.getIsAbnormal()).isTrue();          // 9.8 > ngưỡng trên 6.4
        assertThat(saved.getUnit()).isEqualTo("mmol/L");
        assertThat(saved.getReferenceRange()).isEqualTo("3.9 - 6.4");
        assertThat(saved.getResultTime()).isNotNull();
        assertThat(order.getStatus()).isEqualTo("COMPLETED");
        assertThat(res.getResultValue()).isEqualTo("9.8");
        assertThat(res.getIsAbnormal()).isTrue();
        // Chỉ định cuối cùng có kết quả -> vé chuyển sang có kết quả
        assertThat(order.getMedicalRecord().getQueueTicket().getStatus()).isEqualTo("RESULTS_READY");
        verify(staffShiftRepository, never()).findCurrentShifts(any(), any(), any()); // đã có ca từ lúc tiếp nhận
    }

    @Test
    void editResult_updatesSameLabResult_insteadOfCreatingAnother() {
        order.setStatus("PROCESSING");
        order.setStaffShift(morningShift);
        when(labOrderRepository.findByMedicalRecordId(21L)).thenReturn(List.of(order));
        service.updateOrderResult(31L, result("9.8"));
        LabResult first = order.getResult();

        order.getMedicalRecord().getQueueTicket().setStatus("RESULTS_READY");
        service.updateOrderResult(31L, result("5.2"));

        assertThat(order.getResult()).isSameAs(first);
        assertThat(first.getResultValue()).isEqualTo("5.2");
        assertThat(first.getIsAbnormal()).isFalse();
    }
}
