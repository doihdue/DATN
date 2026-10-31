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
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
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
    private final LabOrderRepository labOrderRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public MedicalRecordResponse createMedicalRecord(CreateMedicalRecordRequest request) {
        log.info("Bác sĩ đang lưu/hoàn tất hồ sơ bệnh án cho bệnh nhân ID: {}", request.getPatientId());

        // 1. Xác định Bác sĩ phụ trách
        Doctor doctor = resolveDoctor(request.getDoctorId());

        // 2. Xác định Vé khám (nếu từ luồng hàng đợi)
        QueueTicket queueTicket = null;
        Patient patient = null;

        if (request.getQueueTicketId() != null) {
            queueTicket = queueTicketRepository.findById(request.getQueueTicketId())
                    .orElseThrow(() -> new ResourceNotFoundException("Phiếu khám hàng đợi", "id", request.getQueueTicketId()));

            // Ưu tiên tuyệt đối lấy bệnh nhân liên kết với vé khám đang phục vụ
            if (queueTicket.getPatient() != null) {
                patient = queueTicket.getPatient();
            }

            // Nếu bác sĩ chưa được gán, lấy từ vé khám
            if (doctor == null && queueTicket.getDoctor() != null) {
                doctor = queueTicket.getDoctor();
            }
        }

        if (patient == null && request.getPatientId() != null) {
            patient = patientRepository.findById(request.getPatientId()).orElse(null);
        }

        if (patient == null && queueTicket != null && queueTicket.getPatientName() != null && !queueTicket.getPatientName().isBlank()) {
            patient = Patient.builder()
                    .fullName(queueTicket.getPatientName().trim())
                    .emergencyContactPhone(queueTicket.getPatientPhone())
                    .dateOfBirth(queueTicket.getPatientDob())
                    .gender("Chưa rõ")
                    .build();
            patient = patientRepository.save(patient);
            queueTicket.setPatient(patient);
        }

        if (patient == null) {
            throw new ResourceNotFoundException("Bệnh nhân", "id", request.getPatientId() != null ? request.getPatientId() : 0);
        }

        if (queueTicket != null) {
            // Hoàn thành lượt khám cho vé số (lưu 1 lần, kể cả khi vừa gắn bệnh nhân mới)
            queueTicket.setStatus("COMPLETED");
            if (queueTicket.getEndTime() == null) {
                queueTicket.setEndTime(LocalTime.now());
            }
            // Đồng bộ trạng thái lịch hẹn online (nếu vé được cấp từ lịch hẹn)
            if (queueTicket.getAppointment() != null) {
                queueTicket.getAppointment().setStatus("COMPLETED");
            }
            queueTicketRepository.save(queueTicket);

            // Bắn WebSocket thông báo tới bảng TV và các màn hình điều phối
            try {
                messagingTemplate.convertAndSend("/topic/queue", "TICKET_COMPLETED");
            } catch (Exception e) {
                log.warn("Không thể gửi websocket event: {}", e.getMessage());
            }
        }

        // 3. Khởi tạo hoặc Cập nhật Hồ sơ bệnh án (hỗ trợ Pha 2 hoàn tất ca khám)
        MedicalRecord record = null;
        if (request.getRecordId() != null) {
            record = medicalRecordRepository.findById(request.getRecordId()).orElse(null);
        }
        if (record == null && queueTicket != null) {
            record = medicalRecordRepository.findByQueueTicketId(queueTicket.getId()).orElse(null);
        }

        if (record == null) {
            record = MedicalRecord.builder()
                    .patient(patient)
                    .doctor(doctor)
                    .queueTicket(queueTicket)
                    .build();
        }

        if (doctor != null && record.getDoctor() == null) record.setDoctor(doctor);
        if (patient != null && record.getPatient() == null) record.setPatient(patient);
        if (queueTicket != null && record.getQueueTicket() == null) record.setQueueTicket(queueTicket);

        record.setBloodPressure(request.getBloodPressure());
        record.setHeartRate(request.getHeartRate());
        record.setTemperature(request.getTemperature());
        record.setWeight(request.getWeight());
        record.setHeight(request.getHeight());
        record.setVitalSigns(request.getVitalSigns());
        record.setSymptoms(request.getSymptoms());
        record.setPreliminaryDiagnosis(request.getPreliminaryDiagnosis());
        record.setFinalDiagnosis(request.getFinalDiagnosis());
        record.setIcd10Code(request.getIcd10Code());
        record.setNotes(request.getNotes());
        record.setRevisitDate(request.getRevisitDate());
        record.setRevisitNotes(request.getRevisitNotes());

        // 4. Xử lý Kê đơn thuốc (Extend Use Case)
        if (request.getPrescriptionItems() != null && !request.getPrescriptionItems().isEmpty()) {
            Prescription prescription = record.getPrescription();
            if (prescription == null) {
                prescription = Prescription.builder()
                        .medicalRecord(record)
                        .doctorAdvice(request.getPrescriptionAdvice())
                        .items(new ArrayList<>())
                        .build();
            } else {
                prescription.setDoctorAdvice(request.getPrescriptionAdvice());
                prescription.getItems().clear();
            }

            // Lấy toàn bộ thuốc trong đơn bằng 1 truy vấn thay vì truy vấn từng thuốc
            Set<Long> medicineIds = request.getPrescriptionItems().stream()
                    .map(PrescriptionItemRequest::getMedicineId)
                    .collect(Collectors.toSet());
            Map<Long, Medicine> medicines = medicineRepository.findAllById(medicineIds).stream()
                    .collect(Collectors.toMap(Medicine::getId, Function.identity()));

            for (PrescriptionItemRequest itemReq : request.getPrescriptionItems()) {
                Medicine medicine = medicines.get(itemReq.getMedicineId());
                if (medicine == null) {
                    throw new ResourceNotFoundException("Thuốc", "id", itemReq.getMedicineId());
                }

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

        // Không gán lại danh sách labOrders (orphanRemoval): hồ sơ đang được quản lý nên chỉ định tự nạp khi tạo response
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
        List<LabOrder> labOrders = labOrderRepository.findByMedicalRecordIdWithDetails(record.getId());
        record.setLabOrders(labOrders);
        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public MedicalRecordResponse getMedicalRecordByTicketId(Long ticketId) {
        MedicalRecord record = medicalRecordRepository.findByQueueTicketIdWithDetails(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án gắn với phiếu", "ticketId", ticketId));
        List<LabOrder> labOrders = labOrderRepository.findByMedicalRecordIdWithDetails(record.getId());
        record.setLabOrders(labOrders);
        return MedicalRecordResponse.fromEntity(record);
    }

    @Override
    @Transactional(readOnly = true)
    public PatientMedicalHistoryResponse getPatientMedicalHistory(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", "id", patientId));

        List<MedicalRecord> historyList = medicalRecordRepository.findPatientHistory(patientId);

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

    @Override
    @Transactional(readOnly = true)
    public List<MedicalRecordResponse> getMyDoctorRecords() {
        Doctor doctor = resolveDoctor(null);
        if (doctor == null) {
            throw new ResourceNotFoundException("Không tìm thấy thông tin bác sĩ từ tài khoản hiện tại");
        }
        return getRecordsByDoctorId(doctor.getId());
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

        // Không đoán bừa bác sĩ (trước đây tải toàn bộ bác sĩ rồi lấy người đầu tiên); để nơi gọi tự xử lý
        return null;
    }
}
