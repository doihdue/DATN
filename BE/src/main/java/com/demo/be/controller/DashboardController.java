package com.demo.be.controller;

import com.demo.be.dto.dashboard.DashboardOverviewResponse;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DashboardOverviewResponse>> getOverview(
            @RequestParam(defaultValue = "WEEK") String period,
            @RequestParam(required = false) Long roomId
    ) {
        DashboardOverviewResponse response = dashboardService.getOverview(period, roomId);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy dữ liệu thống kê dashboard thành công"));
    }
}
