package com.demo.be.repository;

import com.demo.be.model.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    List<MedicalRecord> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    Optional<MedicalRecord> findByQueueTicketId(Long queueTicketId);

    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);

    List<MedicalRecord> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    @Query("SELECT mr FROM MedicalRecord mr " +
           "LEFT JOIN FETCH mr.patient p " +
           "LEFT JOIN FETCH mr.doctor d " +
           "LEFT JOIN FETCH mr.prescription pr " +
           "LEFT JOIN FETCH pr.items items " +
           "LEFT JOIN FETCH items.medicine " +
           "WHERE mr.id = :id")
    Optional<MedicalRecord> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT mr FROM MedicalRecord mr " +
           "LEFT JOIN FETCH mr.patient p " +
           "LEFT JOIN FETCH mr.doctor d " +
           "LEFT JOIN FETCH mr.prescription pr " +
           "LEFT JOIN FETCH pr.items items " +
           "LEFT JOIN FETCH items.medicine " +
           "WHERE mr.queueTicket.id = :ticketId")
    Optional<MedicalRecord> findByQueueTicketIdWithDetails(@Param("ticketId") Long ticketId);
}
