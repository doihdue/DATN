package com.demo.be.repository;

import com.demo.be.model.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {

    @Query("SELECT p FROM Patient p WHERE p.emergencyContactPhone = :phone OR (p.user IS NOT NULL AND p.user.phoneNumber = :phone)")
    List<Patient> findByPhoneNumber(@Param("phone") String phone);

    @Query("SELECT p FROM Patient p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%', :kw, '%')) OR p.emergencyContactPhone LIKE CONCAT('%', :kw, '%') OR p.nationalId LIKE CONCAT('%', :kw, '%')")
    List<Patient> searchPatients(@Param("kw") String kw);
}
