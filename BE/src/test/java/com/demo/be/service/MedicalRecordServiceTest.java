package com.demo.be.service;

import com.demo.be.dto.request.CreateMedicalRecordRequest;
import com.demo.be.dto.request.PrescriptionItemRequest;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.dto.response.PatientMedicalHistoryResponse;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.impl.MedicalRecordServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

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
class MedicalRecordServiceTest {

    @Mock private MedicalRecordRepository medicalRecordRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private DoctorRepository doctorRepository;
    @Mock private UserRepository userRepository;
    @Mock private QueueTicketRepository queueTicketRepository;
    @Mock private MedicineRepository medicineRepository;
    @Mock private LabOrderRepository labOrderRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private com.demo.be.service.PdfExportService pdfExportService;
    @Mock private org.springframework.context.ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private MedicalRecordServiceImpl service;

    private Patient patient;
    private Doctor doctor;
    private QueueTicket ticket;
    private Medicine medicine;

    @BeforeEach
    void setUp() {
        patient = Patient.builder()
                .id(1L)
                .fullName("Nguyễn Thị Lan")
                .dateOfBirth(LocalDate.of(1995, 5, 20))
                .gender("Nữ")
                .emergencyContactPhone("0987654321")
                .bloodGroup("O+")
                .allergies("Dị ứng Penicillin")
                .medicalHistorySummary("Dạ dày nhẹ")
                .build();

        doctor = Doctor.builder()
                .id(2L)
                .fullName("BS.CKII Nguyễn Văn Hùng")
                .academicTitle("Bác sĩ Chuyên khoa II")
                .build();

        ticket = QueueTicket.builder()
                .id(10L)
                .ticketNumber("P101-001")
                .patient(patient)
                .doctor(doctor)
                .status("IN_PROGRESS")
                .startTime(LocalTime.of(8, 15))
                .build();

        medicine = Medicine.builder()
                .id(100L)
                .name("Paracetamol 500mg")
                .defaultUsageInstructions("Uống 1 viên khi sốt trên 38.5 độ")
                .unit("Viên")
                .build();
    }

