package com.demo.be.dto.response;

import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Một tin nhắn trong lịch sử phiên chat, dùng để hiện lại cuộc trò chuyện sau khi tải lại trang. */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatHistoryMessageResponse {

    private Long id;
    private String sender;
    private String content;
    private LocalDateTime createdAt;
    private Boolean isEmergency;
    private String source;

    @Builder.Default
    private List<ChatReplyResponse.SpecialtySuggestion> suggestedSpecialties = new ArrayList<>();

    // Khoa đã tra lịch ở tin nhắn này; không trả lại danh sách ca vì số chỗ còn trống có thể đã thay đổi
    private String bookingSpecialty;
}
