package com.demo.be.repository;

import com.demo.be.model.LabOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {

    List<LabOrder> findByMedicalRecordId(Long medicalRecordId);

    @Query("SELECT lo FROM LabOrder lo " +
           "JOIN FETCH lo.labService ls " +
           "LEFT JOIN FETCH lo.performer p " +
           "WHERE lo.medicalRecord.id = :recordId " +
           "ORDER BY lo.id ASC")
    List<LabOrder> findByMedicalRecordIdWithDetails(@Param("recordId") Long recordId);

    // Chỉ định phát sinh trong ngày + các chỉ định còn dang dở (chờ làm / đang đo) của những ngày trước
    @Query("SELECT lo FROM LabOrder lo " +
           "JOIN FETCH lo.labService ls " +
           "JOIN FETCH lo.medicalRecord mr " +
           "LEFT JOIN FETCH mr.patient pat " +
           "LEFT JOIN FETCH mr.queueTicket qt " +
           "LEFT JOIN FETCH qt.examinationRoom er " +
           "LEFT JOIN FETCH lo.performer p " +
           "WHERE (lo.orderTime >= :from AND lo.orderTime < :to) " +
           "OR lo.status IN ('PENDING', 'PROCESSING') " +
           "ORDER BY lo.orderTime ASC")
    List<LabOrder> findWorklist(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
