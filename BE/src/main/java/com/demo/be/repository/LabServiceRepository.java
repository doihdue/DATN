package com.demo.be.repository;

import com.demo.be.model.LabService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabServiceRepository extends JpaRepository<LabService, Long> {

    Optional<LabService> findByServiceCode(String serviceCode);

    List<LabService> findByIsActiveTrueOrderByServiceNameAsc();

    @Query("SELECT ls FROM LabService ls WHERE ls.isActive = true " +
           "AND (LOWER(ls.serviceName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(ls.serviceCode) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(ls.category) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY ls.serviceName ASC")
    List<LabService> searchActiveServices(@Param("query") String query);
}
