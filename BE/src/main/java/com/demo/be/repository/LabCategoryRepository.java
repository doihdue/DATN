package com.demo.be.repository;

import com.demo.be.model.LabCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabCategoryRepository extends JpaRepository<LabCategory, Long> {

    Optional<LabCategory> findByNameIgnoreCase(String name);

    List<LabCategory> findAllByOrderByDepartmentDescNameAsc();
}
