package com.demo.be.repository;

import com.demo.be.model.QueueTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
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

    // Vé còn hiệu lực (chưa khám xong / chưa huỷ) của bệnh nhân trong ngày
    Optional<QueueTicket> findFirstByTicketDateAndPatientIdAndStatusIn(
            LocalDate ticketDate, Long patientId, Collection<String> statuses
    );

    // Tất cả số vé đã cấp trong ngày theo mã phòng (kể cả vé đã chuyển sang phòng khác)
    @Query("SELECT q.ticketNumber FROM QueueTicket q " +
           "WHERE q.ticketDate = :ticketDate AND q.ticketNumber LIKE CONCAT(:prefix, '%')")
    List<String> findTicketNumbersByDateAndPrefix(
            @Param("ticketDate") LocalDate ticketDate,
            @Param("prefix") String prefix
    );

    List<QueueTicket> findByTicketDateBetween(LocalDate from, LocalDate to);

    long countByTicketDateBetween(LocalDate from, LocalDate to);

    long countByTicketDateBetweenAndStatus(LocalDate from, LocalDate to, String status);

    List<QueueTicket> findByTicketDateBetweenAndStatus(LocalDate from, LocalDate to, String status);

    @Query("SELECT q FROM QueueTicket q " +
           "WHERE q.ticketDate = :today " +
           "AND (:phone IS NOT NULL AND (q.patientPhone = :phone OR (q.patient IS NOT NULL AND q.patient.emergencyContactPhone = :phone))) " +
           "ORDER BY q.id DESC")
    List<QueueTicket> findTodayTicketsByPhone(@Param("today") LocalDate today, @Param("phone") String phone);

    @Query("SELECT q FROM QueueTicket q " +
           "WHERE q.ticketDate = :today " +
           "AND q.patient IS NOT NULL " +
           "AND q.patient.user IS NOT NULL " +
           "AND q.patient.user.username = :username " +
           "ORDER BY q.id DESC")
    List<QueueTicket> findTodayTicketsByUsername(@Param("today") LocalDate today, @Param("username") String username);
}
