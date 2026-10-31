package com.demo.be.repository;

import com.demo.be.model.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    Optional<Doctor> findByEmployeeCode(String employeeCode);

    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.specialty s " +
           "LEFT JOIN FETCH d.user u " +
           "WHERE (:keyword IS NULL OR " +
           "       LOWER(d.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(d.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       u.phoneNumber LIKE CONCAT('%', :keyword, '%')) " +
           "  AND (:specialtyId IS NULL OR s.id = :specialtyId) " +
           "  AND (:status IS NULL OR u.status = :status) " +
           "ORDER BY d.fullName ASC")
    List<Doctor> searchDoctors(
            @Param("keyword") String keyword,
            @Param("specialtyId") Long specialtyId,
            @Param("status") String status
    );

    @Query("SELECT d FROM Doctor d " +
           "LEFT JOIN FETCH d.specialty " +
           "LEFT JOIN FETCH d.user " +
           "WHERE d.id = :id")
    Optional<Doctor> findDetailById(@Param("id") Long id);
}
