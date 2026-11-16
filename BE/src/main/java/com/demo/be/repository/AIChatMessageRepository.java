package com.demo.be.repository;

import com.demo.be.model.AIChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AIChatMessageRepository extends JpaRepository<AIChatMessage, Long> {

    long countBySessionId(Long sessionId);

    // Lấy N tin nhắn gần nhất (mới nhất trước) để làm ngữ cảnh hội thoại cho AI
    List<AIChatMessage> findTop10BySessionIdOrderByIdDesc(Long sessionId);
}
