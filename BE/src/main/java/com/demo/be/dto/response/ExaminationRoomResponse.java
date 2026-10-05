package com.demo.be.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExaminationRoomResponse {

    private Long id;
    private String roomNumber;
    private String roomName;
    private Integer floor;
}
