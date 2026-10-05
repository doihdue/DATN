package com.demo.be.service.impl;

import com.demo.be.dto.request.CreateMedicalRecordRequest;
import com.demo.be.dto.request.PrescriptionItemRequest;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.dto.response.PatientMedicalHistoryResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.MedicalRecordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MedicalRecordServiceImpl implements MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final QueueTicketRepository queueTicketRepository;
    private final MedicineRepository medicineRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public MedicalRecordResponse createMedicalRecord(CreateMedicalRecordRequest request) {
        log.info("Bác sĩ đang tạo hồ sơ bệnh án cho bệnh nhân ID: {}", request.getPatientId());

        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId()));

        // 1. Xác định Bác sĩ phụ trách
        Doctor doctor = resolveDoctor(request.getDoctorId());

        // 2. Xác định Vé khám (nếu từ luồng hàng đợi)
        QueueTicket queueTicket = null;
        if (request.getQueueTicketId() != null) {
            queueTicket = queueTicketRepository.findById(request.getQueueTicketId())
                    .orElseThrow(() -> new ResourceNotFoundException("Phiếu khám hàng đợi", "id", request.getQueueTicketId()));

            // Nếu bác sĩ chưa được gán, lấy từ vé khám
            if (doctor == null && queueTicket.getDoctor() != null) {
                doctor = queueTicket.getDoctor();
            }

            // Hoàn thành lượt khám cho vé số
            queueTicket.setStatus("COMPLETED");
            if (queueTicket.getEndTime() == null) {
                queueTicket.setEndTime(LocalTime.now());
            }
            queueTicketRepository.save(queueTicket);

            // Bắn WebSocket thông báo tới bảng TV và các màn hình điều phối
            try {
                messagingTemplate.convertAndSend("/topic/queue", "TICKET_COMPLETED");
            } catch (Exception e) {
                log.warn("Không thể gửi websocket event: {}", e.getMessage());
            }
        }

        // 3. Khởi tạo Hồ sơ bệnh án
        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .doctor(doctor)
                .queueTicket(queueTicket)
                .bloodPressure(request.getBloodPressure())
                .heartRate(request.getHeartRate())
                .temperature(request.getTemperature())
                .weight(request.getWeight())
                .height(request.getHeight())
                .vitalSigns(request.getVitalSigns())
                .symptoms(request.getSymptoms())
                .preliminaryDiagnosis(request.getPreliminaryDiagnosis())
                .finalDiagnosis(request.getFinalDiagnosis())
                .icd10Code(request.getIcd10Code())
                .notes(request.getNotes())
                .revisitDate(request.getRevisitDate())
                .revisitNotes(request.getRevisitNotes())
                .build();

        // 4. Xử lý Kê đơn thuốc (Extend Use Case)
        if (request.getPrescriptionItems() != null && !request.getPrescriptionItems().isEmpty()) {
            Prescription prescription = Prescription.builder()
                    .medicalRecord(record)
                    .doctorAdvice(request.getPrescriptionAdvice())
                    .items(new ArrayList<>())
                    .build();

            for (PrescriptionItemRequest itemReq : request.getPrescriptionItems()) {
                Medicine medicine = medicineRepository.findById(itemReq.getMedicineId())
                        .orElseThrow(() -> new ResourceNotFoundException("Thuốc", "id", itemReq.getMedicineId()));

                PrescriptionItem item = PrescriptionItem.builder()
                        .prescription(prescription)
                        .medicine(medicine)
                        .quantity(itemReq.getQuantity())
                        .dosage(itemReq.getDosage() != null ? itemReq.getDosage() : medicine.getDefaultUsageInstructions())
                        .route(itemReq.getRoute() != null ? itemReq.getRoute() : "Đường uống")
                        .daysSupply(itemReq.getDaysSupply() != null ? itemReq.getDaysSupply() : 5)
                        .instructions(itemReq.getInstructions())
                        .build();

                prescription.getItems().add(item);
            }

            record.setPrescription(prescription);
        }

        MedicalRecord saved = medicalRecordRepository.save(record);
        log.info("-> Đã lưu thành công hồ sơ bệnh án ID: {} kèm đơn thuốc {}", 
                saved.getId(), 
                saved.getPrescription() != null ? "có " + saved.getPrescription().getItems().size() + " loại thuốc" : "không kê đơn");

        return MedicalRecordResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordById(Long id) {
        MedicalRecord record = medicalRecordRepository.findByIdWithDetails(id)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án", "id", id));
        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordByTicketId(Long ticketId) {
        MedicalRecord record = medicalRecordRepository.findByQueueTicketIdWithDetails(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án gắn với phiếu", "ticketId", ticketId));
        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientMedicalHistoryResponse getPatientMedicalHistory(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", patientId));

        List<MedicalRecord> historyList = medicalRecordRepository.findByPatientIdOrderByCreatedAtDesc(patientId);

        List<MedicalRecordResponse> recordResponses = historyList.stream()
                .map(MedicalRecordResponse::fromEntity)
                .collect(Collectors.toList());

        return PatientMedicalHistoryResponse.builder()
                .patientId(patient.getId())
                .patientName(patient.getFullName())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender())
                .phoneNumber(patient.getPhoneNumber())
                .bloodGroup(patient.getBloodGroup())
                .allergies(patient.getAllergies())
                .medicalHistorySummary(patient.getMedicalHistorySummary())
                .totalExaminations(recordResponses.size())
                .records(recordResponses)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getRecordsByDoctorId(Long doctorId) {
        return medicalRecordRepository.findByDoctorIdOrderByCreatedAtDesc(doctorId).stream()
                .map(MedicalRecordResponse::fromEntity)
                .collect(Collectors.toList());
    }

    private Doctor resolveDoctor(Long requestedDoctorId) {
        if (requestedDoctorId != null) {
            return doctorRepository.findById(requestedDoctorId).orElse(null);
        }

        // Lấy từ context đăng nhập nếu có
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
                String username = auth.getName();
                User user = userRepository.findByUsername(username).orElse(null);
                if (user != null && user.getPerson() instanceof Doctor) {
                    return (Doctor) user.getPerson();
                }
            }
        } catch (Exception e) {
            log.debug("Không tìm thấy thông tin bác sĩ từ SecurityContext: {}", e.getMessage());
        }

        // Mặc định lấy bác sĩ đầu tiên trong hệ thống nếu có
        List<Doctor> allDoctors = doctorRepository.findAll();
        return allDoctors.isEmpty() ? null : allDoctors.get(0);
    }
}
