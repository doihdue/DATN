package com.demo.be.repository;

import com.demo.be.model.ExaminationRoom;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExaminationRoomRepository extends JpaRepository<ExaminationRoom, Long> {

    Optional<ExaminationRoom> findByRoomNumber(String roomNumber);

    boolean existsByRoomNumber(String roomNumber);

    List<ExaminationRoom> findAllByOrderByRoomNumberAsc();

    // Khoá dòng phòng khám khi cấp số để 2 quầy cấp cùng lúc không sinh trùng số thứ tự
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ExaminationRoom r WHERE r.id = :id")
    Optional<ExaminationRoom> findByIdForUpdate(@Param("id") Long id);
}
