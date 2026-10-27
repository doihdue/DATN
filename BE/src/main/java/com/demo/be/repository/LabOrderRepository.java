package com.demo.be.repository;

import com.demo.be.model.LabOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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

    @Query("SELECT lo FROM LabOrder lo " +
           "JOIN FETCH lo.labService ls " +
           "JOIN FETCH lo.medicalRecord mr " +
           "JOIN FETCH mr.patient pat " +
           "LEFT JOIN FETCH mr.queueTicket qt " +
           "LEFT JOIN FETCH lo.performer p " +
           "WHERE lo.status = :status " +
           "ORDER BY lo.orderTime ASC")
    List<LabOrder> findByStatusWithDetails(@Param("status") String status);

    @Query("SELECT lo FROM LabOrder lo " +
           "JOIN FETCH lo.labService ls " +
           "JOIN FETCH lo.medicalRecord mr " +
           "JOIN FETCH mr.patient pat " +
           "LEFT JOIN FETCH mr.queueTicket qt " +
           "LEFT JOIN FETCH lo.performer p " +
           "ORDER BY lo.orderTime DESC")
    List<LabOrder> findAllWithDetails();
}
