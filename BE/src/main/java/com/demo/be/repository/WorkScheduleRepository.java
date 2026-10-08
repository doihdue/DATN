package com.demo.be.repository;

import com.demo.be.model.WorkSchedule;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkScheduleRepository extends JpaRepository<WorkSchedule, Long> {

    List<WorkSchedule> findByWorkDate(LocalDate workDate);

    List<WorkSchedule> findByWorkDateBetweenOrderByWorkDateAscStartTimeAsc(LocalDate startDate, LocalDate endDate);

    List<WorkSchedule> findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(
            Long doctorId, LocalDate startDate, LocalDate endDate
    );

    List<WorkSchedule> findByExaminationRoomIdAndWorkDate(Long roomId, LocalDate workDate);

    @Query("SELECT ws FROM WorkSchedule ws " +
           "WHERE (:startDate IS NULL OR ws.workDate >= :startDate) " +
           "AND (:endDate IS NULL OR ws.workDate <= :endDate) " +
           "AND (:doctorId IS NULL OR ws.doctor.id = :doctorId) " +
           "AND (:specialtyId IS NULL OR ws.doctor.specialty.id = :specialtyId) " +
           "AND (:roomId IS NULL OR ws.examinationRoom.id = :roomId) " +
           "ORDER BY ws.workDate ASC, ws.startTime ASC")
    List<WorkSchedule> filterSchedules(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("doctorId") Long doctorId,
            @Param("specialtyId") Long specialtyId,
            @Param("roomId") Long roomId
    );

    // Khoá dòng ca làm việc khi đặt/huỷ lịch để tránh đặt vượt số lượng tối đa khi nhiều người đặt cùng lúc
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ws FROM WorkSchedule ws WHERE ws.id = :id")
    Optional<WorkSchedule> findByIdForUpdate(@Param("id") Long id);

    // Các ca còn nhận đặt lịch (chưa huỷ, chưa đầy) trong khoảng ngày
    @Query("SELECT ws FROM WorkSchedule ws " +
           "WHERE ws.workDate BETWEEN :startDate AND :endDate " +
           "AND ws.status = 'AVAILABLE' " +
           "AND ws.currentBookedCount < ws.maxPatients " +
           "AND (:doctorId IS NULL OR ws.doctor.id = :doctorId) " +
           "AND (:specialtyId IS NULL OR ws.doctor.specialty.id = :specialtyId) " +
           "ORDER BY ws.workDate ASC, ws.startTime ASC")
    List<WorkSchedule> findBookableSchedules(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("doctorId") Long doctorId,
            @Param("specialtyId") Long specialtyId
    );

    // Kiểm tra xung đột lịch của bác sĩ
    @Query("SELECT COUNT(ws) > 0 FROM WorkSchedule ws " +
           "WHERE ws.doctor.id = :doctorId " +
           "AND ws.workDate = :workDate " +
           "AND ws.status <> 'CANCELLED' " +
           "AND (:excludeId IS NULL OR ws.id <> :excludeId) " +
           "AND (ws.startTime < :endTime AND ws.endTime > :startTime)")
    boolean hasDoctorConflict(
            @Param("doctorId") Long doctorId,
            @Param("workDate") LocalDate workDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId
    );

    // Kiểm tra xung đột phòng khám
    @Query("SELECT COUNT(ws) > 0 FROM WorkSchedule ws " +
           "WHERE ws.examinationRoom.id = :roomId " +
           "AND ws.workDate = :workDate " +
           "AND ws.status <> 'CANCELLED' " +
           "AND (:excludeId IS NULL OR ws.id <> :excludeId) " +
           "AND (ws.startTime < :endTime AND ws.endTime > :startTime)")
    boolean hasRoomConflict(
            @Param("roomId") Long roomId,
            @Param("workDate") LocalDate workDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") Long excludeId
    );
}
