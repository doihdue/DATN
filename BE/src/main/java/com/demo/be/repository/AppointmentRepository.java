package com.demo.be.repository;

import com.demo.be.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Optional<Appointment> findByAppointmentCode(String appointmentCode);

    List<Appointment> findByPatientIdOrderByAppointmentDateDescEstimatedStartTimeDesc(Long patientId);

    List<Appointment> findByWorkScheduleIdAndStatusIn(Long workScheduleId, Collection<String> statuses);

    // Một bệnh nhân chỉ được giữ 1 lịch hẹn còn hiệu lực với cùng bác sĩ trong cùng ngày
    @Query("SELECT COUNT(a) > 0 FROM Appointment a " +
           "WHERE a.patient.id = :patientId " +
           "AND a.doctor.id = :doctorId " +
           "AND a.appointmentDate = :date " +
           "AND a.status IN :statuses " +
           "AND (:excludeId IS NULL OR a.id <> :excludeId)")
    boolean existsActiveForPatientDoctorDate(
            @Param("patientId") Long patientId,
            @Param("doctorId") Long doctorId,
            @Param("date") LocalDate date,
            @Param("statuses") Collection<String> statuses,
            @Param("excludeId") Long excludeId
    );

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN a.patient p " +
           "WHERE (:date IS NULL OR a.appointmentDate = :date) " +
           "AND (:status IS NULL OR a.status = :status) " +
           "AND (:doctorId IS NULL OR a.doctor.id = :doctorId) " +
           "AND (:keyword IS NULL " +
           "     OR LOWER(p.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR p.emergencyContactPhone LIKE CONCAT('%', :keyword, '%') " +
           "     OR LOWER(a.appointmentCode) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY a.appointmentDate ASC, a.estimatedStartTime ASC")
    List<Appointment> searchAppointments(
            @Param("date") LocalDate date,
            @Param("status") String status,
            @Param("doctorId") Long doctorId,
            @Param("keyword") String keyword
    );
}
