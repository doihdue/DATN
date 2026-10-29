package com.demo.be.repository;

import com.demo.be.model.StaffShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface StaffShiftRepository extends JpaRepository<StaffShift, Long> {

    @Query("SELECT s FROM StaffShift s JOIN FETCH s.technician JOIN FETCH s.room " +
           "WHERE s.workDate BETWEEN :from AND :to ORDER BY s.workDate, s.startTime")
    List<StaffShift> findShifts(@Param("from") LocalDate from, @Param("to") LocalDate to);

    @Query("SELECT s FROM StaffShift s JOIN FETCH s.technician JOIN FETCH s.room " +
           "WHERE s.technician.id = :technicianId AND s.workDate BETWEEN :from AND :to ORDER BY s.workDate, s.startTime")
    List<StaffShift> findTechnicianShifts(@Param("technicianId") Long technicianId,
                                        @Param("from") LocalDate from, @Param("to") LocalDate to);
}
