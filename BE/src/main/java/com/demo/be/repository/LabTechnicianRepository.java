package com.demo.be.repository;

import com.demo.be.model.LabTechnician;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabTechnicianRepository extends JpaRepository<LabTechnician, Long> {

    List<LabTechnician> findAllByOrderByDepartmentDescFullNameAsc();

    Optional<LabTechnician> findByEmployeeCode(String employeeCode);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    @Query("SELECT t FROM LabTechnician t " +
           "LEFT JOIN FETCH t.user u " +
           "WHERE (:keyword IS NULL OR " +
           "       LOWER(t.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(t.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       u.phoneNumber LIKE CONCAT('%', :keyword, '%')) " +
           "  AND (:department IS NULL OR t.department = :department) " +
           "  AND (:status IS NULL OR u.status = :status) " +
           "ORDER BY t.department DESC, t.fullName ASC")
    List<LabTechnician> searchTechnicians(
            @Param("keyword") String keyword,
            @Param("department") String department,
            @Param("status") String status
    );

    @Query("SELECT t FROM LabTechnician t " +
           "LEFT JOIN FETCH t.user u " +
           "WHERE t.id = :id")
    Optional<LabTechnician> findDetailById(@Param("id") Long id);
}
