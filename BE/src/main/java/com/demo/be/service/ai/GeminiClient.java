package com.demo.be.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Gọi Google Gemini API (generateContent) và yêu cầu trả về JSON theo schema cho trước.
 * API key đọc từ biến môi trường GEMINI_API_KEY, không ghi thẳng vào mã nguồn.
 */
@Slf4j
@Component
public class GeminiClient {

    public record Turn(String role, String text) {
        public static Turn user(String text) { return new Turn("user", text); }
        public static Turn model(String text) { return new Turn("model", text); }
    }

    /** Nội dung model sinh ra và tên model thực sự đã trả lời. */
    public record GeminiResult(String text, String model) {}

    // Lỗi tạm thời / lỗi theo từng model: thử model kế tiếp thay vì bỏ cuộc
    // 404 = model đã ngừng cấp, 429 = hết hạn mức của model đó, 500/503 = model quá tải
    private static final Set<Integer> RETRY_WITH_NEXT_MODEL = Set.of(404, 429, 500, 503);

    public static class GeminiException extends RuntimeException {
        public GeminiException(String message) { super(message); }
        public GeminiException(String message, Throwable cause) { super(message, cause); }
    }

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String apiKey;
    private final List<String> models;
    private final double temperature;

    public GeminiClient(
            ObjectMapper objectMapper,
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-flash-lite-latest}") String model,
            @Value("${gemini.fallback-models:gemini-flash-latest}") List<String> fallbackModels,
            @Value("${gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
            @Value("${gemini.timeout-seconds:15}") int timeoutSeconds,
            @Value("${gemini.temperature:0.3}") double temperature
    ) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.models = new ArrayList<>();
        for (String m : concat(model, fallbackModels)) {
            if (StringUtils.hasText(m) && !this.models.contains(m.trim())) {
                this.models.add(m.trim());
            }
        }
        this.temperature = temperature;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(10));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(apiKey);
    }

    /**
     * Gửi hội thoại và trả về chuỗi JSON mà model sinh ra (đã khớp responseSchema).
     * Thử lần lượt model chính rồi tới các model dự phòng nếu model trước bị quá tải / hết hạn mức.
     */
    public GeminiResult generateJson(String systemInstruction, List<Turn> turns, Map<String, Object> responseSchema) {
        if (!isConfigured()) {
            throw new GeminiException("Chưa cấu hình GEMINI_API_KEY");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemInstruction))));
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Turn turn : turns) {
            contents.add(Map.of("role", turn.role(), "parts", List.of(Map.of("text", turn.text()))));
        }
        body.put("contents", contents);
        body.put("generationConfig", Map.of(
                "temperature", temperature,
                "responseMimeType", "application/json",
                "responseSchema", responseSchema
        ));

        String json;
        try {
            json = objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw new GeminiException("Không tạo được yêu cầu gửi Gemini", e);
        }

        GeminiException lastError = null;
        for (String model : models) {
            try {
                String responseBody = restClient.post()
                        .uri("/models/{model}:generateContent", model)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(json)
                        .retrieve()
                        .body(String.class);
                return new GeminiResult(extractText(responseBody), model);
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                lastError = new GeminiException("Gemini (" + model + ") trả về HTTP " + status + ": "
                        + abbreviate(e.getResponseBodyAsString()), e);
                if (!RETRY_WITH_NEXT_MODEL.contains(status)) {
                    throw lastError; // 400/403: sai key hoặc sai yêu cầu, đổi model cũng không khắc phục được
                }
                log.warn("Model {} không khả dụng (HTTP {}), thử model dự phòng", model, status);
            } catch (ResourceAccessException e) {
                // Hết thời gian chờ / lỗi mạng: model quá tải thường treo thay vì trả 503, nên cũng chuyển model
                lastError = new GeminiException("Gemini (" + model + ") không phản hồi: " + e.getMessage(), e);
                log.warn("Model {} không phản hồi kịp ({}), thử model dự phòng", model, e.getMessage());
            } catch (GeminiException e) {
                throw e;
            } catch (Exception e) {
                throw new GeminiException("Không gọi được Gemini (" + model + "): " + e.getMessage(), e);
            }
        }
        throw lastError != null ? lastError : new GeminiException("Chưa cấu hình model Gemini");
    }

    private static List<String> concat(String first, List<String> rest) {
        List<String> all = new ArrayList<>();
        all.add(first);
        if (rest != null) all.addAll(rest);
        return all;
    }

    private String extractText(String responseBody) {
        JsonNode root;
        try {
            root = objectMapper.readTree(responseBody);
        } catch (Exception e) {
            throw new GeminiException("Không đọc được phản hồi của Gemini", e);
        }

        JsonNode candidate = root.path("candidates").path(0);
        StringBuilder text = new StringBuilder();
        for (JsonNode part : candidate.path("content").path("parts")) {
            if (!part.path("thought").asBoolean(false) && part.hasNonNull("text")) {
                text.append(part.get("text").asText());
            }
        }
        if (text.isEmpty()) {
            String reason = root.path("promptFeedback").path("blockReason")
                    .asText(candidate.path("finishReason").asText("UNKNOWN"));
            throw new GeminiException("Gemini không trả về nội dung (lý do: " + reason + ")");
        }
        return text.toString();
    }

    private static String abbreviate(String text) {
        if (text == null) return "";
        return text.length() > 500 ? text.substring(0, 500) + "..." : text;
    }
}
