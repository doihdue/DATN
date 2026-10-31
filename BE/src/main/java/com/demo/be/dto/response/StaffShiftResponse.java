package com.demo.be.dto.response;

import com.demo.be.model.StaffShift;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StaffShiftResponse {

    private Long id;
    private Long employeeId;
    private String employeeName;
    private String employeeCode;
    private String department;
    private Long roomId;
    private String roomNumber;
    private String roomName;
    private LocalDate workDate;
    private String shiftType;
    private LocalTime startTime;
    private LocalTime endTime;
    private String notes;

    public static StaffShiftResponse fromEntity(StaffShift s) {
        return StaffShiftResponse.builder()
                .id(s.getId())
                .employeeId(s.getTechnician().getId())
                .employeeName(s.getTechnician().getFullName())
                .employeeCode(s.getTechnician().getEmployeeCode())
                .department(s.getTechnician().getDepartment())
                .roomId(s.getRoom().getId())
                .roomNumber(s.getRoom().getRoomNumber())
                .roomName(s.getRoom().getRoomName())
                .workDate(s.getWorkDate())
                .shiftType(s.getShiftType())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .notes(s.getNotes())
                .build();
    }
}
