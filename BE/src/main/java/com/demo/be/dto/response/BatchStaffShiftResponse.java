package com.demo.be.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchStaffShiftResponse {

    private int totalRequested;
    private int successCount;
    private int conflictCount;

    @Builder.Default
    private List<StaffShiftResponse> createdShifts = new ArrayList<>();

    @Builder.Default
    private List<String> conflictMessages = new ArrayList<>();
}
