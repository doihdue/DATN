package com.demo.be.repository;

import com.demo.be.model.WorkSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

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
