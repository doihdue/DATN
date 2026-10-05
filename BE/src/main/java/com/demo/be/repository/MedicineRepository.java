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

    boolean existsByNameIgnoreCase(String name);

    List<Medicine> findAllByOrderByNameAsc();

    @Query("SELECT m FROM Medicine m WHERE " +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "ORDER BY m.name ASC")
    List<Medicine> searchMedicines(@Param("keyword") String keyword);

    @Query("SELECT m FROM Medicine m WHERE " +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(m.activeIngredient) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Medicine> searchMedicinesPaged(@Param("keyword") String keyword, Pageable pageable);
}
