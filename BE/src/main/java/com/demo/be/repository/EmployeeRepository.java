package com.demo.be.repository;

import com.demo.be.model.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByEmployeeCode(String employeeCode);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    // Nhân viên lễ tân: Employee thuần (không phải Bác sĩ) có tài khoản mang quyền ROLE_STAFF
    @Query("SELECT e FROM Employee e " +
           "JOIN FETCH e.user u " +
           "WHERE TYPE(e) = Employee " +
           "  AND EXISTS (SELECT ur.id FROM UserRole ur WHERE ur.user = u AND ur.role.name = 'ROLE_STAFF') " +
           "  AND (:keyword IS NULL OR " +
           "       LOWER(e.fullName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(e.employeeCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.username) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       u.phoneNumber LIKE CONCAT('%', :keyword, '%')) " +
           "  AND (:status IS NULL OR u.status = :status) " +
           "ORDER BY e.fullName ASC")
    List<Employee> searchStaff(@Param("keyword") String keyword, @Param("status") String status);

    @Query("SELECT e FROM Employee e " +
           "JOIN FETCH e.user u " +
           "WHERE e.id = :id AND TYPE(e) = Employee " +
           "  AND EXISTS (SELECT ur.id FROM UserRole ur WHERE ur.user = u AND ur.role.name = 'ROLE_STAFF')")
    Optional<Employee> findStaffById(@Param("id") Long id);
}
