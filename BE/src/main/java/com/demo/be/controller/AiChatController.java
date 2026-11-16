package com.demo.be.controller;

import com.demo.be.dto.request.ChatMessageRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.ChatReplyResponse;
import com.demo.be.security.UserPrincipal;
import com.demo.be.service.AiChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class AiChatController {

    private final AiChatService aiChatService;

    // Mở cho cả khách chưa đăng nhập; nếu có token bệnh nhân thì phiên chat được gắn với hồ sơ bệnh nhân
    @PostMapping("/messages")
    public ResponseEntity<ApiResponse<ChatReplyResponse>> sendMessage(
            @Valid @RequestBody ChatMessageRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        ChatReplyResponse reply = aiChatService.sendMessage(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success(reply, "Trợ lý đã trả lời"));
    }
}
