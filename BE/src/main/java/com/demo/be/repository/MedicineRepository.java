package com.demo.be.repository;

import com.demo.be.model.Medicine;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    Optional<Medicine> findByName(String name);

    Optional<Medicine> findByCode(String code);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByCodeIgnoreCase(String code);

    long countByCategoryId(Long categoryId);

    List<Medicine> findAllByOrderByNameAsc();

    List<Medicine> findByCategoryIdOrderByNameAsc(Long categoryId);

    @Query("SELECT m FROM Medicine m " +
           "LEFT JOIN FETCH m.category c " +
           "WHERE (:keyword IS NULL OR :keyword = '' OR " +
           "       LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "       LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "  AND (:categoryId IS NULL OR c.id = :categoryId) " +
           "  AND (:activeOnly IS NULL OR :activeOnly = false OR m.isActive = true) " +
           "ORDER BY m.name ASC")
    List<Medicine> searchMedicinesFiltered(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("activeOnly") Boolean activeOnly
    );

    @Query("SELECT m FROM Medicine m WHERE " +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY m.name ASC")
    List<Medicine> searchMedicines(@Param("keyword") String keyword);

    @Query(value = "SELECT m FROM Medicine m LEFT JOIN FETCH m.category WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:categoryId IS NULL OR m.category.id = :categoryId) " +
           "AND (:activeOnly IS NULL OR :activeOnly = false OR m.isActive = true)",
           countQuery = "SELECT COUNT(m) FROM Medicine m WHERE " +
           "(:keyword IS NULL OR :keyword = '' OR " +
           " LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(m.code) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           " LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "AND (:categoryId IS NULL OR m.category.id = :categoryId) " +
           "AND (:activeOnly IS NULL OR :activeOnly = false OR m.isActive = true)")
    Page<Medicine> searchMedicinesPaged(
            @Param("keyword") String keyword,
            @Param("categoryId") Long categoryId,
            @Param("activeOnly") Boolean activeOnly,
            Pageable pageable
    );
}
