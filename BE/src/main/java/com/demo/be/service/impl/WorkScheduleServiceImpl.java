package com.demo.be.service.impl;

import com.demo.be.dto.request.WorkScheduleRequest;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.WorkScheduleResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Appointment;
import com.demo.be.model.Doctor;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.WorkSchedule;
import com.demo.be.repository.AppointmentRepository;
import com.demo.be.repository.DoctorRepository;
import com.demo.be.repository.ExaminationRoomRepository;
import com.demo.be.repository.WorkScheduleRepository;
import com.demo.be.service.WorkScheduleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
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
    public WorkScheduleResponse getScheduleById(Long id) {
        WorkSchedule schedule = workScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch làm việc", "id", id));
        return mapToResponse(schedule);
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
                .shiftType(request.getShiftType() != null ? request.getShiftType() : determineShiftType(request))
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
    public WorkScheduleResponse updateSchedule(Long id, WorkScheduleRequest request) {
        validateTimeRange(request);

        WorkSchedule schedule = workScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch làm việc", "id", id));

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", "id", request.getDoctorId()));

        ExaminationRoom room = examinationRoomRepository.findById(request.getExaminationRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Phòng khám", "id", request.getExaminationRoomId()));

        // Kiểm tra xung đột trừ chính schedule này
        boolean doctorConflict = workScheduleRepository.hasDoctorConflict(
                doctor.getId(),
                request.getWorkDate(),
                request.getStartTime(),
                request.getEndTime(),
                id
        );
        if (doctorConflict) {
            throw new BadRequestException("Bác sĩ " + doctor.getFullName() + 
                    " đã có ca làm việc khác trùng khung giờ này ngày " + request.getWorkDate());
        }

        boolean roomConflict = workScheduleRepository.hasRoomConflict(
                room.getId(),
                request.getWorkDate(),
                request.getStartTime(),
                request.getEndTime(),
                id
        );
        if (roomConflict) {
            throw new BadRequestException("Phòng khám " + room.getRoomNumber() + 
                    " đã được xếp cho bác sĩ khác trong khung giờ này ngày " + request.getWorkDate());
        }

        if (request.getMaxPatients() < schedule.getCurrentBookedCount()) {
            throw new BadRequestException("Số lượng bệnh nhân tối đa không được nhỏ hơn số lượng bệnh nhân đã đặt trước (" + 
                    schedule.getCurrentBookedCount() + ")");
        }

        schedule.setDoctor(doctor);
        schedule.setExaminationRoom(room);
        schedule.setWorkDate(request.getWorkDate());
        schedule.setShiftType(request.getShiftType() != null ? request.getShiftType() : determineShiftType(request));
        schedule.setStartTime(request.getStartTime());
        schedule.setEndTime(request.getEndTime());
        schedule.setMaxPatients(request.getMaxPatients());
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            schedule.setStatus(request.getStatus());
        }

        WorkSchedule updated = workScheduleRepository.save(schedule);
        log.info("-> Đã cập nhật lịch làm việc ID {}", id);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public WorkScheduleResponse cancelSchedule(Long id, String reason) {
        WorkSchedule schedule = workScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch làm việc", "id", id));

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

    private String determineShiftType(WorkScheduleRequest request) {
        if (request.getStartTime().getHour() < 12) {
            return "CA_SÁNG";
        } else if (request.getStartTime().getHour() < 18) {
            return "CA_CHIỀU";
        } else {
            return "CA_TỐI";
        }
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
