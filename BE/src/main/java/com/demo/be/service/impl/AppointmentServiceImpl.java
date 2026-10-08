package com.demo.be.service.impl;

import com.demo.be.dto.request.BookAppointmentRequest;
import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.request.RescheduleAppointmentRequest;
import com.demo.be.dto.response.AppointmentResponse;
import com.demo.be.dto.response.QueueTicketResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.exception.AppException;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.*;
import com.demo.be.repository.AppointmentRepository;
import com.demo.be.repository.PatientRepository;
import com.demo.be.repository.QueueTicketRepository;
import com.demo.be.repository.UserRepository;
import com.demo.be.repository.WorkScheduleRepository;
import com.demo.be.service.AppointmentService;
import com.demo.be.service.QueueService;
import com.demo.be.service.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppointmentServiceImpl implements AppointmentService {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_CANCELLED = "CANCELLED";

    // Các trạng thái đang giữ chỗ trong ca làm việc
    private static final Set<String> SLOT_HOLDING_STATUSES =
            Set.of(STATUS_PENDING, STATUS_CONFIRMED, STATUS_CHECKED_IN, STATUS_COMPLETED);

    // Các trạng thái bệnh nhân còn có thể huỷ / đổi lịch
    private static final Set<String> MODIFIABLE_STATUSES = Set.of(STATUS_PENDING, STATUS_CONFIRMED);

    private static final DateTimeFormatter CODE_DATE_FORMAT = DateTimeFormatter.ofPattern("yyMMdd");

    private final AppointmentRepository appointmentRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final QueueTicketRepository queueTicketRepository;
    private final WorkScheduleService workScheduleService;
    private final QueueService queueService;

    // Bệnh nhân chỉ được huỷ/đổi lịch trước giờ khám dự kiến ít nhất N giờ
    @Value("${appointment.change-deadline-hours:2}")
    private int changeDeadlineHours;

    // Chỉ cho phép đặt trước tối đa N ngày
    @Value("${appointment.max-days-ahead:30}")
    private int maxDaysAhead;

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleResponse> getAvailableSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId
    ) {
        LocalDate today = LocalDate.now();
        LocalDate lastBookableDate = today.plusDays(maxDaysAhead);

        LocalDate from = (startDate == null || startDate.isBefore(today)) ? today : startDate;
        LocalDate to = (endDate == null || endDate.isAfter(lastBookableDate)) ? lastBookableDate : endDate;
        if (to.isBefore(from)) {
            return List.of();
        }
        return workScheduleService.getBookableSchedules(from, to, doctorId, specialtyId);
    }

    @Override
    @Transactional
    public AppointmentResponse bookAppointment(Long userId, BookAppointmentRequest request) {
        Patient patient = getPatientOfUser(userId);
        WorkSchedule schedule = workScheduleRepository.findByIdForUpdate(request.getWorkScheduleId())
                .orElseThrow(() -> new ResourceNotFoundException("Ca khám", "id", request.getWorkScheduleId()));

        validateBookable(schedule);
        ensureNoDuplicateBooking(patient, schedule, null);

        int bookingNumber = nextBookingNumber(schedule);
        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(schedule.getDoctor())
                .workSchedule(schedule)
                .appointmentDate(schedule.getWorkDate())
                .bookingNumber(bookingNumber)
                .estimatedStartTime(estimateStartTime(schedule, bookingNumber))
                .reasonForVisit(trimToNull(request.getReasonForVisit()))
                .status(STATUS_PENDING)
                .build();

        appointment = appointmentRepository.save(appointment);
        appointment.setAppointmentCode(String.format("LH%s-%04d",
                schedule.getWorkDate().format(CODE_DATE_FORMAT), appointment.getId()));

        occupySlot(schedule);

        log.info("-> Bệnh nhân {} đặt lịch {} với bác sĩ {} ngày {} (STT {})",
                patient.getFullName(), appointment.getAppointmentCode(),
                schedule.getDoctor().getFullName(), schedule.getWorkDate(), bookingNumber);
        return mapToResponse(appointment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> getMyAppointments(Long userId) {
        Patient patient = getPatientOfUser(userId);
        return appointmentRepository.findByPatientIdOrderByAppointmentDateDescEstimatedStartTimeDesc(patient.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AppointmentResponse rescheduleAppointment(Long id, Long userId, boolean isStaff,
                                                     RescheduleAppointmentRequest request) {
        Appointment appointment = findAppointment(id);
        if (!isStaff) {
            ensureOwner(appointment, userId);
            ensureBeforeDeadline(appointment, "đổi");
        }
        ensureModifiable(appointment, "đổi");

        WorkSchedule oldSchedule = appointment.getWorkSchedule();
        Long newScheduleId = request.getNewWorkScheduleId();
        if (oldSchedule != null && oldSchedule.getId().equals(newScheduleId)) {
            throw new BadRequestException("Ca khám mới trùng với ca khám hiện tại");
        }

        // Khoá cả 2 ca theo thứ tự id tăng dần để tránh deadlock khi 2 người đổi chéo nhau
        WorkSchedule newSchedule;
        if (oldSchedule != null && oldSchedule.getId() < newScheduleId) {
            oldSchedule = lockSchedule(oldSchedule.getId());
            newSchedule = lockSchedule(newScheduleId);
        } else {
            newSchedule = lockSchedule(newScheduleId);
            if (oldSchedule != null) {
                oldSchedule = lockSchedule(oldSchedule.getId());
            }
        }

        validateBookable(newSchedule);
        ensureNoDuplicateBooking(appointment.getPatient(), newSchedule, appointment.getId());

        if (oldSchedule != null) {
            releaseSlot(oldSchedule);
        }

        int bookingNumber = nextBookingNumber(newSchedule);
        appointment.setWorkSchedule(newSchedule);
        appointment.setDoctor(newSchedule.getDoctor());
        appointment.setAppointmentDate(newSchedule.getWorkDate());
        appointment.setBookingNumber(bookingNumber);
        appointment.setEstimatedStartTime(estimateStartTime(newSchedule, bookingNumber));
        // Lịch đã đổi cần lễ tân xác nhận lại
        appointment.setStatus(STATUS_PENDING);
        appointment.setConfirmedAt(null);

        occupySlot(newSchedule);

        log.info("-> Đổi lịch {} sang ca {} ngày {}", appointment.getAppointmentCode(),
                newSchedule.getId(), newSchedule.getWorkDate());
        return mapToResponse(appointmentRepository.save(appointment));
    }

    @Override
    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(Long id, Long userId, boolean isStaff) {
        Appointment appointment = findAppointment(id);
        if (!isStaff) {
            ensureOwner(appointment, userId);
        }
        return mapToResponse(appointment);
    }

    @Override
    @Transactional
    public AppointmentResponse cancelAppointment(Long id, Long userId, boolean isStaff, String reason) {
        Appointment appointment = findAppointment(id);
        if (!isStaff) {
            ensureOwner(appointment, userId);
            ensureBeforeDeadline(appointment, "huỷ");
        }
        ensureModifiable(appointment, "huỷ");

        if (appointment.getWorkSchedule() != null) {
            releaseSlot(lockSchedule(appointment.getWorkSchedule().getId()));
        }

        String defaultReason = isStaff ? "Phòng khám huỷ lịch hẹn" : "Bệnh nhân tự huỷ lịch";
        appointment.setStatus(STATUS_CANCELLED);
        appointment.setCancellationReason(reason != null && !reason.isBlank() ? reason.trim() : defaultReason);

        log.info("-> Đã huỷ lịch hẹn {} (Lý do: {})", appointment.getAppointmentCode(), appointment.getCancellationReason());
        return mapToResponse(appointmentRepository.save(appointment));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppointmentResponse> searchAppointments(LocalDate date, String status, Long doctorId, String keyword) {
        return appointmentRepository.searchAppointments(date, trimToNull(status), doctorId, trimToNull(keyword))
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AppointmentResponse confirmAppointment(Long id) {
        Appointment appointment = findAppointment(id);
        if (!STATUS_PENDING.equals(appointment.getStatus())) {
            throw new BadRequestException("Chỉ có thể xác nhận lịch hẹn đang chờ xác nhận (trạng thái hiện tại: "
                    + appointment.getStatus() + ")");
        }
        appointment.setStatus(STATUS_CONFIRMED);
        appointment.setConfirmedAt(LocalDateTime.now());

        log.info("-> Lễ tân xác nhận lịch hẹn {}", appointment.getAppointmentCode());
        return mapToResponse(appointmentRepository.save(appointment));
    }

    @Override
    @Transactional
    public QueueTicketResponse checkInAppointment(Long id) {
        Appointment appointment = findAppointment(id);
        ensureModifiable(appointment, "check-in");

        if (!LocalDate.now().equals(appointment.getAppointmentDate())) {
            throw new BadRequestException("Lịch hẹn " + appointment.getAppointmentCode() + " là của ngày "
                    + appointment.getAppointmentDate() + ", chỉ có thể check-in đúng ngày hẹn");
        }

        WorkSchedule schedule = appointment.getWorkSchedule();
        if (schedule == null || schedule.getExaminationRoom() == null) {
            throw new BadRequestException("Lịch hẹn chưa được gán phòng khám, vui lòng cấp số thủ công");
        }

        Patient patient = appointment.getPatient();
        String phone = patient.getPhoneNumber();
        CheckInRequest checkInRequest = CheckInRequest.builder()
                .patientId(patient.getId())
                .patientName(patient.getFullName())
                .patientPhone(phone != null ? phone : "")
                .patientDob(patient.getDateOfBirth())
                .examinationRoomId(schedule.getExaminationRoom().getId())
                .doctorId(appointment.getDoctor() != null ? appointment.getDoctor().getId() : null)
                .appointmentId(appointment.getId())
                .isEmergency(false)
                .notes("[Lịch hẹn " + appointment.getAppointmentCode() + "]"
                        + (appointment.getReasonForVisit() != null ? " " + appointment.getReasonForVisit() : ""))
                .build();

        QueueTicketResponse ticketResponse = queueService.checkIn(checkInRequest);
        QueueTicket ticket = queueTicketRepository.findById(ticketResponse.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Vé khám", "id", ticketResponse.getId()));

        appointment.setQueueTicket(ticket);
        appointment.setStatus(STATUS_CHECKED_IN);
        if (appointment.getConfirmedAt() == null) {
            appointment.setConfirmedAt(LocalDateTime.now());
        }
        appointmentRepository.save(appointment);

        log.info("-> Check-in lịch hẹn {} -> vé {}", appointment.getAppointmentCode(), ticket.getTicketNumber());
        return ticketResponse;
    }

    // ================= Helpers =================

    private Patient getPatientOfUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản", "id", userId));
        if (user.getPerson() == null) {
            throw new BadRequestException("Tài khoản chưa có hồ sơ bệnh nhân");
        }
        return patientRepository.findById(user.getPerson().getId())
                .orElseThrow(() -> new BadRequestException("Chỉ tài khoản bệnh nhân mới có thể đặt lịch khám"));
    }

    private Appointment findAppointment(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", "id", id));
    }

    private WorkSchedule lockSchedule(Long scheduleId) {
        return workScheduleRepository.findByIdForUpdate(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Ca khám", "id", scheduleId));
    }

    private void ensureOwner(Appointment appointment, Long userId) {
        Patient patient = getPatientOfUser(userId);
        if (appointment.getPatient() == null || !appointment.getPatient().getId().equals(patient.getId())) {
            throw new AppException("Bạn không có quyền thao tác trên lịch hẹn này", HttpStatus.FORBIDDEN);
        }
    }

    private void ensureModifiable(Appointment appointment, String action) {
        if (!MODIFIABLE_STATUSES.contains(appointment.getStatus())) {
            throw new BadRequestException("Không thể " + action + " lịch hẹn ở trạng thái " + appointment.getStatus());
        }
    }

    private void ensureBeforeDeadline(Appointment appointment, String action) {
        LocalDateTime deadline = changeDeadline(appointment);
        if (!LocalDateTime.now().isBefore(deadline)) {
            throw new BadRequestException("Đã quá hạn " + action + " lịch online (phải trước giờ khám ít nhất "
                    + changeDeadlineHours + " giờ). Vui lòng liên hệ quầy lễ tân.");
        }
    }

    private void validateBookable(WorkSchedule schedule) {
        LocalDate today = LocalDate.now();

        if (!"AVAILABLE".equals(schedule.getStatus())) {
            throw new BadRequestException("Ca khám này hiện không nhận đặt lịch (trạng thái: " + schedule.getStatus() + ")");
        }
        if (schedule.getDoctor() == null) {
            throw new BadRequestException("Ca khám chưa có bác sĩ phụ trách");
        }
        if (schedule.getWorkDate().isBefore(today)
                || (schedule.getWorkDate().equals(today) && !schedule.getEndTime().isAfter(LocalTime.now()))) {
            throw new BadRequestException("Ca khám đã kết thúc, vui lòng chọn ca khác");
        }
        if (schedule.getWorkDate().isAfter(today.plusDays(maxDaysAhead))) {
            throw new BadRequestException("Chỉ được đặt lịch trước tối đa " + maxDaysAhead + " ngày");
        }
        int booked = schedule.getCurrentBookedCount() != null ? schedule.getCurrentBookedCount() : 0;
        int max = schedule.getMaxPatients() != null ? schedule.getMaxPatients() : 0;
        if (booked >= max) {
            throw new BadRequestException("Ca khám đã đủ số lượng bệnh nhân, vui lòng chọn ca khác");
        }
    }

    private void ensureNoDuplicateBooking(Patient patient, WorkSchedule schedule, Long excludeAppointmentId) {
        boolean duplicated = appointmentRepository.existsActiveForPatientDoctorDate(
                patient.getId(),
                schedule.getDoctor().getId(),
                schedule.getWorkDate(),
                MODIFIABLE_STATUSES,
                excludeAppointmentId
        );
        if (duplicated) {
            throw new BadRequestException("Bạn đã có lịch hẹn với bác sĩ " + schedule.getDoctor().getFullName()
                    + " vào ngày " + schedule.getWorkDate());
        }
    }

    // Lấy số thứ tự nhỏ nhất còn trống trong ca (tái sử dụng số của lịch đã huỷ)
    private int nextBookingNumber(WorkSchedule schedule) {
        Set<Integer> used = appointmentRepository
                .findByWorkScheduleIdAndStatusIn(schedule.getId(), SLOT_HOLDING_STATUSES)
                .stream()
                .map(Appointment::getBookingNumber)
                .filter(n -> n != null)
                .collect(Collectors.toSet());
        int number = 1;
        while (used.contains(number)) {
            number++;
        }
        return number;
    }

    // Chia đều thời lượng ca cho số bệnh nhân tối đa để ước tính giờ khám
    private LocalTime estimateStartTime(WorkSchedule schedule, int bookingNumber) {
        long shiftMinutes = Duration.between(schedule.getStartTime(), schedule.getEndTime()).toMinutes();
        int max = schedule.getMaxPatients() != null && schedule.getMaxPatients() > 0 ? schedule.getMaxPatients() : 1;
        long slotMinutes = Math.max(1, shiftMinutes / max);
        return schedule.getStartTime().plusMinutes(slotMinutes * (bookingNumber - 1));
    }

    private void occupySlot(WorkSchedule schedule) {
        int booked = (schedule.getCurrentBookedCount() != null ? schedule.getCurrentBookedCount() : 0) + 1;
        schedule.setCurrentBookedCount(booked);
        if (schedule.getMaxPatients() != null && booked >= schedule.getMaxPatients()) {
            schedule.setStatus("FULL");
        }
        workScheduleRepository.save(schedule);
    }

    private void releaseSlot(WorkSchedule schedule) {
        int booked = Math.max(0, (schedule.getCurrentBookedCount() != null ? schedule.getCurrentBookedCount() : 0) - 1);
        schedule.setCurrentBookedCount(booked);
        if ("FULL".equals(schedule.getStatus()) && booked < schedule.getMaxPatients()) {
            schedule.setStatus("AVAILABLE");
        }
        workScheduleRepository.save(schedule);
    }

    private LocalDateTime changeDeadline(Appointment appointment) {
        LocalTime time = appointment.getEstimatedStartTime();
        if (time == null && appointment.getWorkSchedule() != null) {
            time = appointment.getWorkSchedule().getStartTime();
        }
        return appointment.getAppointmentDate()
                .atTime(time != null ? time : LocalTime.MIDNIGHT)
                .minusHours(changeDeadlineHours);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        Patient patient = appointment.getPatient();
        Doctor doc = appointment.getDoctor();
        WorkSchedule schedule = appointment.getWorkSchedule();
        ExaminationRoom room = schedule != null ? schedule.getExaminationRoom() : null;
        QueueTicket ticket = appointment.getQueueTicket();

        LocalDateTime deadline = changeDeadline(appointment);
        boolean canModify = MODIFIABLE_STATUSES.contains(appointment.getStatus())
                && LocalDateTime.now().isBefore(deadline);

        return AppointmentResponse.builder()
                .id(appointment.getId())
                .appointmentCode(appointment.getAppointmentCode())
                .bookingNumber(appointment.getBookingNumber())
                .appointmentDate(appointment.getAppointmentDate())
                .estimatedStartTime(appointment.getEstimatedStartTime())
                .reasonForVisit(appointment.getReasonForVisit())
                .status(appointment.getStatus())
                .cancellationReason(appointment.getCancellationReason())
                .createdAt(appointment.getCreatedAt())
                .confirmedAt(appointment.getConfirmedAt())
                .changeDeadline(deadline)
                .canModify(canModify)
                .patientId(patient != null ? patient.getId() : null)
                .patientName(patient != null ? patient.getFullName() : null)
                .patientPhone(patient != null ? patient.getPhoneNumber() : null)
                .patientDob(patient != null ? patient.getDateOfBirth() : null)
                .doctorId(doc != null ? doc.getId() : null)
                .doctorName(doc != null ? doc.getFullName() : null)
                .academicTitle(doc != null ? doc.getAcademicTitle() : null)
                .specialtyId(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getId() : null)
                .specialtyName(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getName() : null)
                .workScheduleId(schedule != null ? schedule.getId() : null)
                .shiftType(schedule != null ? schedule.getShiftType() : null)
                .shiftStartTime(schedule != null ? schedule.getStartTime() : null)
                .shiftEndTime(schedule != null ? schedule.getEndTime() : null)
                .examinationRoomId(room != null ? room.getId() : null)
                .roomNumber(room != null ? room.getRoomNumber() : null)
                .roomName(room != null ? room.getRoomName() : null)
                .floor(room != null ? room.getFloor() : null)
                .queueTicketId(ticket != null ? ticket.getId() : null)
                .queueTicketNumber(ticket != null ? ticket.getTicketNumber() : null)
                .build();
    }
}
