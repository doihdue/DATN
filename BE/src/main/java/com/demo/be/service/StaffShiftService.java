package com.demo.be.service;

import com.demo.be.dto.request.BatchStaffShiftRequest;
import com.demo.be.dto.request.StaffShiftRequest;
import com.demo.be.dto.response.BatchStaffShiftResponse;
import com.demo.be.dto.response.ExaminationRoomResponse;
import com.demo.be.dto.response.LabTechResponse;
import com.demo.be.dto.response.StaffShiftResponse;

import java.time.LocalDate;
import java.util.List;

public interface StaffShiftService {

    List<StaffShiftResponse> getShifts(LocalDate startDate, LocalDate endDate, Long roomId);

    List<StaffShiftResponse> getMyShifts(LocalDate startDate, LocalDate endDate);

    StaffShiftResponse createShift(StaffShiftRequest request);

    BatchStaffShiftResponse createBatchShifts(BatchStaffShiftRequest request);

    StaffShiftResponse updateShift(Long id, StaffShiftRequest request);

    void deleteShift(Long id);

    List<ExaminationRoomResponse> getLabRooms();

    List<LabTechResponse> getLabTechs();
}
