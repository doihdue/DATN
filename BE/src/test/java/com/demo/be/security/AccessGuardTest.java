package com.demo.be.security;

import com.demo.be.exception.AppException;
import com.demo.be.model.*;
import com.demo.be.repository.UserRepository;
import com.demo.be.repository.WorkScheduleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccessGuardTest {

    @Mock private UserRepository userRepository;
    @Mock private WorkScheduleRepository workScheduleRepository;

    @InjectMocks
    private AccessGuard accessGuard;

    private Doctor doctorHung;
    private ExaminationRoom room101;
    private ExaminationRoom room102;

    @BeforeEach
    void setUp() {
        doctorHung = Doctor.builder().id(2L).fullName("BS. Hùng").build();
        room101 = ExaminationRoom.builder().id(1L).roomNumber("P.101").build();
        room102 = ExaminationRoom.builder().id(2L).roomNumber("P.102").build();
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    private void loginAs(String username, String... roles) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                username, null, Arrays.stream(roles).map(SimpleGrantedAuthority::new).toList()));
    }

    private Patient patientOwnedBy(String username) {
        return Patient.builder().id(5L).fullName("BN").user(User.builder().username(username).build()).build();
    }

    @Test
    void patient_canViewOwnRecord_butNotSomeoneElses() {
        loginAs("patient_nam", "ROLE_PATIENT");

        assertThatCode(() -> accessGuard.assertCanViewPatientData(patientOwnedBy("patient_nam"))).doesNotThrowAnyException();
        assertThatThrownBy(() -> accessGuard.assertCanViewPatientData(patientOwnedBy("patient_lan")))
                .isInstanceOf(AppException.class);
        // Khách vãng lai chưa có tài khoản: bệnh nhân đăng nhập không xem được
        assertThatThrownBy(() -> accessGuard.assertCanViewPatientData(Patient.builder().id(9L).build()))
                .isInstanceOf(AppException.class);
    }

    @Test
    void staffAndDoctor_canViewAnyPatient() {
        loginAs("staff_mai", "ROLE_STAFF");
        assertThatCode(() -> accessGuard.assertCanViewPatientData(patientOwnedBy("patient_lan"))).doesNotThrowAnyException();
        loginAs("doctor_hung", "ROLE_DOCTOR");
        assertThatCode(() -> accessGuard.assertCanViewPatientData(patientOwnedBy("patient_lan"))).doesNotThrowAnyException();
    }

    @Test
    void doctor_canActOnlyInRoomWithShiftToday() {
        loginAs("doctor_hung", "ROLE_DOCTOR");
        when(userRepository.findByUsername("doctor_hung"))
                .thenReturn(Optional.of(User.builder().username("doctor_hung").person(doctorHung).build()));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(1L), any(LocalDate.class)))
                .thenReturn(List.of(WorkSchedule.builder().doctor(doctorHung).status("AVAILABLE").build()));
        when(workScheduleRepository.findByExaminationRoomIdAndWorkDate(eq(2L), any(LocalDate.class)))
                .thenReturn(List.of(WorkSchedule.builder().doctor(doctorHung).status("CANCELLED").build()));

        assertThatCode(() -> accessGuard.assertDoctorWorksInRoom(room101)).doesNotThrowAnyException();
        assertThatThrownBy(() -> accessGuard.assertDoctorWorksInRoom(room102))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("P.102");
    }

    @Test
    void staffAndAdmin_areNotLimitedByRoom() {
        loginAs("staff_mai", "ROLE_STAFF");
        assertThatCode(() -> accessGuard.assertDoctorWorksInRoom(room102)).doesNotThrowAnyException();
        loginAs("admin", "ROLE_ADMIN", "ROLE_DOCTOR");
        assertThatCode(() -> accessGuard.assertDoctorWorksInRoom(room102)).doesNotThrowAnyException();
        verifyNoInteractions(workScheduleRepository);
    }

    @Test
    void doctor_canListOnlyOwnRecords() {
        loginAs("doctor_hung", "ROLE_DOCTOR");
        when(userRepository.findByUsername("doctor_hung"))
                .thenReturn(Optional.of(User.builder().username("doctor_hung").person(doctorHung).build()));

        assertThatCode(() -> accessGuard.assertIsCurrentDoctor(2L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> accessGuard.assertIsCurrentDoctor(3L)).isInstanceOf(AppException.class);
    }
}
