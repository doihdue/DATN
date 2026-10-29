package com.demo.be.repository;

import com.demo.be.model.LabTechnician;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LabTechnicianRepository extends JpaRepository<LabTechnician, Long> {

    List<LabTechnician> findAllByOrderByDepartmentDescFullNameAsc();
}
