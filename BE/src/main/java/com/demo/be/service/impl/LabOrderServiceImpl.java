package com.demo.be.service.impl;

import com.demo.be.dto.request.SendLabOrdersRequest;
import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.LabOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LabOrderServiceImpl implements LabOrderService {

    private final LabOrderRepository labOrderRepository;
    private final LabServiceRepository labServiceRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final QueueTicketRepository queueTicketRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public MedicalRecordResponse sendLabOrders(SendLabOrdersRequest request) {
        log.info("Bác sĩ gửi chỉ định cận lâm sàng cho Vé khám ID: {}", request.getQueueTicketId());

        QueueTicket ticket = queueTicketRepository.findById(request.getQueueTicketId())
                .orElseThrow(() -> new ResourceNotFoundException("Phiếu khám hàng đợi", "id", request.getQueueTicketId()));

        Doctor doctor = resolveDoctor(request.getDoctorId());
        if (doctor == null && ticket.getDoctor() != null) {
            doctor = ticket.getDoctor();
        }

        Patient patient = ticket.getPatient();
        if (patient == null && request.getPatientId() != null) {
            patient = patientRepository.findById(request.getPatientId()).orElse(null);
        }
        if (patient == null && ticket.getPatientName() != null && !ticket.getPatientName().isBlank()) {
            patient = Patient.builder()
                    .fullName(ticket.getPatientName().trim())
                    .emergencyContactPhone(ticket.getPatientPhone())
                    .dateOfBirth(ticket.getPatientDob())
                    .gender(ticket.getPatientGender() != null ? ticket.getPatientGender() : "Chưa rõ")
                    .build();
            patient = patientRepository.save(patient);
            ticket.setPatient(patient);
        }

        // Tìm hoặc tạo mới MedicalRecord lưu tạm
        MedicalRecord record = medicalRecordRepository.findByQueueTicketId(ticket.getId()).orElse(null);
        if (record == null) {
            record = MedicalRecord.builder()
                    .queueTicket(ticket)
                    .patient(patient)
                    .doctor(doctor)
                    .bloodPressure(request.getBloodPressure())
                    .heartRate(request.getHeartRate())
                    .temperature(request.getTemperature())
                    .weight(request.getWeight())
                    .height(request.getHeight())
                    .vitalSigns(request.getVitalSigns())
                    .symptoms(request.getSymptoms())
                    .preliminaryDiagnosis(request.getPreliminaryDiagnosis())
                    .finalDiagnosis(null) // Chưa có kết luận cuối cùng
                    .notes(request.getNotes())
                    .labOrders(new ArrayList<>())
                    .build();
        } else {
            // Cập nhật thông tin sinh hiệu sơ bộ
            if (request.getBloodPressure() != null) record.setBloodPressure(request.getBloodPressure());
            if (request.getHeartRate() != null) record.setHeartRate(request.getHeartRate());
            if (request.getTemperature() != null) record.setTemperature(request.getTemperature());
            if (request.getWeight() != null) record.setWeight(request.getWeight());
            if (request.getHeight() != null) record.setHeight(request.getHeight());
            if (request.getVitalSigns() != null) record.setVitalSigns(request.getVitalSigns());
            if (request.getSymptoms() != null) record.setSymptoms(request.getSymptoms());
            if (request.getPreliminaryDiagnosis() != null) record.setPreliminaryDiagnosis(request.getPreliminaryDiagnosis());
            if (request.getNotes() != null) record.setNotes(request.getNotes());
        }

        MedicalRecord savedRecord = medicalRecordRepository.save(record);

        // Sinh các bản ghi LabOrder ở trạng thái PENDING
        LocalDateTime now = LocalDateTime.now();
        List<LabOrder> newOrders = new ArrayList<>();
        for (Long serviceId : request.getLabServiceIds()) {
            LabService service = labServiceRepository.findById(serviceId)
                    .orElseThrow(() -> new ResourceNotFoundException("Dịch vụ xét nghiệm", "id", serviceId));

            LabOrder order = LabOrder.builder()
                    .medicalRecord(savedRecord)
                    .labService(service)
                    .price(service.getPrice())
                    .status("PENDING")
                    .orderTime(now)
                    .isAbnormal(false)
                    .build();
            newOrders.add(order);
        }

        List<LabOrder> savedOrders = labOrderRepository.saveAll(newOrders);
        savedRecord.setLabOrders(savedOrders);

        // Đổi trạng thái vé sang WAITING_FOR_RESULTS
        ticket.setStatus("WAITING_FOR_RESULTS");
        queueTicketRepository.save(ticket);

        log.info("-> Đã tạo {} chỉ định xét nghiệm cho hồ sơ ID: {}. Vé số: {} chuyển sang WAITING_FOR_RESULTS",
                savedOrders.size(), savedRecord.getId(), ticket.getTicketNumber());

        // Bắn WebSocket thông báo
        try {
            messagingTemplate.convertAndSend("/topic/queue", "TICKET_WAITING_FOR_RESULTS");
        } catch (Exception e) {
            log.warn("Không thể gửi websocket event: {}", e.getMessage());
        }

        return MedicalRecordResponse.fromEntity(savedRecord);
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getOrdersByMedicalRecordId(Long recordId) {
        return labOrderRepository.findByMedicalRecordIdWithDetails(recordId).stream()
                .map(LabOrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getOrdersByTicketId(Long ticketId) {
        MedicalRecord record = medicalRecordRepository.findByQueueTicketId(ticketId).orElse(null);
        if (record == null) {
            return new ArrayList<>();
        }
        return getOrdersByMedicalRecordId(record.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getOrdersByStatus(String status) {
        return labOrderRepository.findByStatusWithDetails(status).stream()
                .map(LabOrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getAllOrders() {
        return labOrderRepository.findAllWithDetails().stream()
                .map(LabOrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabOrderResponse updateOrderResult(Long orderId, UpdateLabOrderResultRequest request) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chỉ định xét nghiệm", "id", orderId));

        Doctor performer = resolveDoctor(request.getPerformerId());

        order.setResultValue(request.getResultValue().trim());
        order.setConclusion(request.getConclusion());
        order.setNotes(request.getNotes());
        order.setPerformedTime(LocalDateTime.now());
        order.setPerformer(performer);

        String targetStatus = request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "COMPLETED";
        order.setStatus(targetStatus);

        // Kiểm tra ngưỡng bất thường
        Boolean isAbnormal = request.getIsAbnormal();
        if (isAbnormal == null) {
            isAbnormal = checkAbnormal(order.getResultValue(), order.getLabService());
        }
        order.setIsAbnormal(isAbnormal);

        LabOrder saved = labOrderRepository.save(order);
        log.info("-> Đã nhập kết quả chỉ định LabOrder ID: {} - Giá trị: {}, Bất thường: {}",
                saved.getId(), saved.getResultValue(), saved.getIsAbnormal());

        // Kiểm tra nếu tất cả các xét nghiệm của bệnh án này đã hoàn thành -> Chuyển vé sang RESULTS_READY
        MedicalRecord record = saved.getMedicalRecord();
        if (record != null && record.getQueueTicket() != null) {
            QueueTicket ticket = record.getQueueTicket();
            List<LabOrder> allOrders = labOrderRepository.findByMedicalRecordId(record.getId());
            boolean allDone = allOrders.stream().allMatch(o -> "COMPLETED".equalsIgnoreCase(o.getStatus()) || "CANCELLED".equalsIgnoreCase(o.getStatus()));

            if (allDone && !"COMPLETED".equalsIgnoreCase(ticket.getStatus())) {
                ticket.setStatus("RESULTS_READY");
                queueTicketRepository.save(ticket);
                log.info("-> Toàn bộ chỉ định CLS của vé số {} đã xong. Trạng thái chuyển sang: RESULTS_READY", ticket.getTicketNumber());

                try {
                    messagingTemplate.convertAndSend("/topic/queue", "TICKET_RESULTS_READY");
                } catch (Exception e) {
                    log.warn("Không thể gửi websocket event: {}", e.getMessage());
                }
            }
        }

        return LabOrderResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId) {
        LabOrder order = labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chỉ định xét nghiệm", "id", orderId));

        if ("COMPLETED".equalsIgnoreCase(order.getStatus())) {
            throw new BadRequestException("Không thể hủy xét nghiệm đã có kết quả và được ký duyệt");
        }

        order.setStatus("CANCELLED");
        labOrderRepository.save(order);
        log.info("-> Đã hủy chỉ định xét nghiệm ID: {}", orderId);
    }

    private boolean checkAbnormal(String resultValue, LabService service) {
        if (resultValue == null || service == null) return false;
        try {
            // Tách số từ kết quả (ví dụ "11.2", "11.2 G/L" -> 11.2)
            String cleanVal = resultValue.trim().replaceAll("[^0-9.]", " ").trim().split("\\s+")[0];
            double val = Double.parseDouble(cleanVal);
            if (service.getLowerLimit() != null && val < service.getLowerLimit()) {
                return true;
            }
            if (service.getUpperLimit() != null && val > service.getUpperLimit()) {
                return true;
            }
        } catch (Exception ignored) {
            // Không parse được số học (xét nghiệm định tính)
        }
        return false;
    }

    private Doctor resolveDoctor(Long requestedDoctorId) {
        if (requestedDoctorId != null) {
            return doctorRepository.findById(requestedDoctorId).orElse(null);
        }
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
        List<Doctor> allDoctors = doctorRepository.findAll();
        return allDoctors.isEmpty() ? null : allDoctors.get(0);
    }
}
