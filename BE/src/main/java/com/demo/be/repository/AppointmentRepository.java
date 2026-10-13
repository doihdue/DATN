package com.demo.be.repository;

import com.demo.be.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByAppointmentDateBetween(LocalDate from, LocalDate to);

    long countByAppointmentDateBetween(LocalDate from, LocalDate to);

    long countByAppointmentDateBetweenAndStatus(LocalDate from, LocalDate to, String status);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentDate = :date")
    long countTodayAppointments(@Param("date") LocalDate date);

    @Query("SELECT COUNT(a) FROM Appointment a WHERE a.appointmentDate = :date AND a.status = :status")
    long countTodayAppointmentsByStatus(@Param("date") LocalDate date, @Param("status") String status);
}
