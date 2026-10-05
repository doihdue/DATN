package com.demo.be.repository;

import com.demo.be.model.Specialty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecialtyRepository extends JpaRepository<Specialty, Long> {

    Optional<Specialty> findByName(String name);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<Specialty> findAllByOrderByNameAsc();
}
