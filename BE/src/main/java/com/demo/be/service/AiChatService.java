package com.demo.be.service;

import com.demo.be.dto.request.ChatMessageRequest;
import com.demo.be.dto.response.ChatHistoryMessageResponse;
import com.demo.be.dto.response.ChatReplyResponse;
import com.demo.be.security.UserPrincipal;

import java.util.List;

public interface AiChatService {

    ChatReplyResponse sendMessage(ChatMessageRequest request, UserPrincipal currentUser);

    List<ChatHistoryMessageResponse> getHistory(String sessionKey, UserPrincipal currentUser);
}
