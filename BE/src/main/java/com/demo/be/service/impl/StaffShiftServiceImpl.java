package com.demo.be.service.impl;

import com.demo.be.dto.request.BatchStaffShiftRequest;
import com.demo.be.dto.request.StaffShiftRequest;
import com.demo.be.dto.response.BatchStaffShiftResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.LabTechResponse;
import com.demo.be.dto.response.StaffShiftResponse;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.Employee;
import com.demo.be.model.LabTechnician;
import com.demo.be.model.ExaminationRoom;
import com.demo.be.model.StaffShift;
import com.demo.be.model.User;
import com.demo.be.repository.LabTechnicianRepository;
import com.demo.be.repository.ExaminationRoomRepository;
import com.demo.be.repository.StaffShiftRepository;
import com.demo.be.repository.UserRepository;
import com.demo.be.service.StaffShiftService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaffShiftServiceImpl implements StaffShiftService {

    private final StaffShiftRepository staffShiftRepository;
    private final LabTechnicianRepository labTechnicianRepository;
    private final ExaminationRoomRepository examinationRoomRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<StaffShiftResponse> getShifts(LocalDate startDate, LocalDate endDate, Long roomId) {
        LocalDate from = startOrThisWeek(startDate);
        return staffShiftRepository.findShifts(from, endOrOneYear(from, endDate)).stream()
                .filter(s -> roomId == null || roomId.equals(s.getRoom().getId()))
                .map(StaffShiftResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<StaffShiftResponse> getMyShifts(LocalDate startDate, LocalDate endDate) {
        LocalDate from = startOrThisWeek(startDate);
        return staffShiftRepository.findTechnicianShifts(getCurrentEmployee().getId(), from, endOrOneYear(from, endDate)).stream()
                .map(StaffShiftResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional
    public StaffShiftResponse createShift(StaffShiftRequest request) {
        LabTechnician employee = findTechnician(request.getEmployeeId());
        ExaminationRoom room = findLabRoom(request.getRoomId());
        validate(employee, room, request.getStartTime(), request.getEndTime());
        validateNotPastDate(request.getWorkDate());
        findClash(employee.getId(), request.getWorkDate(), request.getStartTime(), request.getEndTime(), null)
                .ifPresent(s -> { throw clashError(employee, s); });

        StaffShift saved = staffShiftRepository.save(StaffShift.builder()
                .technician(employee)
                .room(room)
                .workDate(request.getWorkDate())
                .shiftType(shiftTypeOf(request.getShiftType(), request.getStartTime()))
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .notes(trimToNull(request.getNotes()))
                .build());
        log.info("-> Đã xếp KTV {} trực phòng {} ngày {} ({}–{})", employee.getFullName(), room.getRoomNumber(),
                saved.getWorkDate(), saved.getStartTime(), saved.getEndTime());
        return StaffShiftResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public BatchStaffShiftResponse createBatchShifts(BatchStaffShiftRequest request) {
        LabTechnician employee = findTechnician(request.getEmployeeId());
        ExaminationRoom room = findLabRoom(request.getRoomId());
        validate(employee, room, request.getStartTime(), request.getEndTime());

        List<LocalDate> dates = request.getWorkDates().stream().distinct().sorted().toList();
        LocalDate first = dates.get(0);
        LocalDate last = dates.get(dates.size() - 1);
        validateNotPastDate(first);
        if (ChronoUnit.DAYS.between(first, last) > 180) {
            throw new BadRequestException("Chỉ xếp lịch tối đa 180 ngày trong một lần");
        }

        // Tải trước ca của KTV trong khoảng ngày để kiểm tra trùng giờ, không truy vấn từng ngày
        List<StaffShift> existing = new ArrayList<>(staffShiftRepository.findTechnicianShifts(employee.getId(), first, last));
        List<StaffShift> toSave = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();
        for (LocalDate date : dates) {
            Optional<StaffShift> clash = existing.stream()
                    .filter(s -> s.getWorkDate().equals(date) && overlaps(s, request.getStartTime(), request.getEndTime()))
                    .findFirst();
            if (clash.isPresent()) {
                conflicts.add(date + ": " + clashError(employee, clash.get()).getMessage());
                continue;
            }
            StaffShift shift = StaffShift.builder()
                    .technician(employee)
                    .room(room)
                    .workDate(date)
                    .shiftType(shiftTypeOf(request.getShiftType(), request.getStartTime()))
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .notes(trimToNull(request.getNotes()))
                    .build();
            toSave.add(shift);
            existing.add(shift);
        }

        List<StaffShift> saved = staffShiftRepository.saveAll(toSave);
        log.info("-> Đã xếp {} ca trực cho KTV {} tại phòng {} ({} ngày bị trùng)",
                saved.size(), employee.getFullName(), room.getRoomNumber(), conflicts.size());
        return BatchStaffShiftResponse.builder()
                .totalRequested(dates.size())
                .successCount(saved.size())
                .conflictCount(conflicts.size())
                .createdShifts(saved.stream().map(StaffShiftResponse::fromEntity).toList())
                .conflictMessages(conflicts)
                .build();
    }

    @Override
    @Transactional
    public StaffShiftResponse updateShift(Long id, StaffShiftRequest request) {
        StaffShift shift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ca trực KTV", "id", id));
        if (shift.getWorkDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể sửa ca trực của ngày đã qua");
        }
        LabTechnician employee = findTechnician(request.getEmployeeId());
        ExaminationRoom room = findLabRoom(request.getRoomId());
        validate(employee, room, request.getStartTime(), request.getEndTime());
        validateNotPastDate(request.getWorkDate());
        findClash(employee.getId(), request.getWorkDate(), request.getStartTime(), request.getEndTime(), id)
                .ifPresent(s -> { throw clashError(employee, s); });

        shift.setTechnician(employee);
        shift.setRoom(room);
        shift.setWorkDate(request.getWorkDate());
        shift.setShiftType(shiftTypeOf(request.getShiftType(), request.getStartTime()));
        shift.setStartTime(request.getStartTime());
        shift.setEndTime(request.getEndTime());
        shift.setNotes(trimToNull(request.getNotes()));
        StaffShift saved = staffShiftRepository.save(shift);
        log.info("-> Đã cập nhật ca trực KTV ID {}", id);
        return StaffShiftResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteShift(Long id) {
        StaffShift shift = staffShiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ca trực KTV", "id", id));
        if (shift.getWorkDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể xoá ca trực của ngày đã qua");
        }
        staffShiftRepository.delete(shift);
        log.info("-> Đã xoá ca trực KTV ID {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ExaminationRoomResponse> getLabRooms() {
        return examinationRoomRepository.findLabRooms().stream()
                .map(room -> ExaminationRoomResponse.builder()
                        .id(room.getId())
                        .roomNumber(room.getRoomNumber())
                        .roomName(room.getRoomName())
                        .floor(room.getFloor())
                        .roomType(room.getRoomType())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<LabTechResponse> getLabTechs() {
        return labTechnicianRepository.findAllByOrderByDepartmentDescFullNameAsc().stream()
                .map(LabTechResponse::fromEntity)
                .toList();
    }

    private LabTechnician findTechnician(Long id) {
        return labTechnicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kỹ thuật viên", "id", id));
    }

    private ExaminationRoom findLabRoom(Long id) {
        ExaminationRoom room = examinationRoomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Phòng cận lâm sàng", "id", id));
        if (!"XET_NGHIEM".equals(room.getRoomType()) && !"CHAN_DOAN_HINH_ANH".equals(room.getRoomType())) {
            throw new BadRequestException("Phòng " + room.getRoomNumber() + " không phải phòng cận lâm sàng");
        }
        return room;
    }

    // KTV phải thuộc khoa của phòng; giờ bắt đầu trước giờ kết thúc
    private void validate(LabTechnician employee, ExaminationRoom room, LocalTime start, LocalTime end) {
        if (!employee.getDepartment().equals(room.getRoomType())) {
            throw new BadRequestException(employee.getFullName() + " không thuộc khoa của phòng " + room.getRoomNumber());
        }
        if (!start.isBefore(end)) {
            throw new BadRequestException("Giờ bắt đầu phải trước giờ kết thúc");
        }
    }

    private void validateNotPastDate(LocalDate date) {
        if (date.isBefore(LocalDate.now())) {
            throw new BadRequestException("Không thể xếp ca vào ngày đã qua (" + date + ")");
        }
    }

    // Một KTV không trực 2 ca giao giờ nhau (kể cả ở 2 phòng khác nhau); excludeId = ca đang sửa
    private Optional<StaffShift> findClash(Long employeeId, LocalDate date, LocalTime start, LocalTime end, Long excludeId) {
        return staffShiftRepository.findTechnicianShifts(employeeId, date, date).stream()
                .filter(s -> !s.getId().equals(excludeId))
                .filter(s -> overlaps(s, start, end))
                .findFirst();
    }

    private boolean overlaps(StaffShift s, LocalTime start, LocalTime end) {
        return s.getStartTime().isBefore(end) && s.getEndTime().isAfter(start);
    }

    private BadRequestException clashError(Employee employee, StaffShift s) {
        return new BadRequestException(employee.getFullName() + " đã có ca " + s.getStartTime() + "–"
                + s.getEndTime() + " tại phòng " + s.getRoom().getRoomNumber() + " trùng giờ");
    }

    private LocalDate startOrThisWeek(LocalDate startDate) {
        return startDate != null ? startDate : LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    // Không truyền ngày kết thúc (xem danh sách) thì lấy tới 1 năm sau
    private LocalDate endOrOneYear(LocalDate from, LocalDate endDate) {
        return endDate != null ? endDate : from.plusYears(1);
    }

    private String shiftTypeOf(String requested, LocalTime start) {
        if (requested != null && !requested.isBlank()) return requested;
        int hour = start.getHour();
        return hour < 12 ? "CA_SÁNG" : hour < 18 ? "CA_CHIỀU" : "CA_TỐI";
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Employee getCurrentEmployee() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = auth != null ? userRepository.findByUsername(auth.getName()).orElse(null) : null;
        if (user == null || !(user.getPerson() instanceof Employee employee)) {
            throw new BadRequestException("Tài khoản hiện tại không gắn với hồ sơ nhân viên");
        }
        return employee;
    }
}
