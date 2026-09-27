package com.demo.be.init;

import com.demo.be.model.*;
import com.demo.be.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PersonRepository personRepository;
    private final SpecialtyRepository specialtyRepository;
    private final DoctorRepository doctorRepository;
    private final EmployeeRepository employeeRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("==> Đang khởi tạo dữ liệu mẫu với bảng mã Unicode NVARCHAR chuẩn...");

        // 1. Tạo các vai trò (Roles)
        Role adminRole = createRoleIfNotFound("ROLE_ADMIN", "Quản trị viên toàn hệ thống");
        Role doctorRole = createRoleIfNotFound("ROLE_DOCTOR", "Bác sĩ khám chữa bệnh");
        Role staffRole = createRoleIfNotFound("ROLE_STAFF", "Nhân viên tiếp đón và điều phối hàng đợi");
        Role patientRole = createRoleIfNotFound("ROLE_PATIENT", "Bệnh nhân đặt khám và lấy số thứ tự");

        // 2. Tạo chuyên khoa mẫu
        Specialty generalSpecialty = createSpecialtyIfNotFound("Khoa Khám bệnh tổng quát", "Khám, chẩn đoán và tư vấn ban đầu");
        createSpecialtyIfNotFound("Khoa Tim mạch", "Khám và điều trị các bệnh lý tim mạch");
        createSpecialtyIfNotFound("Khoa Nhi", "Chăm sóc và điều trị sức khỏe trẻ em");

        // 3. Tạo tài khoản Quản trị viên (Admin)
        if (!userRepository.existsByUsername("admin")) {
            Person adminPerson = Person.builder()
                    .fullName("Quản trị viên Hệ thống")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(1990, 1, 1))
                    .address("Hà Nội")
                    .nationalId("001090123456")
                    .build();
            adminPerson = personRepository.save(adminPerson);

            User adminUser = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("Admin@123456"))
                    .email("admin@clinic.com")
                    .phoneNumber("0912345678")
                    .status("ACTIVE")
                    .person(adminPerson)
                    .build();
            adminUser.addRole(adminRole);
            userRepository.save(adminUser);
            log.info("-> Đã tạo tài khoản Admin: admin / Admin@123456 (Quản trị viên Hệ thống)");
        }

        // 4. Tạo tài khoản Bác sĩ mẫu
        if (!userRepository.existsByUsername("doctor_hung")) {
            Doctor doctor = Doctor.builder()
                    .fullName("BS.CKII Nguyễn Văn Hùng")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(1980, 5, 20))
                    .address("Hà Nội")
                    .nationalId("001080654321")
                    .employeeCode("DOC001")
                    .position("Bác sĩ Trưởng khoa")
                    .academicTitle("Bác sĩ Chuyên khoa II")
                    .yearsOfExperience(18)
                    .biography("Bác sĩ có hơn 18 năm kinh nghiệm trong lĩnh vực khám chữa bệnh nội tổng quát.")
                    .averageConsultationTime(15)
                    .specialty(generalSpecialty)
                    .build();
            doctor = doctorRepository.save(doctor);

            User doctorUser = User.builder()
                    .username("doctor_hung")
                    .passwordHash(passwordEncoder.encode("Doctor@123456"))
                    .email("hung.nguyen@clinic.com")
                    .phoneNumber("0987654321")
                    .status("ACTIVE")
                    .person(doctor)
                    .build();
            doctorUser.addRole(doctorRole);
            userRepository.save(doctorUser);
            log.info("-> Đã tạo tài khoản Bác sĩ: doctor_hung / Doctor@123456 (BS.CKII Nguyễn Văn Hùng)");
        }

        // 5. Tạo tài khoản Nhân viên tiếp đón / Lễ tân mẫu
        if (!userRepository.existsByUsername("staff_mai")) {
            Employee staff = Employee.builder()
                    .fullName("Lê Thị Mai")
                    .gender("Nữ")
                    .dateOfBirth(LocalDate.of(1998, 8, 15))
                    .address("Hà Nội")
                    .nationalId("001098112233")
                    .employeeCode("STF001")
                    .position("Nhân viên Tiếp đón & Lễ tân")
                    .hireDate(LocalDate.of(2023, 1, 1))
                    .build();
            staff = employeeRepository.save(staff);

            User staffUser = User.builder()
                    .username("staff_mai")
                    .passwordHash(passwordEncoder.encode("Staff@123456"))
                    .email("mai.le@clinic.com")
                    .phoneNumber("0934567890")
                    .status("ACTIVE")
                    .person(staff)
                    .build();
            staffUser.addRole(staffRole);
            userRepository.save(staffUser);
            log.info("-> Đã tạo tài khoản Nhân viên: staff_mai / Staff@123456 (Lê Thị Mai)");
        }

        // 6. Tạo tài khoản Bệnh nhân mẫu
        if (!userRepository.existsByUsername("patient_nam")) {
            Patient patient = Patient.builder()
                    .fullName("Trần Hoài Nam")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(2000, 10, 10))
                    .address("Hà Đông, Hà Nội")
                    .nationalId("001200998877")
                    .bloodGroup("O+")
                    .emergencyContactName("Trần Văn Ba")
                    .emergencyContactPhone("0977889900")
                    .build();
            patient = patientRepository.save(patient);

            User patientUser = User.builder()
                    .username("patient_nam")
                    .passwordHash(passwordEncoder.encode("Patient@123456"))
                    .email("nam.tran@gmail.com")
                    .phoneNumber("0977112233")
                    .status("ACTIVE")
                    .person(patient)
                    .build();
            patientUser.addRole(patientRole);
            userRepository.save(patientUser);
            log.info("-> Đã tạo tài khoản Bệnh nhân: patient_nam / Patient@123456 (Trần Hoài Nam)");
        }

        log.info("==> Dữ liệu mẫu Unicode NVARCHAR đã được khởi tạo thành công 100%!");
    }

    private Role createRoleIfNotFound(String name, String description) {
        return roleRepository.findByName(name)
                .orElseGet(() -> roleRepository.save(Role.builder()
                        .name(name)
                        .description(description)
                        .build()));
    }

    private Specialty createSpecialtyIfNotFound(String name, String description) {
        return specialtyRepository.findByName(name)
                .orElseGet(() -> specialtyRepository.save(Specialty.builder()
                        .name(name)
                        .description(description)
                        .build()));
    }
}
