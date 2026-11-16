package com.demo.be.repository;

import com.demo.be.model.AIChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AIChatSessionRepository extends JpaRepository<AIChatSession, Long> {

    Optional<AIChatSession> findBySessionKey(String sessionKey);
}
