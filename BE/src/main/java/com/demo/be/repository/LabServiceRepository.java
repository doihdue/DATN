package com.demo.be.repository;

import com.demo.be.model.LabService;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabServiceRepository extends JpaRepository<LabService, Long> {

    Optional<LabService> findByServiceCode(String serviceCode);

    @EntityGraph(attributePaths = "category")
    List<LabService> findByIsActiveTrueOrderByServiceNameAsc();

    @EntityGraph(attributePaths = "category")
    @Query("SELECT ls FROM LabService ls LEFT JOIN ls.category c WHERE ls.isActive = true " +
           "AND (LOWER(ls.serviceName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(ls.serviceCode) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "     OR LOWER(c.name) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY ls.serviceName ASC")
    List<LabService> searchActiveServices(@Param("query") String query);

    // Số dịch vụ đang hoạt động theo từng loại: [categoryId, count]
    @Query("SELECT ls.category.id, COUNT(ls) FROM LabService ls WHERE ls.isActive = true " +
           "AND ls.category IS NOT NULL GROUP BY ls.category.id")
    List<Object[]> countActiveByCategory();
}
