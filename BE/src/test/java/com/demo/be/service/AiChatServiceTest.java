package com.demo.be.service;

import com.demo.be.dto.request.ChatMessageRequest;
import com.demo.be.dto.response.ChatReplyResponse;
import com.demo.be.model.AIChatMessage;
import com.demo.be.model.AIChatSession;
import com.demo.be.model.Specialty;
import com.demo.be.repository.*;
import com.demo.be.service.ai.GeminiClient;
import com.demo.be.service.ai.GeminiClient.Turn;
import com.demo.be.service.ai.RuleBasedChatAdvisor;
import com.demo.be.service.impl.AiChatServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiChatServiceTest {

    @Mock private AIChatSessionRepository sessionRepository;
    @Mock private AIChatMessageRepository messageRepository;
    @Mock private SpecialtyRepository specialtyRepository;
    @Mock private UserRepository userRepository;
    @Mock private PatientRepository patientRepository;
    @Mock private GeminiClient geminiClient;

    private final RuleBasedChatAdvisor ruleAdvisor = new RuleBasedChatAdvisor();
    private AiChatServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AiChatServiceImpl(sessionRepository, messageRepository, specialtyRepository,
                userRepository, patientRepository, geminiClient, ruleAdvisor, new ObjectMapper());

        lenient().when(sessionRepository.save(any(AIChatSession.class))).thenAnswer(inv -> {
            AIChatSession s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });
        lenient().when(specialtyRepository.findAllByOrderByNameAsc()).thenReturn(List.of(
                Specialty.builder().id(1L).name("Khoa Tai Mũi Họng").build(),
                Specialty.builder().id(2L).name("Khoa Nhi").build()));
    }

    private ChatReplyResponse ask(String message) {
        ChatMessageRequest request = new ChatMessageRequest();
        request.setMessage(message);
        return service.sendMessage(request, null);
    }

    private static GeminiClient.GeminiResult result(String json) {
        return new GeminiClient.GeminiResult(json, "gemini-flash-lite-latest");
    }

    // ---------- Luật dự phòng ----------

    @Test
    void ruleAdvisor_nhanRaCapCuu_khongNhamTuGanGiong() {
        assertThat(ruleAdvisor.isEmergency("Tôi bị đau ngực và khó thở")).isTrue();
        assertThat(ruleAdvisor.isEmergency("Tôi bị ngạt mũi")).isFalse();
        assertThat(ruleAdvisor.isEmergency("Tôi uống thuốc từ từ được không?")).isFalse();
    }

    @Test
    void ruleAdvisor_goiYDungChuyenKhoa() {
        String[][] cases = {
                {"Tôi bị đau họng và sốt nhẹ 2 ngày nay", "Khoa Tai Mũi Họng"},
                {"Da tôi nổi mẩn đỏ và ngứa", "Khoa Da Liễu"},
                {"Bé nhà tôi bị sốt và ho", "Khoa Nhi"},
                {"Tôi bị đau răng", "Khoa Răng Hàm Mặt"},
                {"Mắt tôi bị nhìn mờ", "Khoa Mắt"},
                {"Huyết áp của tôi cao", "Khoa Tim mạch"},
                {"Xin chào", "Khoa Khám bệnh tổng quát"}
        };
        for (String[] c : cases) {
            assertThat(ruleAdvisor.advise(c[0]).getSuggestedSpecialties().get(0).getName()).as(c[0]).isEqualTo(c[1]);
        }
    }

    // ---------- Luồng xử lý của service ----------

    @Test
    void capCuu_traLoiNgay_khongGoiGemini() {
        ChatReplyResponse reply = ask("Tôi bị đau ngực dữ dội");

        assertThat(reply.getIsEmergency()).isTrue();
        assertThat(reply.getSource()).isEqualTo(ChatReplyResponse.SOURCE_SAFETY_RULE);
        assertThat(reply.getSessionKey()).isNotBlank();
        verify(geminiClient, never()).generateJson(any(), any(), any());
    }

    @Test
    void chuaCauHinhKey_dungLuatDuPhong() {
        when(geminiClient.isConfigured()).thenReturn(false);

        ChatReplyResponse reply = ask("Tôi bị đau họng");

        assertThat(reply.getSource()).isEqualTo(ChatReplyResponse.SOURCE_FALLBACK);
        assertThat(reply.getSuggestedSpecialties().get(0).getName()).isEqualTo("Khoa Tai Mũi Họng");
    }

    @Test
    void geminiLoi_dungLuatDuPhong() {
        when(geminiClient.isConfigured()).thenReturn(true);
        when(geminiClient.generateJson(any(), any(), any())).thenThrow(new GeminiClient.GeminiException("HTTP 429"));

        ChatReplyResponse reply = ask("Bé nhà tôi bị ho");

        assertThat(reply.getSource()).isEqualTo(ChatReplyResponse.SOURCE_FALLBACK);
        assertThat(reply.getSuggestedSpecialties().get(0).getName()).isEqualTo("Khoa Nhi");
    }

    @Test
    void geminiTraLoi_chiGiuKhoaCoThat_vaLuuCaHaiTinNhan() {
        when(geminiClient.isConfigured()).thenReturn(true);
        when(geminiClient.generateJson(any(), any(), any())).thenReturn(result("""
                {"content":"Bạn nên khám Tai Mũi Họng.","isEmergency":false,
                 "suggestedSpecialties":[
                   {"name":"khoa tai mũi họng","reason":"Triệu chứng ở họng."},
                   {"name":"Khoa Không Tồn Tại","reason":"x"}]}
                """));

        ChatReplyResponse reply = ask("Tôi bị đau họng 3 ngày");

        assertThat(reply.getSource()).isEqualTo(ChatReplyResponse.SOURCE_AI);
        assertThat(reply.getModel()).isEqualTo("gemini-flash-lite-latest");
        assertThat(reply.getSuggestedSpecialties()).hasSize(1);
        assertThat(reply.getSuggestedSpecialties().get(0).getName()).isEqualTo("Khoa Tai Mũi Họng");

        ArgumentCaptor<AIChatMessage> saved = ArgumentCaptor.forClass(AIChatMessage.class);
        verify(messageRepository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(AIChatMessage::getSenderType).containsExactly("USER", "AI");
        assertThat(saved.getAllValues().get(1).getIntentDetected()).isEqualTo("SPECIALTY_SUGGESTION");
    }

    @Test
    void geminiBaoCapCuu_boGoiYChuyenKhoa() {
        when(geminiClient.isConfigured()).thenReturn(true);
        when(geminiClient.generateJson(any(), any(), any())).thenReturn(result("""
                {"content":"Hãy gọi 115.","isEmergency":true,
                 "suggestedSpecialties":[{"name":"Khoa Nhi","reason":"x"}]}
                """));

        ChatReplyResponse reply = ask("Con tôi sốt cao li bì không tỉnh");

        assertThat(reply.getIsEmergency()).isTrue();
        assertThat(reply.getSuggestedSpecialties()).isEmpty();
    }

    @SuppressWarnings("unchecked")
    @Test
    void guiKemLichSuHoiThoai_batDauBangLuotNguoiDung() {
        AIChatSession session = AIChatSession.builder().id(5L).sessionKey("abc").status("ACTIVE").build();
        when(sessionRepository.findBySessionKey("abc")).thenReturn(Optional.of(session));
        when(messageRepository.findTop10BySessionIdOrderByIdDesc(5L)).thenReturn(List.of(
                AIChatMessage.builder().senderType("AI").content("Bạn đau bao lâu rồi?").build(),
                AIChatMessage.builder().senderType("USER").content("Tôi đau họng").build(),
                AIChatMessage.builder().senderType("AI").content("Lời chào bị cắt đầu").build()));
        when(geminiClient.isConfigured()).thenReturn(true);
        when(geminiClient.generateJson(any(), any(), any()))
                .thenReturn(result("{\"content\":\"OK\",\"isEmergency\":false,\"suggestedSpecialties\":[]}"));

        ChatMessageRequest request = new ChatMessageRequest();
        request.setSessionKey("abc");
        request.setMessage("Khoảng 3 ngày");
        ChatReplyResponse reply = service.sendMessage(request, null);

        ArgumentCaptor<List<Turn>> turns = ArgumentCaptor.forClass(List.class);
        verify(geminiClient).generateJson(anyString(), turns.capture(), any());
        assertThat(turns.getValue()).extracting(Turn::role).containsExactly("user", "model", "user");
        assertThat(turns.getValue()).extracting(Turn::text)
                .containsExactly("Tôi đau họng", "Bạn đau bao lâu rồi?", "Khoảng 3 ngày");
        assertThat(reply.getSessionKey()).isEqualTo("abc");
    }
}
