package com.demo.be.repository;

import com.demo.be.model.QueueTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface QueueTicketRepository extends JpaRepository<QueueTicket, Long> {

    Optional<QueueTicket> findByTicketNumberAndTicketDate(String ticketNumber, LocalDate ticketDate);

    List<QueueTicket> findByTicketDateAndExaminationRoomIdOrderByPriorityScoreDescCheckInTimeAsc(
            LocalDate ticketDate, Long roomId
    );

    List<QueueTicket> findByTicketDateAndExaminationRoomIdAndStatusOrderByPriorityScoreDescCheckInTimeAsc(
            LocalDate ticketDate, Long roomId, String status
    );

    List<QueueTicket> findByTicketDateAndStatus(LocalDate ticketDate, String status);

    @Query("SELECT COUNT(q) FROM QueueTicket q " +
           "WHERE q.ticketDate = :ticketDate " +
           "AND q.examinationRoom.id = :roomId")
    long countTodayTicketsByRoom(@Param("ticketDate") LocalDate ticketDate, @Param("roomId") Long roomId);

    @Query("SELECT COUNT(q) FROM QueueTicket q " +
           "WHERE q.ticketDate = :ticketDate")
    long countTodayTicketsTotal(@Param("ticketDate") LocalDate ticketDate);

    // Tìm vé đang được gọi hoặc đang khám của phòng
    Optional<QueueTicket> findFirstByTicketDateAndExaminationRoomIdAndStatus(
            LocalDate ticketDate, Long roomId, String status
    );

    // Đếm số người đứng trước vé này trong hàng đợi WAITING
    @Query("SELECT COUNT(q) FROM QueueTicket q " +
           "WHERE q.ticketDate = :ticketDate " +
           "AND q.examinationRoom.id = :roomId " +
           "AND q.status = 'WAITING' " +
           "AND (q.priorityScore > :priorityScore " +
           "     OR (q.priorityScore = :priorityScore AND q.checkInTime < :checkInTime))")
    long countWaitingAhead(
            @Param("ticketDate") LocalDate ticketDate,
            @Param("roomId") Long roomId,
            @Param("priorityScore") Integer priorityScore,
            @Param("checkInTime") java.time.LocalTime checkInTime
    );

    List<QueueTicket> findTop20ByTicketDateOrderByCheckInTimeDesc(LocalDate ticketDate);
}
