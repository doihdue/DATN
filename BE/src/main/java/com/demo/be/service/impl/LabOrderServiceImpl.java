package com.demo.be.service.impl;

import com.demo.be.dto.request.SendLabOrdersRequest;
import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.dto.response.MedicalRecordResponse;
import com.demo.be.exception.AppException;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.LabOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
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
        if ("COMPLETED".equals(ticket.getStatus()) || "CANCELLED".equals(ticket.getStatus())) {
            throw new BadRequestException("Ca khám của vé " + ticket.getTicketNumber() + " đã kết thúc, không thể gửi thêm chỉ định");
        }

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

        // Gửi bổ sung cho lượt khám đã có chỉ định: không chỉ định lại dịch vụ đang làm / đã có kết quả
        List<LabOrder> recordOrders = savedRecord.getLabOrders();
        List<String> duplicated = recordOrders.stream()
                .filter(o -> !"CANCELLED".equals(o.getStatus()))
                .filter(o -> request.getLabServiceIds().contains(o.getLabService().getId()))
                .map(o -> o.getLabService().getServiceName())
                .distinct()
                .toList();
        if (!duplicated.isEmpty()) {
            throw new BadRequestException("Bệnh nhân đã được chỉ định trong lượt khám này: " + String.join(", ", duplicated)
                    + ". Bỏ chọn các dịch vụ này rồi gửi lại.");
        }

        // Sinh các bản ghi LabOrder ở trạng thái PENDING
        LocalDateTime now = LocalDateTime.now();
        List<LabOrder> newOrders = new ArrayList<>();
        for (Long serviceId : request.getLabServiceIds().stream().distinct().toList()) {
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
        // Thêm vào danh sách đang được quản lý; gán danh sách mới sẽ lỗi vì labOrders có orphanRemoval
        recordOrders.addAll(savedOrders);

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
    public List<LabOrderResponse> getWorklist(LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        // Admin xem toàn bộ; KTV chỉ thấy chỉ định thuộc khoa của mình
        String department = !isAdmin() && getCurrentEmployee() instanceof LabTechnician tech ? tech.getDepartment() : null;
        return labOrderRepository.findWorklist(day.atStartOfDay(), day.plusDays(1).atStartOfDay()).stream()
                .filter(o -> department == null || department.equals(o.getLabService().getDepartment()))
                .map(LabOrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public LabOrderResponse startProcessing(Long orderId) {
        LabOrder order = findOrder(orderId);
        if (!"PENDING".equals(order.getStatus())) {
            throw new BadRequestException("Chỉ tiếp nhận được chỉ định đang chờ làm (trạng thái hiện tại: " + order.getStatus() + ")");
        }
        order.setStatus("PROCESSING");
        order.setPerformer(getDepartmentTech(order));
        LabOrder saved = labOrderRepository.save(order);
        log.info("-> KTV {} tiếp nhận mẫu cho chỉ định LabOrder ID: {}", saved.getPerformer().getFullName(), orderId);
        return LabOrderResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public LabOrderResponse updateOrderResult(Long orderId, UpdateLabOrderResultRequest request) {
        LabOrder order = findOrder(orderId);
        if ("CANCELLED".equals(order.getStatus())) {
            throw new BadRequestException("Chỉ định đã bị huỷ, không thể nhập kết quả");
        }
        QueueTicket ticket = order.getMedicalRecord().getQueueTicket();
        if (ticket != null && "COMPLETED".equals(ticket.getStatus())) {
            throw new BadRequestException("Ca khám của bệnh nhân đã kết thúc, không thể sửa kết quả xét nghiệm");
        }

        order.setResultValue(request.getResultValue().trim());
        order.setConclusion(trimToNull(request.getConclusion()));
        order.setNotes(trimToNull(request.getNotes()));
        order.setPerformedTime(LocalDateTime.now());
        order.setPerformer(getDepartmentTech(order));
        order.setStatus("COMPLETED");
        // KTV không đánh dấu thì tự so với ngưỡng tham chiếu của dịch vụ
        order.setIsAbnormal(request.getIsAbnormal() != null
                ? request.getIsAbnormal()
                : checkAbnormal(order.getResultValue(), order.getLabService()));

        LabOrder saved = labOrderRepository.save(order);
        log.info("-> Đã nhập kết quả chỉ định LabOrder ID: {} - Giá trị: {}, Bất thường: {}",
                saved.getId(), saved.getResultValue(), saved.getIsAbnormal());

        refreshTicketStatus(saved.getMedicalRecord());
        return LabOrderResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void cancelOrder(Long orderId) {
        LabOrder order = findOrder(orderId);
        if ("COMPLETED".equals(order.getStatus())) {
            throw new BadRequestException("Không thể hủy xét nghiệm đã có kết quả và được ký duyệt");
        }

        order.setStatus("CANCELLED");
        labOrderRepository.save(order);
        log.info("-> Đã hủy chỉ định xét nghiệm ID: {}", orderId);

        // Huỷ chỉ định cuối cùng còn dang dở thì bệnh nhân cũng đã đủ kết quả
        refreshTicketStatus(order.getMedicalRecord());
    }

    // Tất cả chỉ định của hồ sơ đã xong / huỷ -> vé đang chờ kết quả chuyển sang RESULTS_READY để bác sĩ gọi lại
    private void refreshTicketStatus(MedicalRecord record) {
        QueueTicket ticket = record != null ? record.getQueueTicket() : null;
        if (ticket == null || !"WAITING_FOR_RESULTS".equals(ticket.getStatus())) {
            return;
        }
        boolean allDone = labOrderRepository.findByMedicalRecordId(record.getId()).stream()
                .allMatch(o -> "COMPLETED".equals(o.getStatus()) || "CANCELLED".equals(o.getStatus()));
        if (!allDone) {
            return;
        }
        ticket.setStatus("RESULTS_READY");
        queueTicketRepository.save(ticket);
        log.info("-> Toàn bộ chỉ định CLS của vé số {} đã xong. Trạng thái chuyển sang: RESULTS_READY", ticket.getTicketNumber());
        try {
            messagingTemplate.convertAndSend("/topic/queue", "TICKET_RESULTS_READY");
        } catch (Exception e) {
            log.warn("Không thể gửi websocket event: {}", e.getMessage());
        }
    }

    private LabOrder findOrder(Long orderId) {
        return labOrderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Chỉ định xét nghiệm", "id", orderId));
    }

    // KTV / nhân viên đang đăng nhập, dùng làm người tiếp nhận và ký duyệt kết quả
    private Employee getCurrentEmployee() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = auth != null ? userRepository.findByUsername(auth.getName()).orElse(null) : null;
        if (user == null || !(user.getPerson() instanceof Employee employee)) {
            throw new BadRequestException("Tài khoản hiện tại không gắn với hồ sơ nhân viên, không thể ký duyệt kết quả");
        }
        return employee;
    }

    // KTV đang đăng nhập, chỉ được làm chỉ định thuộc khoa của mình
    private LabTechnician getDepartmentTech(LabOrder order) {
        if (!(getCurrentEmployee() instanceof LabTechnician tech)) {
            throw new AppException("Chỉ kỹ thuật viên mới được tiếp nhận và ký kết quả xét nghiệm", HttpStatus.FORBIDDEN);
        }
        if (!tech.getDepartment().equals(order.getLabService().getDepartment())) {
            throw new AppException("Chỉ định " + order.getLabService().getServiceCode()
                    + " không thuộc khoa của bạn", HttpStatus.FORBIDDEN);
        }
        return tech;
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
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
        return null;
    }
}
