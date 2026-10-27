package com.demo.be.service.impl;

import com.demo.be.dto.request.BatchWorkScheduleRequest;
import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.BatchWorkScheduleResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Appointment;
import com.demo.be.model.Doctor;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.User;
import com.demo.be.model.WorkSchedule;
import com.demo.be.repository.AppointmentRepository;
import com.demo.be.repository.DoctorRepository;
import com.demo.be.repository.ExaminationRoomRepository;
import com.demo.be.repository.UserRepository;
import com.demo.be.repository.WorkScheduleRepository;
import com.demo.be.service.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WorkScheduleServiceImpl implements WorkScheduleService {

    private final WorkScheduleRepository workScheduleRepository;
    private final DoctorRepository doctorRepository;
    private final ExaminationRoomRepository examinationRoomRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleResponse> getSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId,
            Long roomId
    ) {
        return workScheduleRepository.filterSchedules(startDate, endDate, doctorId, specialtyId, roomId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleResponse> getMySchedules(LocalDate startDate, LocalDate endDate) {
        // Bác sĩ xác định từ tài khoản đăng nhập, không nhận doctorId từ client
        Doctor doctor = getCurrentDoctor();
        return getSchedules(startDate, endDate, doctor.getId(), null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<WorkScheduleResponse> getBookableSchedules(
            LocalDate startDate,
            LocalDate endDate,
            Long doctorId,
            Long specialtyId
    ) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        return workScheduleRepository.findBookableSchedules(startDate, endDate, doctorId, specialtyId)
                .stream()
                // Bỏ các ca hôm nay đã kết thúc
                .filter(ws -> !ws.getWorkDate().equals(today) || ws.getEndTime().isAfter(now))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WorkScheduleResponse createSchedule(WorkScheduleRequest request) {
        validateTimeRange(request);
        validateNotPastDate(request.getWorkDate());

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));

        ExaminationRoom room = examinationRoomRepository.findById(request.getExaminationRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", request.getExaminationRoomId()));

        // 1. Kiểm tra xung đột lịch của Bác sĩ
        boolean doctorConflict = workScheduleRepository.hasDoctorConflict(
                doctor.getId(),
                request.getWorkDate(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );
        if (doctorConflict) {
            throw new BadRequestException("Bác sĩ " + doctor.getFullName() + 
                    " đã có ca làm việc khác trùng hoặc giao nhau với khung giờ này ngày " + request.getWorkDate());
        }

        // 2. Kiểm tra xung đột Phòng khám
        boolean roomConflict = workScheduleRepository.hasRoomConflict(
                room.getId(),
                request.getWorkDate(),
                request.getStartTime(),
                request.getEndTime(),
                null
        );
        if (roomConflict) {
            throw new BadRequestException("Phòng khám " + room.getRoomNumber() + " (" + room.getRoomName() + ")" +
                    " đã được xếp ca cho bác sĩ khác trong khung giờ này ngày " + request.getWorkDate());
        }

        String status = request.getStatus() != null && !request.getStatus().isBlank() 
                ? request.getStatus() : "AVAILABLE";

        WorkSchedule schedule = WorkSchedule.builder()
                .doctor(doctor)
                .examinationRoom(room)
                .workDate(request.getWorkDate())
                .shiftType(request.getShiftType() != null ? request.getShiftType() : determineShiftType(request.getStartTime()))
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .maxPatients(request.getMaxPatients())
                .currentBookedCount(0)
                .status(status)
                .build();

        WorkSchedule saved = workScheduleRepository.save(schedule);
        log.info("-> Đã tạo lịch làm việc mới: Bác sĩ {} tại phòng {} ngày {}", 
                doctor.getFullName(), room.getRoomNumber(), saved.getWorkDate());
        return mapToResponse(saved);
    }

    @Override
    @Transactional
    public BatchWorkScheduleResponse createBatchSchedules(BatchWorkScheduleRequest request) {
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new BadRequestException("Khoảng thời gian (Từ ngày - Đến ngày) không được để trống");
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new BadRequestException("Ngày bắt đầu không được sau ngày kết thúc");
        }
        validateNotPastDate(request.getStartDate());
        long daysDiff = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate());
        if (daysDiff > 180) {
            throw new BadRequestException("Khoảng thời gian đăng ký lịch định kỳ tối đa là 180 ngày (khoảng 6 tháng)");
        }
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BadRequestException("Giờ bắt đầu (" + request.getStartTime() + 
                    ") phải trước giờ kết thúc (" + request.getEndTime() + ")");
        }

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));

        ExaminationRoom room = examinationRoomRepository.findById(request.getExaminationRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", request.getExaminationRoomId()));

        List<Integer> daysOfWeek = request.getDaysOfWeek();
        String shiftType = request.getShiftType() != null && !request.getShiftType().isBlank()
                ? request.getShiftType()
                : determineShiftType(request.getStartTime());
        String status = request.getStatus() != null && !request.getStatus().isBlank()
                ? request.getStatus() : "AVAILABLE";

        // Tải trước các ca của bác sĩ và của phòng trong cả khoảng ngày (2 truy vấn),
        // thay vì mỗi ngày lại truy vấn kiểm tra trùng 2 lần
        List<WorkSchedule> doctorSchedules = workScheduleRepository
                .findDoctorSchedules(doctor.getId(), request.getStartDate(), request.getEndDate());
        List<WorkSchedule> roomSchedules = workScheduleRepository
                .filterSchedules(request.getStartDate(), request.getEndDate(), null, null, room.getId());

        List<WorkSchedule> newSchedules = new ArrayList<>();
        List<String> conflictMessages = new ArrayList<>();
        int totalRequested = 0;

        LocalDate curr = request.getStartDate();
        while (!curr.isAfter(request.getEndDate())) {
            int dayValue = curr.getDayOfWeek().getValue(); // 1 = Monday, ..., 7 = Sunday
            if (daysOfWeek != null && !daysOfWeek.isEmpty() && !daysOfWeek.contains(dayValue)) {
                curr = curr.plusDays(1);
                continue;
            }

            totalRequested++;

            // 1. Kiểm tra xung đột lịch Bác sĩ
            boolean doctorConflict = hasOverlap(doctorSchedules, curr, request.getStartTime(), request.getEndTime());
            if (doctorConflict) {
                conflictMessages.add("Ngày " + curr + ": Bác sĩ " + doctor.getFullName() + 
                        " đã có ca làm việc khác trong khung giờ " + request.getStartTime() + " - " + request.getEndTime());
                curr = curr.plusDays(1);
                continue;
            }

            // 2. Kiểm tra xung đột Phòng khám
            boolean roomConflict = hasOverlap(roomSchedules, curr, request.getStartTime(), request.getEndTime());
            if (roomConflict) {
                conflictMessages.add("Ngày " + curr + ": Phòng " + room.getRoomNumber() + " (" + room.getRoomName() + ")" +
                        " đã được xếp ca cho bác sĩ khác trong khung giờ này");
                curr = curr.plusDays(1);
                continue;
            }

            // Không xung đột -> Tạo ca (lưu một lần ở cuối)
            WorkSchedule schedule = WorkSchedule.builder()
                    .doctor(doctor)
                    .examinationRoom(room)
                    .workDate(curr)
                    .shiftType(shiftType)
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .maxPatients(request.getMaxPatients())
                    .currentBookedCount(0)
                    .status(status)
                    .build();

            newSchedules.add(schedule);
            curr = curr.plusDays(1);
        }

        List<WorkScheduleResponse> createdSchedules = workScheduleRepository.saveAll(newSchedules).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        log.info("-> Đăng ký lịch định kỳ hoàn tất: Bác sĩ {} tại phòng {}, tổng ngày: {}, tạo thành công: {}, xung đột: {}",
                doctor.getFullName(), room.getRoomNumber(), totalRequested, createdSchedules.size(), conflictMessages.size());

        return BatchWorkScheduleResponse.builder()
                .totalRequested(totalRequested)
                .successCount(createdSchedules.size())
                .conflictCount(conflictMessages.size())
                .createdSchedules(createdSchedules)
                .conflictMessages(conflictMessages)
                .build();
    }

    @Override
    @Transactional
    public WorkScheduleResponse cancelSchedule(Long id, String reason) {
        WorkSchedule schedule = workScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch làm việc", "id", id));
        if (schedule.getWorkDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể hủy ca làm việc đã diễn ra (ngày " + schedule.getWorkDate() + ")");
        }

        schedule.setStatus("CANCELLED");

        // Huỷ theo các lịch hẹn online còn hiệu lực của ca này
        List<Appointment> activeAppointments = appointmentRepository
                .findByWorkScheduleIdAndStatusIn(id, List.of("PENDING", "CONFIRMED"));
        for (Appointment appointment : activeAppointments) {
            appointment.setStatus("CANCELLED");
            appointment.setCancellationReason("Ca khám bị huỷ: " + reason);
        }
        appointmentRepository.saveAll(activeAppointments);
        schedule.setCurrentBookedCount(Math.max(0,
                (schedule.getCurrentBookedCount() != null ? schedule.getCurrentBookedCount() : 0) - activeAppointments.size()));

        WorkSchedule updated = workScheduleRepository.save(schedule);
        log.info("-> Đã hủy ca làm việc ID {}. Lý do: {}", id, reason);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public void deleteSchedule(Long id) {
        WorkSchedule schedule = workScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch làm việc", "id", id));
        if (schedule.getWorkDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể xóa ca làm việc đã diễn ra (ngày " + schedule.getWorkDate() + "), cần giữ lại để tra cứu lịch sử");
        }

        if (schedule.getCurrentBookedCount() > 0) {
            throw new BadRequestException("Không thể xóa ca làm việc vì đã có " + 
                    schedule.getCurrentBookedCount() + " bệnh nhân đặt lịch. Hãy chọn Hủy ca!");
        }

        workScheduleRepository.delete(schedule);
        log.info("-> Đã xóa hoàn toàn ca làm việc ID {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExaminationRoomResponse> getAllExaminationRooms() {
        return examinationRoomRepository.findAllByOrderByRoomNumberAsc().stream()
                .map(room -> ExaminationRoomResponse.builder()
                        .id(room.getId())
                        .roomNumber(room.getRoomNumber())
                        .roomName(room.getRoomName())
                        .floor(room.getFloor())
                        .build())
                .collect(Collectors.toList());
    }

    private void validateTimeRange(WorkScheduleRequest request) {
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new BadRequestException("Giờ bắt đầu (" + request.getStartTime() + 
                    ") phải trước giờ kết thúc (" + request.getEndTime() + ")");
        }
    }

    private void validateNotPastDate(LocalDate workDate) {
        if (workDate.isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể xếp ca vào ngày đã qua (" + workDate + ")");
        }
    }

    private Doctor getCurrentDoctor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BadRequestException("Không xác định được tài khoản bác sĩ đang đăng nhập");
        }
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", auth.getName()));
        if (!(user.getPerson() instanceof Doctor doctor)) {
            throw new BadRequestException("Tài khoản hiện tại không gắn với hồ sơ bác sĩ");
        }
        return doctor;
    }

    private String determineShiftType(LocalTime startTime) {
        if (startTime.getHour() < 12) {
            return "CA_SÁNG";
        } else if (startTime.getHour() < 18) {
            return "CA_CHIỀU";
        } else {
            return "CA_TỐI";
        }
    }

    // Ca chưa huỷ nào cùng ngày có khung giờ giao nhau với [startTime, endTime)
    private boolean hasOverlap(List<WorkSchedule> schedules, LocalDate date, LocalTime startTime, LocalTime endTime) {
        return schedules.stream()
                .filter(ws -> !"CANCELLED".equals(ws.getStatus()))
                .filter(ws -> date.equals(ws.getWorkDate()))
                .anyMatch(ws -> ws.getStartTime().isBefore(endTime) && ws.getEndTime().isAfter(startTime));
    }

    private WorkScheduleResponse mapToResponse(WorkSchedule schedule) {
        Doctor doc = schedule.getDoctor();
        ExaminationRoom room = schedule.getExaminationRoom();
        int booked = schedule.getCurrentBookedCount() != null ? schedule.getCurrentBookedCount() : 0;
        int max = schedule.getMaxPatients() != null ? schedule.getMaxPatients() : 0;
        int remaining = Math.max(0, max - booked);

        return WorkScheduleResponse.builder()
                .id(schedule.getId())
                .workDate(schedule.getWorkDate())
                .shiftType(schedule.getShiftType())
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .maxPatients(schedule.getMaxPatients())
                .currentBookedCount(booked)
                .remainingSlots(remaining)
                .status(schedule.getStatus())
                .doctorId(doc != null ? doc.getId() : null)
                .doctorName(doc != null ? doc.getFullName() : null)
                .academicTitle(doc != null ? doc.getAcademicTitle() : null)
                .specialtyId(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getId() : null)
                .specialtyName(doc != null && doc.getSpecialty() != null ? doc.getSpecialty().getName() : null)
                .examinationRoomId(room != null ? room.getId() : null)
                .roomNumber(room != null ? room.getRoomNumber() : null)
                .roomName(room != null ? room.getRoomName() : null)
                .floor(room != null ? room.getFloor() : null)
                .build();
    }
}
