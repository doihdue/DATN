package com.demo.be.dto.response;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatReplyResponse {

    public static final String SOURCE_AI = "AI";
    public static final String SOURCE_SAFETY_RULE = "SAFETY_RULE";
    public static final String SOURCE_FALLBACK = "FALLBACK";

    private String sessionKey;
    private String content;
    // Dùng Boolean (không phải boolean) để JSON giữ đúng tên trường "isEmergency" như phía Angular
    private Boolean isEmergency;
    @Builder.Default
    private List<SpecialtySuggestion> suggestedSpecialties = new ArrayList<>();
    // AI = Gemini trả lời; SAFETY_RULE = luật cấp cứu chặn trước; FALLBACK = AI lỗi/chưa cấu hình, dùng luật từ khóa
    private String source;
    // Model Gemini thực sự đã trả lời (có thể là model dự phòng); null nếu không dùng AI
    private String model;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SpecialtySuggestion {
        private String name;
        private String reason;
    }
}
