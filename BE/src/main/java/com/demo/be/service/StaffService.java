package com.demo.be.service;

import com.demo.be.dto.request.StaffRequest;
import com.demo.be.dto.response.StaffResponse;

import java.util.List;

public interface StaffService {
    List<StaffResponse> searchStaff(String keyword, String status);
    StaffResponse getStaffById(Long id);
    StaffResponse createStaff(StaffRequest request);
    StaffResponse updateStaff(Long id, StaffRequest request);
    StaffResponse updateStatus(Long id, String status);
    void deleteStaff(Long id);
}
