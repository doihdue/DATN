package com.demo.be.service.ai;

import com.demo.be.dto.response.ChatReplyResponse;
import com.demo.be.dto.response.ChatReplyResponse.SpecialtySuggestion;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Bộ luật từ khóa (không dùng AI):
 *  - Luôn chạy trước để chặn các ca có dấu hiệu cấp cứu, không phụ thuộc vào câu trả lời của AI.
 *  - Làm phương án dự phòng khi Gemini chưa cấu hình, lỗi mạng, hết hạn mức hoặc trả về sai định dạng.
 * Tên khoa khớp với DataInitializer.
 */
@Component
public class RuleBasedChatAdvisor {

    private static final Pattern EMERGENCY_PATTERN = Pattern.compile(
            "dau nguc|tuc nguc|kho tho|co giat|bat tinh|ngat xiu|meo mieng|liet|chay mau nhieu|tu sat|muon chet");

    private record Rule(Pattern pattern, String specialty, String reason) {}

    // Thứ tự quan trọng: luật đứng trước được ưu tiên
    private static final List<Rule> RULES = List.of(
            new Rule(Pattern.compile("\\b(be|em be|tre|tre em|con toi|con em|chau be)\\b"),
                    "Khoa Nhi", "Phù hợp để khám và theo dõi các triệu chứng ở trẻ em."),
            new Rule(Pattern.compile("huyet ap|tim dap|hoi hop|danh trong nguc"),
                    "Khoa Tim mạch", "Phù hợp để kiểm tra huyết áp và các vấn đề về tim mạch."),
            new Rule(Pattern.compile("dau mat|do mat|cay mat|ngua mat|nhin mo|mo mat|thi luc|can thi"),
                    "Khoa Mắt", "Phù hợp để kiểm tra thị lực và các triệu chứng ở mắt."),
            new Rule(Pattern.compile("dau rang|sau rang|nhuc rang|e buot|nuou|rang khon"),
                    "Khoa Răng Hàm Mặt", "Phù hợp để khám các vấn đề về răng, nướu và khoang miệng."),
            new Rule(Pattern.compile("noi man|man do|phat ban|ngua|mun|di ung|da lieu"),
                    "Khoa Da Liễu", "Phù hợp để khám các triệu chứng dị ứng và bệnh ngoài da."),
            new Rule(Pattern.compile("dau hong|rat hong|\\bho\\b|so mui|nghet mui|ngat mui|dau tai|u tai|viem xoang"),
                    "Khoa Tai Mũi Họng", "Phù hợp để khám các triệu chứng ở tai, mũi và họng.")
    );

    public static final String EMERGENCY_MESSAGE =
            "Triệu chứng bạn mô tả có thể cần được xử trí y tế khẩn cấp. Vui lòng gọi 115 hoặc đến cơ sở cấp cứu " +
            "gần nhất ngay, không nên chờ đặt lịch khám.";

    public boolean isEmergency(String message) {
        return EMERGENCY_PATTERN.matcher(normalize(message)).find();
    }

    public ChatReplyResponse emergencyReply() {
        return ChatReplyResponse.builder()
                .content(EMERGENCY_MESSAGE)
                .isEmergency(true)
                .suggestedSpecialties(new ArrayList<>())
                .source(ChatReplyResponse.SOURCE_SAFETY_RULE)
                .build();
    }

    public ChatReplyResponse advise(String message) {
        if (isEmergency(message)) {
            ChatReplyResponse reply = emergencyReply();
            reply.setSource(ChatReplyResponse.SOURCE_FALLBACK);
            return reply;
        }

        String text = normalize(message);
        for (Rule rule : RULES) {
            if (rule.pattern().matcher(text).find()) {
                return fallback(
                        "Với những gì bạn mô tả, bạn có thể đăng ký khám tại " + rule.specialty() + ".\n\n" +
                        "Hãy đi khám sớm hơn nếu triệu chứng kéo dài, nặng lên hoặc xuất hiện thêm dấu hiệu bất thường. " +
                        "Bác sĩ sẽ là người đưa ra chẩn đoán sau khi thăm khám.",
                        new SpecialtySuggestion(rule.specialty(), rule.reason()));
            }
        }

        return fallback(
                "Bạn có thể cho tôi biết rõ hơn triệu chứng, vị trí khó chịu và thời gian xuất hiện không?\n\n" +
                "Nếu chưa rõ nên khám khoa nào, bạn có thể bắt đầu tại Khoa Khám bệnh tổng quát.",
                new SpecialtySuggestion("Khoa Khám bệnh tổng quát", "Phù hợp để sàng lọc ban đầu trước khi chuyển chuyên khoa."));
    }

    private ChatReplyResponse fallback(String content, SpecialtySuggestion suggestion) {
        return ChatReplyResponse.builder()
                .content(content)
                .isEmergency(false)
                .suggestedSpecialties(new ArrayList<>(List.of(suggestion)))
                .source(ChatReplyResponse.SOURCE_FALLBACK)
                .build();
    }

    // Bỏ dấu tiếng Việt và chuyển về chữ thường để so khớp từ khóa
    static String normalize(String text) {
        String lower = text == null ? "" : text.toLowerCase();
        return Normalizer.normalize(lower, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd');
    }
}
