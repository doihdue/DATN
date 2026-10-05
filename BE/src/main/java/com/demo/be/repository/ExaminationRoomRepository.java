package com.demo.be.repository;

import com.demo.be.model.ExaminationRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExaminationRoomRepository extends JpaRepository<ExaminationRoom, Long> {

    Optional<ExaminationRoom> findByRoomNumber(String roomNumber);

    boolean existsByRoomNumber(String roomNumber);

    List<ExaminationRoom> findAllByOrderByRoomNumberAsc();
}
