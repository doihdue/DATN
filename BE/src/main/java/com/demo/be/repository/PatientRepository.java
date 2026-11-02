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

    // LEFT JOIN: "p.user.phoneNumber" sẽ sinh INNER JOIN và bỏ sót bệnh nhân vãng lai không có tài khoản
    @Query("SELECT p FROM Patient p LEFT JOIN p.user u WHERE p.emergencyContactPhone = :phone OR u.phoneNumber = :phone")
    List<Patient> findByPhoneNumber(@Param("phone") String phone);

    @Query("SELECT p FROM Patient p WHERE LOWER(p.fullName) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "OR p.emergencyContactPhone LIKE CONCAT('%', :kw, '%') " +
           "OR (p.user IS NOT NULL AND p.user.phoneNumber LIKE CONCAT('%', :kw, '%')) " +
           "OR p.nationalId LIKE CONCAT('%', :kw, '%') " +
           "OR CONCAT('', p.id) LIKE CONCAT('%', :kw, '%')")
    List<Patient> searchPatients(@Param("kw") String kw);

    // Danh sách bệnh nhân cho Admin: nạp sẵn tài khoản (nếu có) để tránh N+1
    // status: ACTIVE / LOCKED theo tài khoản, NO_ACCOUNT = bệnh nhân vãng lai chưa có tài khoản
    @Query("SELECT p FROM Patient p " +
           "LEFT JOIN FETCH p.user u " +
           "WHERE (:keyword IS NULL OR " +
           "       LOWER(p.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       p.nationalId LIKE CONCAT('%', :keyword, '%') OR " +
           "       p.emergencyContactPhone LIKE CONCAT('%', :keyword, '%') OR " +
           "       u.phoneNumber LIKE CONCAT('%', :keyword, '%') OR " +
           "       LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       CONCAT('', p.id) LIKE CONCAT('%', :keyword, '%')) " +
           "  AND (:gender IS NULL OR p.gender = :gender) " +
           "  AND (:status IS NULL " +
           "       OR (:status = 'NO_ACCOUNT' AND u.id IS NULL) " +
           "       OR u.status = :status) " +
           "ORDER BY p.id DESC")
    List<Patient> adminSearch(
            @Param("keyword") String keyword,
            @Param("gender") String gender,
            @Param("status") String status
    );

    @Query("SELECT p FROM Patient p LEFT JOIN FETCH p.user u WHERE p.id = :id")
    Optional<Patient> findDetailById(@Param("id") Long id);
}
