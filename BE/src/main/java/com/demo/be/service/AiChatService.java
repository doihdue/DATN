package com.demo.be.service;

import com.demo.be.dto.request.ChatMessageRequest;
import com.demo.be.dto.response.ChatReplyResponse;
import com.demo.be.security.UserPrincipal;

public interface AiChatService {

    ChatReplyResponse sendMessage(ChatMessageRequest request, UserPrincipal currentUser);
}
