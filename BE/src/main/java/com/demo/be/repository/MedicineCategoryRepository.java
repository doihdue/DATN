package com.demo.be.repository;

import com.demo.be.model.MedicineCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineCategoryRepository extends JpaRepository<MedicineCategory, Long> {

    Optional<MedicineCategory> findByCode(String code);

    Optional<MedicineCategory> findByName(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByCodeIgnoreCase(String code);

    List<MedicineCategory> findAllByOrderByDisplayOrderAscNameAsc();

    List<MedicineCategory> findByIsActiveTrueOrderByDisplayOrderAscNameAsc();

    @Query("SELECT c FROM MedicineCategory c WHERE " +
           "(:keyword IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(c.code) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY c.displayOrder ASC, c.name ASC")
    List<MedicineCategory> searchCategories(@Param("keyword") String keyword);
}
