package com.demo.be.service.impl;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.*;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.*;
import com.demo.be.service.QueueService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class QueueServiceImpl implements QueueService {

    private final QueueTicketRepository queueTicketRepository;
    private final ExaminationRoomRepository examinationRoomRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${ai.service.url:http://localhost:8000}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Override
    @Transactional
    public QueueTicketResponse checkIn(CheckInRequest request) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        ExaminationRoom room = examinationRoomRepository.findById(request.getExaminationRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", request.getExaminationRoomId()));

        Doctor doctor = null;
        if (request.getDoctorId() != null) {
            doctor = doctorRepository.findById(request.getDoctorId()).orElse(null);
        }

        // Nếu chưa chọn bác sĩ, tìm bác sĩ đang có lịch làm việc tại phòng khám hôm nay
        if (doctor == null) {
            List<WorkSchedule> todaySchedules = workScheduleRepository.findByExaminationRoomIdAndWorkDate(room.getId(), today);
            if (!todaySchedules.isEmpty()) {
                doctor = todaySchedules.get(0).getDoctor();
            }
        }

        Patient patient = null;
        if (request.getPatientId() != null) {
            patient = patientRepository.findById(request.getPatientId()).orElse(null);
        }
        if (patient == null && request.getPatientName() != null && !request.getPatientName().trim().isEmpty()) {
            List<Patient> allPatients = patientRepository.findAll();
            for (Patient p : allPatients) {
                if (p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(request.getPatientName().trim())) {
                    patient = p;
                    break;
                }
                if (request.getPatientPhone() != null && request.getPatientPhone().trim().equals(p.getPhoneNumber())) {
                    patient = p;
                    break;
                }
            }
            if (patient == null) {
                LocalDate dob = request.getPatientYearOfBirth() != null
                        ? LocalDate.of(request.getPatientYearOfBirth(), 1, 1)
                        : null;
                patient = Patient.builder()
                        .fullName(request.getPatientName().trim())
                        .gender("Chưa rõ")
                        .dateOfBirth(dob)
                        .emergencyContactPhone(request.getPatientPhone())
                        .bloodGroup(null)
                        .build();
                patient = patientRepository.save(patient);
            }
        }

        // Sinh số thứ tự vé khám theo định dạng [Mã phòng]-[Số thứ tự trong ngày]
        // Ví dụ: P.101 -> P101-001, P101-002
        long todayCount = queueTicketRepository.countTodayTicketsByRoom(today, room.getId());
        String roomCode = room.getRoomNumber().replace(".", "").replace(" ", "").toUpperCase();
        String ticketNumber = String.format("%s-%03d", roomCode, todayCount + 1);

        // Tính điểm ưu tiên (Priority Score Algorithm)
        int priorityScore = 0;
        boolean isEmergency = Boolean.TRUE.equals(request.getIsEmergency());
        boolean hasAppointment = request.getAppointmentId() != null;

        if (isEmergency) {
            priorityScore += 100; // Cấp cứu: lên đầu ngay lập tức
        }

        int currentYear = today.getYear();
        if (request.getPatientYearOfBirth() != null) {
            int age = currentYear - request.getPatientYearOfBirth();
            if (age >= 70 || age <= 6) {
                priorityScore += 30; // Ưu tiên người cao tuổi & trẻ nhỏ
            }
        }

        if (hasAppointment) {
            priorityScore += 20; // Ưu tiên bệnh nhân đã đặt trước
        }

        // Tính thời gian chờ ước tính: số người đang chờ * thời gian khám trung bình (15 phút)
        long waitingAhead = queueTicketRepository.findByTicketDateAndExaminationRoomIdAndStatusOrderByPriorityScoreDescCheckInTimeAsc(
                today, room.getId(), "WAITING"
        ).size();
        int avgConsultTime = (doctor != null && doctor.getAverageConsultationTime() != null)
                ? doctor.getAverageConsultationTime() : 15;
        int estimatedMinutes = (int) (waitingAhead * avgConsultTime);

        QueueTicket ticket = QueueTicket.builder()
                .ticketNumber(ticketNumber)
                .ticketDate(today)
                .examinationRoom(room)
                .doctor(doctor)
                .patient(patient)
                .patientName(request.getPatientName().trim())
                .patientPhone(request.getPatientPhone().trim())
                .patientYearOfBirth(request.getPatientYearOfBirth())
                .isEmergency(isEmergency)
                .hasAppointment(hasAppointment)
                .priorityScore(priorityScore)
                .status("WAITING")
                .checkInTime(now)
                .estimatedWaitingMinutes(estimatedMinutes)
                .notes(request.getNotes())
                .build();

        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Tiếp đón thành công: Vé số {} cho bệnh nhân {} (Điểm ưu tiên: {})", 
                ticketNumber, request.getPatientName(), priorityScore);

        // Broadcast sự kiện Real-time qua WebSocket
        broadcastQueueEvent("TICKET_CREATED", saved, "Đã cấp số thứ tự mới: " + ticketNumber);

        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse callNext(Long roomId) {
        LocalDate today = LocalDate.now();
        ExaminationRoom room = examinationRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", roomId));

        // Lấy danh sách bệnh nhân đang chờ sắp xếp theo điểm ưu tiên DESC, giờ check-in ASC
        List<QueueTicket> waitingList = queueTicketRepository
                .findByTicketDateAndExaminationRoomIdAndStatusOrderByPriorityScoreDescCheckInTimeAsc(today, roomId, "WAITING");

        if (waitingList.isEmpty()) {
            throw new BadRequestException("Không còn bệnh nhân nào đang chờ tại phòng " + room.getRoomNumber());
        }

        // Bệnh nhân có điểm ưu tiên cao nhất tiếp theo
        QueueTicket nextTicket = waitingList.get(0);
        nextTicket.setStatus("CALLED");
        nextTicket.setCallTime(LocalTime.now());

        QueueTicket saved = queueTicketRepository.save(nextTicket);
        log.info("-> Gọi số tiếp theo tại phòng {}: Vé {}", room.getRoomNumber(), saved.getTicketNumber());

        broadcastQueueEvent("TICKET_CALLED", saved, "Mời số " + saved.getTicketNumber() + " vào phòng " + room.getRoomNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse startExamination(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        ticket.setStatus("IN_PROGRESS");
        ticket.setStartTime(LocalTime.now());
        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Bắt đầu khám vé {}", saved.getTicketNumber());

        broadcastQueueEvent("TICKET_STARTED", saved, "Đang khám số " + saved.getTicketNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse completeExamination(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        ticket.setStatus("COMPLETED");
        ticket.setEndTime(LocalTime.now());
        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Hoàn thành khám vé {}", saved.getTicketNumber());

        broadcastQueueEvent("TICKET_COMPLETED", saved, "Số " + saved.getTicketNumber() + " đã hoàn thành khám");
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse skipTicket(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        ticket.setStatus("SKIPPED");
        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Bỏ qua lượt vé {}", saved.getTicketNumber());

        broadcastQueueEvent("TICKET_SKIPPED", saved, "Bỏ qua lượt số " + saved.getTicketNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse recallTicket(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        ticket.setStatus("CALLED");
        ticket.setCallTime(LocalTime.now());
        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Gọi lại vé đã nhỡ {}", saved.getTicketNumber());

        broadcastQueueEvent("TICKET_RECALLED", saved, "Gọi lại số nhỡ " + saved.getTicketNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse setEmergency(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        ticket.setIsEmergency(true);
        ticket.setPriorityScore(ticket.getPriorityScore() + 100);
        QueueTicket saved = queueTicketRepository.save(ticket);
        log.info("-> Đặt ưu tiên khẩn cấp cho vé {}", saved.getTicketNumber());

        broadcastQueueEvent("TICKET_EMERGENCY", saved, "Ưu tiên cấp cứu số " + saved.getTicketNumber());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public QueueTicketResponse getTicketById(Long ticketId) {
        QueueTicket ticket = queueTicketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketId));

        // Tự động liên kết hoặc tạo hồ sơ bệnh nhân nếu vé chưa có patient
        if (ticket.getPatient() == null && ticket.getPatientName() != null && !ticket.getPatientName().trim().isEmpty()) {
            Patient matchedPatient = null;
            List<Patient> allPatients = patientRepository.findAll();
            for (Patient p : allPatients) {
                if (p.getFullName() != null && p.getFullName().trim().equalsIgnoreCase(ticket.getPatientName().trim())) {
                    matchedPatient = p;
                    break;
                }
                if (ticket.getPatientPhone() != null && ticket.getPatientPhone().trim().equals(p.getPhoneNumber())) {
                    matchedPatient = p;
                    break;
                }
            }
            if (matchedPatient == null) {
                LocalDate dob = ticket.getPatientYearOfBirth() != null
                        ? LocalDate.of(ticket.getPatientYearOfBirth(), 1, 1)
                        : null;
                matchedPatient = Patient.builder()
                        .fullName(ticket.getPatientName().trim())
                        .gender("Chưa rõ")
                        .dateOfBirth(dob)
                        .emergencyContactPhone(ticket.getPatientPhone())
                        .bloodGroup(null)
                        .build();
                matchedPatient = patientRepository.save(matchedPatient);
            }
            ticket.setPatient(matchedPatient);
            ticket = queueTicketRepository.save(ticket);
        }

        return mapToResponse(ticket);
    }

    @Override
    @Transactional(readOnly = true)
    public RoomQueueOverviewResponse getRoomQueueOverview(Long roomId) {
        LocalDate today = LocalDate.now();
        ExaminationRoom room = examinationRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", roomId));

        // Tìm bác sĩ đang trực tại phòng
        Doctor doctor = null;
        List<WorkSchedule> schedules = workScheduleRepository.findByExaminationRoomIdAndWorkDate(roomId, today);
        if (!schedules.isEmpty()) {
            doctor = schedules.get(0).getDoctor();
        }

        // Lấy danh sách vé trong ngày của phòng
        List<QueueTicket> allTickets = queueTicketRepository
                .findByTicketDateAndExaminationRoomIdOrderByPriorityScoreDescCheckInTimeAsc(today, roomId);

        QueueTicket examining = allTickets.stream()
                .filter(t -> "IN_PROGRESS".equals(t.getStatus()))
                .findFirst().orElse(null);

        QueueTicket called = allTickets.stream()
                .filter(t -> "CALLED".equals(t.getStatus()))
                .findFirst().orElse(null);

        List<QueueTicketResponse> waiting = allTickets.stream()
                .filter(t -> "WAITING".equals(t.getStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        List<QueueTicketResponse> skipped = allTickets.stream()
                .filter(t -> "SKIPPED".equals(t.getStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        List<QueueTicketResponse> completed = allTickets.stream()
                .filter(t -> "COMPLETED".equals(t.getStatus()))
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        int avgTime = (doctor != null && doctor.getAverageConsultationTime() != null)
                ? doctor.getAverageConsultationTime() : 15;
        int estimatedWait = waiting.size() * avgTime;

        return RoomQueueOverviewResponse.builder()
                .examinationRoomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomName(room.getRoomName())
                .floor(room.getFloor())
                .doctorId(doctor != null ? doctor.getId() : null)
                .doctorName(doctor != null ? doctor.getFullName() : null)
                .specialtyName(doctor != null && doctor.getSpecialty() != null ? doctor.getSpecialty().getName() : null)
                .currentExaminingTicket(examining != null ? mapToResponse(examining) : null)
                .currentCalledTicket(called != null ? mapToResponse(called) : null)
                .waitingTickets(waiting)
                .skippedTickets(skipped)
                .completedTickets(completed)
                .totalWaitingCount(waiting.size())
                .totalExaminedCount(completed.size())
                .estimatedWaitMinutes(estimatedWait)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClinicDisplayBoardResponse> getClinicDisplayBoard() {
        LocalDate today = LocalDate.now();
        List<ExaminationRoom> rooms = examinationRoomRepository.findAllByOrderByRoomNumberAsc();
        List<ClinicDisplayBoardResponse> displayList = new ArrayList<>();

        for (ExaminationRoom room : rooms) {
            List<QueueTicket> tickets = queueTicketRepository
                    .findByTicketDateAndExaminationRoomIdOrderByPriorityScoreDescCheckInTimeAsc(today, room.getId());

            QueueTicket examining = tickets.stream()
                    .filter(t -> "IN_PROGRESS".equals(t.getStatus()))
                    .findFirst().orElse(null);

            QueueTicket called = tickets.stream()
                    .filter(t -> "CALLED".equals(t.getStatus()))
                    .findFirst().orElse(null);

            List<String> upcoming = tickets.stream()
                    .filter(t -> "WAITING".equals(t.getStatus()))
                    .limit(4)
                    .map(QueueTicket::getTicketNumber)
                    .collect(Collectors.toList());

            long waitingCount = tickets.stream().filter(t -> "WAITING".equals(t.getStatus())).count();

            Doctor doc = null;
            List<WorkSchedule> schedules = workScheduleRepository.findByExaminationRoomIdAndWorkDate(room.getId(), today);
            if (!schedules.isEmpty()) {
                doc = schedules.get(0).getDoctor();
            }

            displayList.add(ClinicDisplayBoardResponse.builder()
                    .roomId(room.getId())
                    .roomNumber(room.getRoomNumber())
                    .roomName(room.getRoomName())
                    .floor(room.getFloor())
                    .doctorName(doc != null ? doc.getFullName() : "Đang cập nhật")
                    .specialtyName(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getName() : "")
                    .currentExaminingTicketNumber(examining != null ? examining.getTicketNumber() : "--")
                    .currentExaminingPatientName(examining != null ? maskName(examining.getPatientName()) : "")
                    .currentCalledTicketNumber(called != null ? called.getTicketNumber() : "--")
                    .currentCalledPatientName(called != null ? maskName(called.getPatientName()) : "")
                    .upcomingTicketNumbers(upcoming)
                    .waitingCount((int) waitingCount)
                    .build());
        }

        return displayList;
    }

    @Override
    @Transactional(readOnly = true)
    public MyTicketStatusResponse getMyTicketStatus(String ticketNumber) {
        LocalDate today = LocalDate.now();
        QueueTicket ticket = queueTicketRepository.findByTicketNumberAndTicketDate(ticketNumber.trim().toUpperCase(), today)
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "mã số", ticketNumber));

        ExaminationRoom room = ticket.getExaminationRoom();
        Doctor doc = ticket.getDoctor();

        int aheadCount = 0;
        int position = 0;
        int waitMinutes = 0;

        if ("WAITING".equals(ticket.getStatus()) && room != null) {
            aheadCount = (int) queueTicketRepository.countWaitingAhead(
                    today, room.getId(), ticket.getPriorityScore(), ticket.getCheckInTime()
            );
            position = aheadCount + 1;
            waitMinutes = predictWaitingTimeWithML(aheadCount, doc, ticket);
        }

        return MyTicketStatusResponse.builder()
                .ticketNumber(ticket.getTicketNumber())
                .ticketDate(ticket.getTicketDate())
                .patientName(ticket.getPatientName())
                .status(ticket.getStatus())
                .priorityScore(ticket.getPriorityScore())
                .roomId(room != null ? room.getId() : null)
                .roomNumber(room != null ? room.getRoomNumber() : null)
                .roomName(room != null ? room.getRoomName() : null)
                .floor(room != null ? room.getFloor() : null)
                .doctorName(doc != null ? doc.getFullName() : null)
                .specialtyName(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getName() : null)
                .checkInTime(ticket.getCheckInTime())
                .callTime(ticket.getCallTime())
                .positionInQueue(position)
                .waitingAheadCount(aheadCount)
                .estimatedWaitingMinutes(waitMinutes)
                .build();
    }

    private void broadcastQueueEvent(String eventType, QueueTicket ticket, String message) {
        try {
            ExaminationRoom room = ticket.getExaminationRoom();
            Doctor doc = ticket.getDoctor();

            QueueEventMessage event = QueueEventMessage.builder()
                    .eventType(eventType)
                    .ticketId(ticket.getId())
                    .ticketNumber(ticket.getTicketNumber())
                    .patientName(ticket.getPatientName())
                    .roomId(room != null ? room.getId() : null)
                    .roomNumber(room != null ? room.getRoomNumber() : null)
                    .doctorName(doc != null ? doc.getFullName() : null)
                    .status(ticket.getStatus())
                    .priorityScore(ticket.getPriorityScore())
                    .message(message)
                    .build();

            // Broadcast toàn phòng khám (cho TV sảnh chờ)
            messagingTemplate.convertAndSend("/topic/queue/clinic", event);

            // Broadcast riêng cho phòng khám (cho lễ tân và bác sĩ của phòng đó)
            if (room != null) {
                messagingTemplate.convertAndSend("/topic/queue/room/" + room.getId(), event);
            }
        } catch (Exception e) {
            log.error("Lỗi khi gửi WebSocket message: {}", e.getMessage());
        }
    }

    private String maskName(String name) {
        if (name == null || name.isBlank()) return "";
        String[] parts = name.trim().split("\\s+");
        if (parts.length == 1) return parts[0];
        // Ẩn tên đệm để bảo mật thông tin trên TV công cộng: "Nguyễn Văn Hùng" -> "Nguyễn V. Hùng"
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (i == 0 || i == parts.length - 1) {
                sb.append(parts[i]).append(" ");
            } else {
                sb.append(parts[i].charAt(0)).append(". ");
            }
        }
        return sb.toString().trim();
    }

    private QueueTicketResponse mapToResponse(QueueTicket ticket) {
        ExaminationRoom room = ticket.getExaminationRoom();
        Doctor doc = ticket.getDoctor();

        return QueueTicketResponse.builder()
                .id(ticket.getId())
                .patientId(ticket.getPatient() != null ? ticket.getPatient().getId() : null)
                .ticketNumber(ticket.getTicketNumber())
                .ticketDate(ticket.getTicketDate())
                .patientName(ticket.getPatientName())
                .patientPhone(ticket.getPatientPhone())
                .patientYearOfBirth(ticket.getPatientYearOfBirth())
                .isEmergency(ticket.getIsEmergency())
                .hasAppointment(ticket.getHasAppointment())
                .priorityScore(ticket.getPriorityScore())
                .status(ticket.getStatus())
                .checkInTime(ticket.getCheckInTime())
                .callTime(ticket.getCallTime())
                .startTime(ticket.getStartTime())
                .endTime(ticket.getEndTime())
                .estimatedWaitingMinutes(ticket.getEstimatedWaitingMinutes())
                .notes(ticket.getNotes())
                .examinationRoomId(room != null ? room.getId() : null)
                .roomNumber(room != null ? room.getRoomNumber() : null)
                .roomName(room != null ? room.getRoomName() : null)
                .doctorId(doc != null ? doc.getId() : null)
                .doctorName(doc != null ? doc.getFullName() : null)
                .specialtyName(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getName() : null)
                .build();
    }

    private int predictWaitingTimeWithML(int aheadCount, Doctor doc, QueueTicket ticket) {
        if (aheadCount <= 0) return 2;
        int defaultWait = aheadCount * (doc != null && doc.getAverageConsultationTime() != null ? doc.getAverageConsultationTime() : 15);
        try {
            Map<String, Object> req = new HashMap<>();
            req.put("waiting_ahead", aheadCount);
            req.put("emergency_ahead", 0);
            req.put("specialty_id", (doc != null && doc.getSpecialty() != null && doc.getSpecialty().getId() != null) ? doc.getSpecialty().getId() : 1);
            req.put("doctor_exp", (doc != null && doc.getYearsOfExperience() != null) ? doc.getYearsOfExperience() : 8);
            req.put("has_appointment", Boolean.TRUE.equals(ticket.getHasAppointment()) ? 1 : 0);
            req.put("hour_of_day", LocalTime.now().getHour());
            req.put("day_of_week", LocalDate.now().getDayOfWeek().getValue() - 1);
            req.put("is_morning", LocalTime.now().getHour() < 12 ? 1 : 0);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(req, headers);

            ResponseEntity<Map> res = restTemplate.postForEntity(aiServiceUrl + "/api/ai/predict-waiting-time", entity, Map.class);
            if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                Map<String, Object> data = (Map<String, Object>) res.getBody().get("data");
                if (data != null && data.containsKey("predicted_minutes")) {
                    return ((Number) data.get("predicted_minutes")).intValue();
                }
            }
        } catch (Exception e) {
            log.warn("AI Service prediction unavailable, using heuristic waiting time: {}", e.getMessage());
        }
        return defaultWait;
    }
}
