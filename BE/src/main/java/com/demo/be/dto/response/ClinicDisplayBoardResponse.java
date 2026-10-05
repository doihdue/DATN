package com.demo.be.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClinicDisplayBoardResponse {

    private Long roomId;
    private String roomNumber;
    private String roomName;
    private Integer floor;
    private String doctorName;
    private String specialtyName;

    // Số đang khám
    private String currentExaminingTicketNumber;
    private String currentExaminingPatientName;

    // Số đang gọi
    private String currentCalledTicketNumber;
    private String currentCalledPatientName;

    // Các số kế tiếp chuẩn bị vào
    @Builder.Default
    private List<String> upcomingTicketNumbers = new ArrayList<>();

    private int waitingCount;
}
