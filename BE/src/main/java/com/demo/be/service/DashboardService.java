package com.demo.be.service;

import com.demo.be.dto.dashboard.DashboardOverviewResponse;

public interface DashboardService {
    DashboardOverviewResponse getOverview(String period, Long roomId);
}