    @Test
    void createMedicalRecord_success_withPrescription() {
        PrescriptionItemRequest itemReq = PrescriptionItemRequest.builder()
                .medicineId(100L)
                .quantity(10)
                .dosage("1 viên/lần, 2 lần/ngày")
                .route("Đường uống")
                .daysSupply(5)
                .instructions("Uống sau ăn 30 phút")
                .build();

        CreateMedicalRecordRequest request = CreateMedicalRecordRequest.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .queueTicketId(ticket.getId())
                .bloodPressure("120/80")
                .heartRate(75)
                .temperature(37.0)
                .weight(55.0)
                .height(160.0)
                .symptoms("Đau rát họng, ho khan, mệt mỏi")
                .preliminaryDiagnosis("Viêm đường hô hấp trên")
                .finalDiagnosis("Viêm họng cấp J02.9")
                .icd10Code("J02.9")
                .notes("Nghỉ ngơi, uống nhiều nước ấm")
                .revisitDate(LocalDate.now().plusDays(7))
                .revisitNotes("Tái khám nếu còn đau họng")
                .prescriptionAdvice("Uống thuốc đúng giờ, tránh đồ lạnh")
                .prescriptionItems(List.of(itemReq))
                .build();

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(queueTicketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(medicineRepository.findAllById(anySet())).thenReturn(List.of(medicine));
        when(medicalRecordRepository.save(any(MedicalRecord.class))).thenAnswer(inv -> {
            MedicalRecord mr = inv.getArgument(0);
            mr.setId(500L);
            return mr;
        });

        MedicalRecordResponse res = service.createMedicalRecord(request);

        assertThat(res).isNotNull();
        assertThat(res.getSymptoms()).isEqualTo("Đau rát họng, ho khan, mệt mỏi");
        assertThat(res.getFinalDiagnosis()).isEqualTo("Viêm họng cấp J02.9");
        assertThat(res.getIcd10Code()).isEqualTo("J02.9");
        assertThat(res.getBloodPressure()).isEqualTo("120/80");
        assertThat(res.getPrescription()).isNotNull();
        assertThat(res.getPrescription().getItems()).hasSize(1);
        assertThat(res.getPrescription().getItems().get(0).getMedicineName()).isEqualTo("Paracetamol 500mg");

        // Verify ticket status was updated to COMPLETED
        assertThat(ticket.getStatus()).isEqualTo("COMPLETED");
        assertThat(ticket.getEndTime()).isNotNull();
        verify(queueTicketRepository).save(ticket);
        verify(messagingTemplate).convertAndSend(eq("/topic/queue"), eq("TICKET_COMPLETED"));
    }

    @Test
    void createMedicalRecord_twoPhases_updatesExistingRecord() {
        MedicalRecord existingRecord = MedicalRecord.builder()
                .id(501L)
                .patient(patient)
                .doctor(doctor)
                .symptoms("Sốt cao liên tục 3 ngày")
                .preliminaryDiagnosis("Nghi ngờ viêm phổi")
                .build();

        CreateMedicalRecordRequest phase2Request = CreateMedicalRecordRequest.builder()
                .recordId(501L)
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .symptoms("Sốt cao liên tục 3 ngày")
                .preliminaryDiagnosis("Nghi ngờ viêm phổi")
                .finalDiagnosis("Viêm phế quản phổi cấp J18.0")
                .icd10Code("J18.0")
                .build();

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(medicalRecordRepository.findById(501L)).thenReturn(Optional.of(existingRecord));
        when(medicalRecordRepository.save(any(MedicalRecord.class))).thenAnswer(inv -> inv.getArgument(0));

        MedicalRecordResponse res = service.createMedicalRecord(phase2Request);

        assertThat(res.getFinalDiagnosis()).isEqualTo("Viêm phế quản phổi cấp J18.0");
        assertThat(res.getIcd10Code()).isEqualTo("J18.0");
        verify(medicalRecordRepository).save(existingRecord);
    }

    @Test
    void createMedicalRecord_medicineNotFound_throwsResourceNotFound() {
        PrescriptionItemRequest invalidItem = PrescriptionItemRequest.builder()
                .medicineId(999L)
                .quantity(5)
                .build();

        CreateMedicalRecordRequest request = CreateMedicalRecordRequest.builder()
                .patientId(patient.getId())
                .doctorId(doctor.getId())
                .symptoms("Ho sốt")
                .prescriptionItems(List.of(invalidItem))
                .build();

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(medicineRepository.findAllById(anySet())).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> service.createMedicalRecord(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Thuốc");
    }

    @Test
    void createMedicalRecord_patientNotFound_throwsResourceNotFound() {
        CreateMedicalRecordRequest request = CreateMedicalRecordRequest.builder()
                .patientId(9999L)
                .doctorId(doctor.getId())
                .symptoms("Đau đầu")
                .build();

        when(doctorRepository.findById(doctor.getId())).thenReturn(Optional.of(doctor));
        when(patientRepository.findById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createMedicalRecord(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Bệnh nhân");
    }

    @Test
    void getPatientMedicalHistory_success() {
        MedicalRecord mr1 = MedicalRecord.builder()
                .id(10L)
                .patient(patient)
                .doctor(doctor)
                .symptoms("Viêm xoang")
                .finalDiagnosis("Viêm xoang cấp")
                .build();

        when(patientRepository.findById(patient.getId())).thenReturn(Optional.of(patient));
        when(medicalRecordRepository.findPatientHistory(patient.getId())).thenReturn(List.of(mr1));

        PatientMedicalHistoryResponse history = service.getPatientMedicalHistory(patient.getId());

        assertThat(history).isNotNull();
        assertThat(history.getPatientName()).isEqualTo("Nguyễn Thị Lan");
        assertThat(history.getAllergies()).isEqualTo("Dị ứng Penicillin");
        assertThat(history.getBloodGroup()).isEqualTo("O+");
        assertThat(history.getTotalExaminations()).isEqualTo(1);
        assertThat(history.getRecords()).hasSize(1);
        assertThat(history.getRecords().get(0).getFinalDiagnosis()).isEqualTo("Viêm xoang cấp");
    }

    @Test
    void getMedicalRecordById_success() {
        MedicalRecord record = MedicalRecord.builder()
                .id(123L)
                .patient(patient)
                .doctor(doctor)
                .symptoms("Khám định kỳ")
                .finalDiagnosis("Sức khỏe bình thường")
                .build();

        when(medicalRecordRepository.findByIdWithDetails(123L)).thenReturn(Optional.of(record));

        MedicalRecordResponse res = service.getMedicalRecordById(123L);

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(123L);
        assertThat(res.getFinalDiagnosis()).isEqualTo("Sức khỏe bình thường");
    }

    @Test
    void getMedicalRecordById_notFound_throwsResourceNotFound() {
        when(medicalRecordRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMedicalRecordById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Hồ sơ bệnh án");
    }
}
