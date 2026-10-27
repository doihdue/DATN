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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

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
    private final ExaminationRoomRepository examinationRoomRepository;
    private final WorkScheduleRepository workScheduleRepository;
    private final MedicineRepository medicineRepository;
    private final MedicineCategoryRepository medicineCategoryRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final QueueTicketRepository queueTicketRepository;
    private final AppointmentRepository appointmentRepository;
    private final LabServiceRepository labServiceRepository;
    private final LabOrderRepository labOrderRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("==> Đang khởi tạo bộ dữ liệu mẫu đa dạng phục vụ Demo & Test...");

        // 1. Tạo các vai trò (Roles)
        Role adminRole = createRoleIfNotFound("ROLE_ADMIN", "Quản trị viên toàn hệ thống");
        Role doctorRole = createRoleIfNotFound("ROLE_DOCTOR", "Bác sĩ khám chữa bệnh");
        Role staffRole = createRoleIfNotFound("ROLE_STAFF", "Nhân viên tiếp đón và điều phối hàng đợi");
        Role labTechRole = createRoleIfNotFound("ROLE_LAB_TECH", "Kỹ thuật viên phòng Xét nghiệm & Cận lâm sàng");
        Role patientRole = createRoleIfNotFound("ROLE_PATIENT", "Bệnh nhân đặt khám và lấy số thứ tự");

        // 2. Tạo 7 chuyên khoa lâm sàng đa dạng
        Specialty generalSpecialty = createSpecialtyIfNotFound("Khoa Khám bệnh tổng quát", "Khám, chẩn đoán, sàng lọc và tư vấn sức khỏe ban đầu");
        Specialty cardioSpecialty = createSpecialtyIfNotFound("Khoa Tim mạch", "Khám và điều trị chuyên sâu các bệnh lý tim mạch, tăng huyết áp, mạch vành");
        Specialty pediatricsSpecialty = createSpecialtyIfNotFound("Khoa Nhi", "Chăm sóc, theo dõi phát triển thể chất và điều trị bệnh lý trẻ em");
        Specialty entSpecialty = createSpecialtyIfNotFound("Khoa Tai Mũi Họng", "Nội soi chẩn đoán và điều trị bệnh lý tai mũi họng người lớn & trẻ em");
        Specialty eyeSpecialty = createSpecialtyIfNotFound("Khoa Mắt", "Khám thị lực, đo tật khúc xạ, điều trị viêm giác mạc và bệnh lý đáy mắt");
        Specialty dentalSpecialty = createSpecialtyIfNotFound("Khoa Răng Hàm Mặt", "Khám, điều trị bệnh lý răng miệng, nha khoa tổng quát và phục hình");
        Specialty dermaSpecialty = createSpecialtyIfNotFound("Khoa Da Liễu", "Khám, điều trị viêm da cơ địa, dị ứng, mụn trứng cá và chăm sóc da");

        // 3. Tạo 8 phòng khám lâm sàng
        ExaminationRoom room101 = createRoomIfNotFound("P.101", "Phòng Khám Nội Tổng Quát 1", 1);
        ExaminationRoom room102 = createRoomIfNotFound("P.102", "Phòng Khám Tim Mạch Chuyên Sâu", 1);
        ExaminationRoom room103 = createRoomIfNotFound("P.103", "Phòng Khám Tai Mũi Họng & Nội Soi", 1);
        ExaminationRoom room201 = createRoomIfNotFound("P.201", "Phòng Khám Nhi - Dinh Dưỡng", 2);
        ExaminationRoom room202 = createRoomIfNotFound("P.202", "Phòng Khám Mắt & Đo Khúc Xạ", 2);
        ExaminationRoom room203 = createRoomIfNotFound("P.203", "Phòng Khám Răng Hàm Mặt", 2);
        ExaminationRoom room301 = createRoomIfNotFound("P.301", "Phòng Khám Da Liễu & Thẩm Mỹ", 3);
        ExaminationRoom room302 = createRoomIfNotFound("P.100", "Phòng Cấp Cứu Ban Đầu & Xử Trí Nhanh", 1);

        // 4. Tạo tài khoản Quản trị viên (Admin)
        if (!userRepository.existsByUsername("admin")) {
            Person adminPerson = Person.builder()
                    .fullName("Quản trị viên Hệ thống")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(1990, 1, 1))
                    .address("Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội")
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

        // 5. Tạo 7 Bác sĩ mẫu cho từng chuyên khoa
        Doctor doctorHung = createDoctorIfNotFound(
                "doctor_hung", "DOC001", "BS.CKII Nguyễn Văn Hùng", "Bác sĩ Chuyên khoa II",
                18, "Hơn 18 năm kinh nghiệm trong lĩnh vực khám chữa bệnh nội tổng quát và lão khoa.",
                generalSpecialty, "Trưởng khoa Khám bệnh", "Nam",
                LocalDate.of(1978, 5, 20), "001078654321", "hung.nguyen@clinic.com", "0987654321", doctorRole
        );

        Doctor doctorHoa = createDoctorIfNotFound(
                "doctor_hoa", "DOC002", "BS.CKI Trần Thị Mai Hoa", "Bác sĩ Chuyên khoa I",
                14, "Chuyên gia tim mạch can thiệp và điều trị tăng huyết áp, rối loạn nhịp tim.",
                cardioSpecialty, "Phó trưởng khoa Tim mạch", "Nữ",
                LocalDate.of(1984, 8, 12), "001084112233", "hoa.tran@clinic.com", "0988112233", doctorRole
        );

        Doctor doctorLong = createDoctorIfNotFound(
                "doctor_long", "DOC003", "ThS.BS Lê Hoàng Long", "Thạc sĩ Bác sĩ",
                10, "Tốt nghiệp ĐH Y Hà Nội, chuyên sâu về dinh dưỡng và hô hấp nhi khoa.",
                pediatricsSpecialty, "Bác sĩ điều trị Khoa Nhi", "Nam",
                LocalDate.of(1988, 3, 25), "001088445566", "long.le@clinic.com", "0989223344", doctorRole
        );

        Doctor doctorDuc = createDoctorIfNotFound(
                "doctor_duc", "DOC004", "BS.CKI Phạm Minh Đức", "Bác sĩ Chuyên khoa I",
                12, "Chuyên phẫu thuật nội soi mũi xoang, vi phẫu thanh quản và thính học.",
                entSpecialty, "Bác sĩ điều trị Tai Mũi Họng", "Nam",
                LocalDate.of(1986, 11, 8), "001086778899", "duc.pham@clinic.com", "0987334455", doctorRole
        );

        Doctor doctorThuy = createDoctorIfNotFound(
                "doctor_thuy", "DOC005", "BS.CKII Hoàng Thu Thủy", "Bác sĩ Chuyên khoa II",
                16, "Nguyên bác sĩ Viện Mắt TW, chuyên gia về tật khúc xạ và phẫu thuật đục thủy tinh thể.",
                eyeSpecialty, "Trưởng khoa Mắt", "Nữ",
                LocalDate.of(1980, 2, 14), "001080998877", "thuy.hoang@clinic.com", "0986445566", doctorRole
        );

        Doctor doctorDung = createDoctorIfNotFound(
                "doctor_dung", "DOC006", "BS.CKI Đỗ Quang Dũng", "Bác sĩ Chuyên khoa I",
                9, "Chuyên sâu về cấy ghép Implant, chỉnh nha niềng răng và phục hình thẩm mỹ.",
                dentalSpecialty, "Bác sĩ điều trị Răng Hàm Mặt", "Nam",
                LocalDate.of(1991, 7, 30), "001091223344", "dung.do@clinic.com", "0985556677", doctorRole
        );

        Doctor doctorYen = createDoctorIfNotFound(
                "doctor_yen", "DOC007", "ThS.BS Vũ Hải Yến", "Thạc sĩ Bác sĩ",
                11, "Chuyên gia da liễu thẩm mỹ, laser y học và điều trị các bệnh viêm da tự miễn.",
                dermaSpecialty, "Bác sĩ điều trị Da Liễu", "Nữ",
                LocalDate.of(1989, 9, 18), "001089334455", "yen.vu@clinic.com", "0984667788", doctorRole
        );

        // 6. Tạo 2 tài khoản Nhân viên Lễ tân / Điều phối
        if (!userRepository.existsByUsername("staff_mai")) {
            Employee staff = Employee.builder()
                    .fullName("Lê Thị Mai")
                    .gender("Nữ")
                    .dateOfBirth(LocalDate.of(1998, 8, 15))
                    .address("Cầu Giấy, Hà Nội")
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

        if (!userRepository.existsByUsername("staff_quang")) {
            Employee staff2 = Employee.builder()
                    .fullName("Nguyễn Văn Quang")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(1996, 4, 10))
                    .address("Đống Đa, Hà Nội")
                    .nationalId("001096556677")
                    .employeeCode("STF002")
                    .position("Nhân viên Điều phối Khám & Viện phí")
                    .hireDate(LocalDate.of(2023, 6, 1))
                    .build();
            staff2 = employeeRepository.save(staff2);

            User staffUser2 = User.builder()
                    .username("staff_quang")
                    .passwordHash(passwordEncoder.encode("Staff@123456"))
                    .email("quang.nguyen@clinic.com")
                    .phoneNumber("0936789012")
                    .status("ACTIVE")
                    .person(staff2)
                    .build();
            staffUser2.addRole(staffRole);
            userRepository.save(staffUser2);
            log.info("-> Đã tạo tài khoản Nhân viên: staff_quang / Staff@123456 (Nguyễn Văn Quang)");
        }

        if (!userRepository.existsByUsername("ktv_lan")) {
            Employee ktv = Employee.builder()
                    .fullName("Trần Thị Lan")
                    .gender("Nữ")
                    .dateOfBirth(LocalDate.of(1992, 10, 12))
                    .address("Thanh Xuân, Hà Nội")
                    .nationalId("001092887766")
                    .employeeCode("KTV001")
                    .position("Kỹ thuật viên Trưởng Phòng Xét Nghiệm & Cận Lâm Sàng")
                    .hireDate(LocalDate.of(2022, 3, 1))
                    .build();
            ktv = employeeRepository.save(ktv);

            User ktvUser = User.builder()
                    .username("ktv_lan")
                    .passwordHash(passwordEncoder.encode("123456"))
                    .email("lan.tran@clinic.com")
                    .phoneNumber("0918776655")
                    .status("ACTIVE")
                    .person(ktv)
                    .build();
            ktvUser.addRole(labTechRole);
            ktvUser.addRole(staffRole);
            userRepository.save(ktvUser);
            log.info("-> Đã tạo tài khoản Kỹ thuật viên: ktv_lan / 123456 (Trần Thị Lan) với vai trò ROLE_LAB_TECH");
        } else {
            userRepository.findByUsername("ktv_lan").ifPresent(u -> {
                boolean hasLabTech = u.getUserRoles().stream()
                        .anyMatch(ur -> "ROLE_LAB_TECH".equals(ur.getRole().getName()));
                if (!hasLabTech) {
                    u.addRole(labTechRole);
                    userRepository.save(u);
                    log.info("-> Đã cập nhật bổ sung vai trò ROLE_LAB_TECH cho tài khoản ktv_lan");
                }
            });
        }

        // 7. Tạo 5 Bệnh nhân mẫu với các độ tuổi và nhóm máu khác nhau
        Patient patientNam = createPatientIfNotFound(
                "patient_nam", "Trần Hoài Nam", "Nam", LocalDate.of(2000, 10, 10),
                "001200998877", "0977112233", "nam.tran@gmail.com", "O+", patientRole
        );

        Patient patientLan = createPatientIfNotFound(
                "patient_lan", "Nguyễn Thị Lan", "Nữ", LocalDate.of(1952, 6, 15),
                "001052123456", "0912345678", "lan.nguyen@gmail.com", "A+", patientRole
        );

        Patient patientBao = createPatientIfNotFound(
                "patient_bao", "Vũ Quốc Bảo", "Nam", LocalDate.of(1995, 12, 22),
                "001095234567", "0903456789", "bao.vu@gmail.com", "B+", patientRole
        );

        Patient patientThao = createPatientIfNotFound(
                "patient_thao", "Đặng Thu Thảo", "Nữ", LocalDate.of(1998, 4, 5),
                "001098345678", "0944556677", "thao.dang@gmail.com", "AB+", patientRole
        );

        Patient patientKhang = createPatientIfNotFound(
                "patient_khang", "Bé Lê Tuấn Khang", "Nam", LocalDate.of(2021, 9, 1),
                "001221456789", "0933221100", "khang.le@gmail.com", "O+", patientRole
        );

        // 8. Tạo phong phú danh sách Lịch làm việc (WorkSchedules) cho nhiều ngày
        seedRichWorkSchedulesIfEmpty(
                doctorHung, doctorHoa, doctorLong, doctorDuc, doctorThuy, doctorDung, doctorYen,
                room101, room102, room103, room201, room202, room203, room301
        );

        // 9. Khởi tạo danh mục thuốc mẫu (30 loại thuốc chuẩn phục vụ kê đơn)
        seedMedicinesIfEmpty();

        // 10. Khởi tạo các bệnh án mẫu đa dạng
        seedSampleMedicalRecordsIfEmpty(doctorHung, doctorHoa, doctorDuc, patientNam, patientLan, patientBao, patientThao);

        // 11. Khởi tạo vé khám mẫu & lịch hẹn mẫu cho Dashboard thống kê
        seedSampleTicketsAndAppointmentsIfEmpty(room101, room102, room103, room201, doctorHung, doctorHoa, patientNam, patientLan);

        // 12. Mỗi lần khởi động: đảm bảo hôm nay có hàng đợi để test luồng gọi số (bác sĩ gọi, lễ tân điều phối)
        initComprehensiveLabServices();
        initSampleLabWorkflowTickets(LocalDate.now(), room101, room102, doctorHung, doctorHoa);
        seedTodayQueueTicketsForTesting();

        log.info("==> Dữ liệu mẫu phong phú đã được khởi tạo thành công 100%!");
    }

    private void seedRichWorkSchedulesIfEmpty(
            Doctor dHung, Doctor dHoa, Doctor dLong, Doctor dDuc, Doctor dThuy, Doctor dDung, Doctor dYen,
            ExaminationRoom r101, ExaminationRoom r102, ExaminationRoom r103,
            ExaminationRoom r201, ExaminationRoom r202, ExaminationRoom r203, ExaminationRoom r301
    ) {
        LocalDate today = LocalDate.now();

        // Tạo lịch từ hôm qua, hôm nay đến 7 ngày tới
        for (int i = -1; i <= 7; i++) {
            LocalDate d = today.plusDays(i);

            // Ca Sáng
            createScheduleIfNotFound(dHung, r101, d, "CA_SÁNG", LocalTime.of(7, 30), LocalTime.of(12, 0), 20, i == 0 ? 16 : 8, i == 0 ? "AVAILABLE" : "AVAILABLE");
            createScheduleIfNotFound(dHoa, r102, d, "CA_SÁNG", LocalTime.of(7, 30), LocalTime.of(12, 0), 18, i == 0 ? 18 : 12, i == 0 ? "FULL" : "AVAILABLE");
            createScheduleIfNotFound(dLong, r201, d, "CA_SÁNG", LocalTime.of(8, 0), LocalTime.of(12, 0), 25, i == 0 ? 10 : 5, "AVAILABLE");
            createScheduleIfNotFound(dDuc, r103, d, "CA_SÁNG", LocalTime.of(7, 30), LocalTime.of(11, 30), 15, i == 0 ? 6 : 4, "AVAILABLE");

            // Ca Chiều
            createScheduleIfNotFound(dHung, r101, d, "CA_CHIỀU", LocalTime.of(13, 30), LocalTime.of(17, 30), 20, i == 0 ? 12 : 2, "AVAILABLE");
            createScheduleIfNotFound(dThuy, r202, d, "CA_CHIỀU", LocalTime.of(13, 30), LocalTime.of(17, 0), 15, i == 0 ? 9 : 3, "AVAILABLE");
            createScheduleIfNotFound(dDung, r203, d, "CA_CHIỀU", LocalTime.of(13, 30), LocalTime.of(17, 30), 12, i == 0 ? 7 : 0, "AVAILABLE");
            createScheduleIfNotFound(dYen, r301, d, "CA_CHIỀU", LocalTime.of(14, 0), LocalTime.of(18, 0), 16, i == 0 ? 11 : 1, "AVAILABLE");

            // Ca Tối (thứ 2, 4, 6)
            int dayOfWeek = d.getDayOfWeek().getValue();
            if (dayOfWeek == 1 || dayOfWeek == 3 || dayOfWeek == 5) {
                createScheduleIfNotFound(dHung, r101, d, "CA_TỐI", LocalTime.of(18, 0), LocalTime.of(21, 0), 12, i == 0 ? 5 : 0, "AVAILABLE");
                createScheduleIfNotFound(dHoa, r102, d, "CA_TỐI", LocalTime.of(18, 0), LocalTime.of(21, 0), 10, i == 0 ? 4 : 0, "AVAILABLE");
            }
        }
        log.info("-> Đã khởi tạo đầy đủ ca trực cho 7 bác sĩ trên 7 phòng khám xuyên suốt 9 ngày!");
    }

    private void createScheduleIfNotFound(
            Doctor doctor,
            ExaminationRoom room,
            LocalDate date,
            String shiftType,
            LocalTime start,
            LocalTime end,
            int maxPatients,
            int booked,
            String status
    ) {
        boolean exists = workScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(doctor.getId(), date, date)
                .stream()
                .anyMatch(s -> s.getStartTime().equals(start));
        if (!exists) {
            WorkSchedule ws = WorkSchedule.builder()
                    .doctor(doctor)
                    .examinationRoom(room)
                    .workDate(date)
                    .shiftType(shiftType)
                    .startTime(start)
                    .endTime(end)
                    .maxPatients(maxPatients)
                    .currentBookedCount(booked)
                    .status(status)
                    .build();
            workScheduleRepository.save(ws);
        }
    }

    private Doctor createDoctorIfNotFound(
            String username,
            String employeeCode,
            String fullName,
            String academicTitle,
            Integer yearsOfExperience,
            String biography,
            Specialty specialty,
            String position,
            String gender,
            LocalDate dob,
            String nationalId,
            String email,
            String phone,
            Role doctorRole
    ) {
        if (doctorRepository.findByEmployeeCode(employeeCode).isPresent()) {
            return doctorRepository.findByEmployeeCode(employeeCode).get();
        }

        Doctor doctor = Doctor.builder()
                .academicTitle(academicTitle)
                .yearsOfExperience(yearsOfExperience)
                .biography(biography)
                .averageConsultationTime(15)
                .specialty(specialty)
                .employeeCode(employeeCode)
                .position(position)
                .fullName(fullName)
                .gender(gender)
                .dateOfBirth(dob)
                .address("Hà Nội")
                .nationalId(nationalId)
                .build();
        doctor = doctorRepository.save(doctor);

        if (!userRepository.existsByUsername(username)) {
            User doctorUser = User.builder()
                    .username(username)
                    .passwordHash(passwordEncoder.encode("Doctor@123456"))
                    .email(email)
                    .phoneNumber(phone)
                    .status("ACTIVE")
                    .person(doctor)
                    .build();
            doctorUser.addRole(doctorRole);
            userRepository.save(doctorUser);
            log.info("-> Đã tạo tài khoản Bác sĩ: {} / Doctor@123456 ({})", username, fullName);
        }
        return doctor;
    }

    private Patient createPatientIfNotFound(
            String username,
            String fullName,
            String gender,
            LocalDate dob,
            String nationalId,
            String phone,
            String email,
            String bloodGroup,
            Role patientRole
    ) {
        if (userRepository.existsByUsername(username)) {
            User u = userRepository.findByUsername(username).orElse(null);
            if (u != null && u.getPerson() instanceof Patient) {
                return (Patient) u.getPerson();
            }
        }

        Patient patient = Patient.builder()
                .fullName(fullName)
                .gender(gender)
                .dateOfBirth(dob)
                .address("Hà Nội")
                .nationalId(nationalId)
                .bloodGroup(bloodGroup)
                .emergencyContactName("Người thân của " + fullName)
                .emergencyContactPhone(phone)
                .build();
        patient = patientRepository.save(patient);

        User patientUser = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode("Patient@123456"))
                .email(email)
                .phoneNumber(phone)
                .status("ACTIVE")
                .person(patient)
                .build();
        patientUser.addRole(patientRole);
        userRepository.save(patientUser);
        log.info("-> Đã tạo tài khoản Bệnh nhân: {} / Patient@123456 ({})", username, fullName);
        return patient;
    }

    private MedicineCategory createCategoryIfNotFound(String code, String name, String description, int order) {
        return medicineCategoryRepository.findByCode(code)
                .orElseGet(() -> medicineCategoryRepository.save(MedicineCategory.builder()
                        .code(code)
                        .name(name)
                        .description(description)
                        .displayOrder(order)
                        .isActive(true)
                        .build()));
    }

    private void seedMedicinesIfEmpty() {
        MedicineCategory catKS = createCategoryIfNotFound("KS", "Kháng sinh & Kháng khuẩn", "Các loại kháng sinh phổ rộng và chuyên khoa", 1);
        MedicineCategory catGD = createCategoryIfNotFound("GD-HS", "Giảm đau - Hạ sốt - Kháng viêm", "Thuốc giảm đau thông thường, hạ sốt, NSAIDs", 2);
        MedicineCategory catTH = createCategoryIfNotFound("TH-DD", "Tiêu hóa & Dạ dày", "Thuốc kháng acid dạ dày, men vi sinh, cầm tiêu chảy", 3);
        MedicineCategory catTM = createCategoryIfNotFound("TM-HA", "Tim mạch - Huyết áp - Chuyển hóa", "Thuốc hạ huyết áp, mỡ máu, đái tháo đường", 4);
        MedicineCategory catHH = createCategoryIfNotFound("HH-DU", "Hô hấp & Chống dị ứng", "Thuốc long đờm, giãn phế quản, kháng histamin", 5);
        MedicineCategory catVT = createCategoryIfNotFound("VT-KCH", "Vitamin - Khoáng chất & Bổ não", "Bổ sung vi chất, tăng đề kháng và tuần hoàn não", 6);
        MedicineCategory catDN = createCategoryIfNotFound("D-NGOAI", "Thuốc dùng ngoài & Nhỏ mắt", "Thuốc tra mắt, xịt mũi, gel bôi giảm đau ngoài da", 7);

        if (medicineRepository.count() > 0) {
            List<Medicine> existing = medicineRepository.findAll();
            for (Medicine m : existing) {
                if (m.getCategory() == null || m.getCode() == null || m.getPrice() == null) {
                    if (m.getName().contains("Paracetamol") || m.getName().contains("Panadol") || m.getName().contains("Ibuprofen") || m.getName().contains("Meloxicam") || m.getName().contains("Alpha")) {
                        m.setCategory(catGD);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 2500.0);
                    } else if (m.getName().contains("Augmentin") || m.getName().contains("Cefixim") || m.getName().contains("Azithromycin")) {
                        m.setCategory(catKS);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 18000.0);
                    } else if (m.getName().contains("Nexium") || m.getName().contains("Omeprazol") || m.getName().contains("Phosphalugel") || m.getName().contains("Smecta") || m.getName().contains("Enterogermina") || m.getName().contains("Oresol")) {
                        m.setCategory(catTH);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 12000.0);
                    } else if (m.getName().contains("Amlodipine") || m.getName().contains("Losartan") || m.getName().contains("Metformin") || m.getName().contains("Atorvastatin")) {
                        m.setCategory(catTM);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 6500.0);
                    } else if (m.getName().contains("Telfast") || m.getName().contains("Loratadine") || m.getName().contains("Acetylcystein") || m.getName().contains("Prospan") || m.getName().contains("Decolgen")) {
                        m.setCategory(catHH);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 8000.0);
                    } else if (m.getName().contains("Berocca") || m.getName().contains("Vitamin C") || m.getName().contains("Ginkgo") || m.getName().contains("Magie B6")) {
                        m.setCategory(catVT);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 5000.0);
                    } else {
                        m.setCategory(catDN);
                        m.setPrice(m.getPrice() != null ? m.getPrice() : 25000.0);
                    }
                    if (m.getCode() == null) {
                        m.setCode("MED-" + String.format("%03d", m.getId()));
                    }
                    if (m.getStockQuantity() == null) {
                        m.setStockQuantity(500);
                    }
                    if (m.getIsActive() == null) {
                        m.setIsActive(true);
                    }
                    if (m.getCreatedAt() == null) {
                        m.setCreatedAt(java.time.LocalDateTime.now());
                    }
                    if (m.getUpdatedAt() == null) {
                        m.setUpdatedAt(java.time.LocalDateTime.now());
                    }
                    medicineRepository.save(m);
                }
            }
            return;
        }

        List<Medicine> medicines = List.of(
                Medicine.builder().code("MED-001").name("Paracetamol 500mg").activeIngredient("Paracetamol").dosageForm("Viên nén").unit("Viên").price(1500.0).stockQuantity(1200).packaging("Hộp 10 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catGD).defaultUsageInstructions("Uống 1 viên khi sốt trên 38.5 độ C, cách 4-6 giờ").build(),
                Medicine.builder().code("MED-002").name("Panadol Extra").activeIngredient("Paracetamol 500mg + Caffeine 65mg").dosageForm("Viên nén").unit("Viên").price(2500.0).stockQuantity(950).packaging("Hộp 15 vỉ x 12 viên").routeOfAdministration("Đường uống").category(catGD).defaultUsageInstructions("Uống 1-2 viên/lần khi đau đầu, mệt mỏi, tối đa 4 lần/ngày").build(),
                Medicine.builder().code("MED-003").name("Augmentin 1g").activeIngredient("Amoxicillin 875mg + Acid Clavulanic 125mg").dosageForm("Viên bao phim").unit("Viên").price(22000.0).stockQuantity(400).packaging("Hộp 2 vỉ x 7 viên").routeOfAdministration("Đường uống").category(catKS).defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau khi ăn no").build(),
                Medicine.builder().code("MED-004").name("Cefixim 200mg").activeIngredient("Cefixime").dosageForm("Viên nang").unit("Viên").price(14000.0).stockQuantity(600).packaging("Hộp 2 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catKS).defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau bữa ăn").build(),
                Medicine.builder().code("MED-005").name("Azithromycin 500mg").activeIngredient("Azithromycin").dosageForm("Viên nén").unit("Viên").price(18000.0).stockQuantity(350).packaging("Hộp 1 vỉ x 3 viên").routeOfAdministration("Đường uống").category(catKS).defaultUsageInstructions("Uống 1 viên/ngày trước ăn 1 giờ hoặc sau ăn 2 giờ (liệu trình 3 ngày)").build(),
                Medicine.builder().code("MED-006").name("Ibuprofen 400mg").activeIngredient("Ibuprofen").dosageForm("Viên bao đường").unit("Viên").price(3000.0).stockQuantity(800).packaging("Hộp 10 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catGD).defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau khi ăn no").build(),
                Medicine.builder().code("MED-007").name("Meloxicam 7.5mg").activeIngredient("Meloxicam").dosageForm("Viên nén").unit("Viên").price(4500.0).stockQuantity(500).packaging("Hộp 3 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catGD).defaultUsageInstructions("Uống 1 viên/ngày sau bữa ăn chính").build(),
                Medicine.builder().code("MED-008").name("Nexium 40mg").activeIngredient("Esomeprazole").dosageForm("Viên bao tan trong ruột").unit("Viên").price(28000.0).stockQuantity(450).packaging("Hộp 4 vỉ x 7 viên").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Uống 1 viên vào buổi sáng trước khi ăn 30-60 phút").build(),
                Medicine.builder().code("MED-009").name("Omeprazol 20mg").activeIngredient("Omeprazole").dosageForm("Viên nang").unit("Viên").price(3500.0).stockQuantity(700).packaging("Hộp 3 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Uống 1 viên trước ăn sáng 30 phút").build(),
                Medicine.builder().code("MED-010").name("Phosphalugel (Chữ P)").activeIngredient("Gel Aluminium Phosphate 20%").dosageForm("Hỗn dịch uống").unit("Gói").price(6000.0).stockQuantity(850).packaging("Hộp 26 gói").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Uống 1 gói khi đau rát dạ dày hoặc sau bữa ăn").build(),
                Medicine.builder().code("MED-011").name("Amlodipine 5mg").activeIngredient("Amlodipine besylate").dosageForm("Viên nén").unit("Viên").price(3200.0).stockQuantity(900).packaging("Hộp 3 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catTM).defaultUsageInstructions("Uống 1 viên duy nhất vào buổi sáng cố định").build(),
                Medicine.builder().code("MED-012").name("Losartan 50mg").activeIngredient("Losartan potassium").dosageForm("Viên bao phim").unit("Viên").price(4000.0).stockQuantity(800).packaging("Hộp 3 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catTM).defaultUsageInstructions("Uống 1 viên/ngày vào buổi sáng").build(),
                Medicine.builder().code("MED-013").name("Metformin 500mg").activeIngredient("Metformin HCl").dosageForm("Viên nén").unit("Viên").price(2200.0).stockQuantity(1000).packaging("Hộp 5 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catTM).defaultUsageInstructions("Uống 1 viên x 2 lần/ngày cùng bữa ăn").build(),
                Medicine.builder().code("MED-014").name("Atorvastatin 20mg").activeIngredient("Atorvastatin calcium").dosageForm("Viên bao phim").unit("Viên").price(8500.0).stockQuantity(650).packaging("Hộp 3 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catTM).defaultUsageInstructions("Uống 1 viên vào buổi tối trước khi đi ngủ").build(),
                Medicine.builder().code("MED-015").name("Telfast HD 180mg").activeIngredient("Fexofenadine HCl").dosageForm("Viên bao phim").unit("Viên").price(12500.0).stockQuantity(550).packaging("Hộp 1 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catHH).defaultUsageInstructions("Uống 1 viên/ngày khi có biểu hiện dị ứng").build(),
                Medicine.builder().code("MED-016").name("Loratadine 10mg").activeIngredient("Loratadine").dosageForm("Viên nén").unit("Viên").price(2000.0).stockQuantity(850).packaging("Hộp 10 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catHH).defaultUsageInstructions("Uống 1 viên vào buổi sáng hoặc tối").build(),
                Medicine.builder().code("MED-017").name("Acetylcystein 200mg").activeIngredient("Acetylcysteine").dosageForm("Gói thuốc bột").unit("Gói").price(3500.0).stockQuantity(900).packaging("Hộp 30 gói x 3g").routeOfAdministration("Đường uống").category(catHH).defaultUsageInstructions("Hòa 1 gói với 50ml nước đun sôi để nguội, uống 3 lần/ngày").build(),
                Medicine.builder().code("MED-018").name("Siro ho Prospan 100ml").activeIngredient("Cao lá thường xuân khô").dosageForm("Siro uống").unit("Chai").price(85000.0).stockQuantity(300).packaging("Chai 100ml").routeOfAdministration("Đường uống").category(catHH).defaultUsageInstructions("Uống 5ml/lần x 3 lần/ngày sau bữa ăn").build(),
                Medicine.builder().code("MED-019").name("Oresol 245").activeIngredient("Glucose, Natri clorid, Kali clorid").dosageForm("Gói thuốc bột").unit("Gói").price(2500.0).stockQuantity(1500).packaging("Hộp 20 gói").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Pha 1 gói với đúng 200ml nước sôi để nguội, uống từng ngụm rải rác").build(),
                Medicine.builder().code("MED-020").name("Smecta 3g").activeIngredient("Diosmectite").dosageForm("Gói hỗn dịch").unit("Gói").price(4500.0).stockQuantity(1100).packaging("Hộp 30 gói").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Khuấy đều 1 gói vào 50ml nước, uống 2-3 lần/ngày xa bữa ăn").build(),
                Medicine.builder().code("MED-021").name("Enterogermina 5ml").activeIngredient("Bào tử Bacillus clausii").dosageForm("Hỗn dịch uống").unit("Ống").price(9000.0).stockQuantity(800).packaging("Hộp 20 ống").routeOfAdministration("Đường uống").category(catTH).defaultUsageInstructions("Lắc kỹ trước khi uống, dùng 1-2 ống/ngày sau bữa ăn").build(),
                Medicine.builder().code("MED-022").name("Berocca Performance").activeIngredient("Vitamin B complex + Vitamin C + Kẽm").dosageForm("Viên sủi").unit("Viên").price(9500.0).stockQuantity(600).packaging("Tuýp 10 viên sủi").routeOfAdministration("Đường uống").category(catVT).defaultUsageInstructions("Hòa tan 1 viên vào 200ml nước, uống vào buổi sáng sau ăn").build(),
                Medicine.builder().code("MED-023").name("Vitamin C 500mg").activeIngredient("Acid ascorbic").dosageForm("Viên sủi").unit("Viên").price(3000.0).stockQuantity(750).packaging("Tuýp 10 viên").routeOfAdministration("Đường uống").category(catVT).defaultUsageInstructions("Hòa tan 1 viên trong 150ml nước, uống sau bữa ăn sáng").build(),
                Medicine.builder().code("MED-024").name("Decolgen Forte").activeIngredient("Paracetamol + Chlorpheniramine").dosageForm("Viên nén").unit("Viên").price(2200.0).stockQuantity(900).packaging("Hộp 25 vỉ x 4 viên").routeOfAdministration("Đường uống").category(catHH).defaultUsageInstructions("Uống 1 viên x 3 lần/ngày để giảm hắt hơi, sổ mũi").build(),
                Medicine.builder().code("MED-025").name("Alpha Chymotrypsine (Choay)").activeIngredient("Chymotrypsin").dosageForm("Viên ngậm dưới lưỡi").unit("Viên").price(4000.0).stockQuantity(850).packaging("Hộp 2 vỉ x 10 viên").routeOfAdministration("Ngậm dưới lưỡi").category(catGD).defaultUsageInstructions("Ngậm dưới lưỡi 2 viên/lần x 2-3 lần/ngày").build(),
                Medicine.builder().code("MED-026").name("Nước muối sinh lý 0.9%").activeIngredient("Natri Clorid 0.9%").dosageForm("Dung dịch nhỏ mắt mũi").unit("Lọ").price(5000.0).stockQuantity(1200).packaging("Lọ 10ml").routeOfAdministration("Nhỏ mắt, mũi").category(catDN).defaultUsageInstructions("Nhỏ 2-3 giọt vào mỗi bên mũi/mắt khi vệ sinh").build(),
                Medicine.builder().code("MED-027").name("Salonpas Gel 30g").activeIngredient("Methyl Salicylate + L-Menthol").dosageForm("Gel bôi ngoài da").unit("Tuýp").price(38000.0).stockQuantity(350).packaging("Tuýp 30g").routeOfAdministration("Bôi ngoài da").category(catDN).defaultUsageInstructions("Bôi xoa bóp nhẹ một lượng vừa đủ lên vùng cơ bị đau nhức").build(),
                Medicine.builder().code("MED-028").name("Tobradex 5ml").activeIngredient("Tobramycin + Dexamethasone").dosageForm("Hỗn dịch nhỏ mắt").unit("Lọ").price(56000.0).stockQuantity(250).packaging("Lọ 5ml").routeOfAdministration("Nhỏ mắt").category(catDN).defaultUsageInstructions("Nhỏ 1 giọt vào mắt bị viêm nhiễm mỗi 4-6 giờ").build(),
                Medicine.builder().code("MED-029").name("Ginkgo Biloba 80mg").activeIngredient("Cao khô lá Bạch quả").dosageForm("Viên nang mềm").unit("Viên").price(6500.0).stockQuantity(500).packaging("Hộp 6 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catVT).defaultUsageInstructions("Uống 1 viên x 2 lần/ngày trong bữa ăn để tăng tuần hoàn não").build(),
                Medicine.builder().code("MED-030").name("Magie B6").activeIngredient("Magnesium lactate + Vitamin B6").dosageForm("Viên bao phim").unit("Viên").price(2500.0).stockQuantity(700).packaging("Hộp 5 vỉ x 10 viên").routeOfAdministration("Đường uống").category(catVT).defaultUsageInstructions("Uống 1 viên x 2 lần/ngày với nhiều nước").build()
        );

        medicineRepository.saveAll(medicines);
        log.info("-> Đã khởi tạo thành công 30 loại thuốc mẫu đầy đủ mã, nhóm, giá và tồn kho!");
    }

    private void seedSampleMedicalRecordsIfEmpty(
            Doctor dHung, Doctor dHoa, Doctor dDuc,
            Patient pNam, Patient pLan, Patient pBao, Patient pThao
    ) {
        if (medicalRecordRepository.count() >= 3) return;

        // Bệnh án 1: Viêm họng cấp (BS Hùng khám cho BN Nam)
        if (pNam != null && dHung != null) {
            MedicalRecord record1 = MedicalRecord.builder()
                    .patient(pNam)
                    .doctor(dHung)
                    .bloodPressure("120/80")
                    .heartRate(78)
                    .temperature(37.4)
                    .weight(68.0)
                    .height(172.0)
                    .vitalSigns("Thể trạng trung bình, niêm mạc họng đỏ rực, amidan sưng nhẹ")
                    .symptoms("Bệnh nhân sốt nhẹ 2 ngày, đau rát họng khi nuốt, ho khan từng cơn, nghẹt mũi")
                    .preliminaryDiagnosis("Viêm đường hô hấp trên cấp tính")
                    .finalDiagnosis("Viêm họng cấp (J02) - Cúm mùa")
                    .icd10Code("J02.9")
                    .notes("Uống nhiều nước ấm, súc họng bằng nước muối sinh lý 0.9%, tránh uống nước đá")
                    .revisitDate(LocalDate.now().plusDays(5))
                    .revisitNotes("Tái khám sau 5 ngày nếu còn sốt hoặc đau rát họng tăng")
                    .build();

            Medicine para = medicineRepository.findByName("Paracetamol 500mg").orElse(null);
            Medicine aug = medicineRepository.findByName("Augmentin 1g").orElse(null);
            Medicine pro = medicineRepository.findByName("Siro ho Prospan 100ml").orElse(null);

            Prescription pres1 = Prescription.builder()
                    .medicalRecord(record1)
                    .doctorAdvice("Uống thuốc đúng giờ, uống hết liệu trình kháng sinh 5 ngày.")
                    .items(new ArrayList<>())
                    .build();

            if (para != null) {
                pres1.getItems().add(PrescriptionItem.builder().prescription(pres1).medicine(para).quantity(10).dosage("1 viên/lần khi sốt").route("Đường uống").daysSupply(5).instructions("Uống khi sốt > 38.5 độ C, cách 4-6 giờ").build());
            }
            if (aug != null) {
                pres1.getItems().add(PrescriptionItem.builder().prescription(pres1).medicine(aug).quantity(10).dosage("1 viên/lần, ngày 2 lần").route("Đường uống").daysSupply(5).instructions("Uống sau bữa ăn sáng và tối").build());
            }
            if (pro != null) {
                pres1.getItems().add(PrescriptionItem.builder().prescription(pres1).medicine(pro).quantity(1).dosage("5ml/lần, ngày 3 lần").route("Đường uống").daysSupply(5).instructions("Uống sau bữa ăn").build());
            }
            record1.setPrescription(pres1);
            medicalRecordRepository.save(record1);
        }

        // Bệnh án 2: Tăng huyết áp & Mỡ máu (BS Hoa khám cho BN Lan)
        if (pLan != null && dHoa != null) {
            MedicalRecord record2 = MedicalRecord.builder()
                    .patient(pLan)
                    .doctor(dHoa)
                    .bloodPressure("155/95")
                    .heartRate(84)
                    .temperature(36.8)
                    .weight(62.0)
                    .height(155.0)
                    .vitalSigns("Huyết áp cao, tim đều, không phù chi dưới, tiếng T1 T2 rõ")
                    .symptoms("Bệnh nhân hoa mắt chóng mặt khi thay đổi tư thế, nặng đầu vùng gáy vào buổi sáng")
                    .preliminaryDiagnosis("Tăng huyết áp vô căn độ 2")
                    .finalDiagnosis("Tăng huyết áp nguyên phát (I10) - Rối loạn chuyển hóa lipoprotein (E78.0)")
                    .icd10Code("I10")
                    .notes("Hạn chế ăn mặn (<5g muối/ngày), giảm mỡ động vật, tập thể dục dưỡng sinh 30 phút/ngày")
                    .revisitDate(LocalDate.now().plusDays(28))
                    .revisitNotes("Tái khám định kỳ sau 1 tháng mang theo sổ theo dõi huyết áp tại nhà")
                    .build();

            Medicine amlo = medicineRepository.findByName("Amlodipine 5mg").orElse(null);
            Medicine ator = medicineRepository.findByName("Atorvastatin 20mg").orElse(null);

            Prescription pres2 = Prescription.builder()
                    .medicalRecord(record2)
                    .doctorAdvice("Duy trì uống thuốc huyết áp đều đặn mỗi sáng, không tự ý ngừng thuốc.")
                    .items(new ArrayList<>())
                    .build();

            if (amlo != null) {
                pres2.getItems().add(PrescriptionItem.builder().prescription(pres2).medicine(amlo).quantity(30).dosage("1 viên/ngày vào buổi sáng").route("Đường uống").daysSupply(30).instructions("Uống cố định vào 7h sáng mỗi ngày").build());
            }
            if (ator != null) {
                pres2.getItems().add(PrescriptionItem.builder().prescription(pres2).medicine(ator).quantity(30).dosage("1 viên/ngày vào buổi tối").route("Đường uống").daysSupply(30).instructions("Uống trước khi đi ngủ").build());
            }
            record2.setPrescription(pres2);
            medicalRecordRepository.save(record2);
        }

        // Bệnh án 3: Viêm mũi xoang dị ứng (BS Đức khám cho BN Thảo)
        if (pThao != null && dDuc != null) {
            MedicalRecord record3 = MedicalRecord.builder()
                    .patient(pThao)
                    .doctor(dDuc)
                    .bloodPressure("110/70")
                    .heartRate(72)
                    .temperature(36.6)
                    .weight(50.0)
                    .height(160.0)
                    .vitalSigns("Thể trạng tốt, niêm mạc cuốn mũi nề nhẹ, dịch mũi trong")
                    .symptoms("Hắt hơi liên tục vào buổi sáng, ngứa mũi ngứa mắt, chảy nước mũi trong khi tiếp xúc bụi")
                    .preliminaryDiagnosis("Viêm mũi xoang dị ứng mạn tính")
                    .finalDiagnosis("Viêm mũi dị ứng do thời tiết & dị nguyên (J30.4)")
                    .icd10Code("J30.4")
                    .notes("Đeo khẩu trang khi ra đường, rửa mũi bằng nước muối sinh lý ấm mỗi ngày")
                    .revisitDate(LocalDate.now().plusDays(14))
                    .revisitNotes("Tái khám sau 2 tuần nếu triệu chứng ngạt mũi không thuyên giảm")
                    .build();

            Medicine telfast = medicineRepository.findByName("Telfast HD 180mg").orElse(null);
            Medicine muoi = medicineRepository.findByName("Nước muối sinh lý 0.9%").orElse(null);

            Prescription pres3 = Prescription.builder()
                    .medicalRecord(record3)
                    .doctorAdvice("Rửa mũi sạch trước khi dùng thuốc xịt, giữ ấm cổ ngực.")
                    .items(new ArrayList<>())
                    .build();

            if (telfast != null) {
                pres3.getItems().add(PrescriptionItem.builder().prescription(pres3).medicine(telfast).quantity(10).dosage("1 viên/ngày").route("Đường uống").daysSupply(10).instructions("Uống sau bữa ăn tối").build());
            }
            if (muoi != null) {
                pres3.getItems().add(PrescriptionItem.builder().prescription(pres3).medicine(muoi).quantity(3).dosage("Nhỏ 2-3 giọt/bên x 3 lần/ngày").route("Nhỏ mũi").daysSupply(10).instructions("Rửa mũi hàng ngày").build());
            }
            record3.setPrescription(pres3);
            medicalRecordRepository.save(record3);
        }

        log.info("-> Đã khởi tạo các hồ sơ bệnh án và đơn thuốc mẫu chi tiết!");
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

    private ExaminationRoom createRoomIfNotFound(String roomNumber, String roomName, Integer floor) {
        return examinationRoomRepository.findByRoomNumber(roomNumber)
                .orElseGet(() -> examinationRoomRepository.save(ExaminationRoom.builder()
                        .roomNumber(roomNumber)
                        .roomName(roomName)
                        .floor(floor)
                        .build()));
    }

    private void seedSampleTicketsAndAppointmentsIfEmpty(
            ExaminationRoom room101, ExaminationRoom room102, ExaminationRoom room103, ExaminationRoom room201,
            Doctor doctorHung, Doctor doctorHoa, Patient patientNam, Patient patientLan
    ) {
        if (queueTicketRepository.count() > 0 && appointmentRepository.count() > 0) return;

        LocalDate today = LocalDate.now();

        // 1. Tạo các vé khám mẫu trong 5 ngày qua và hôm nay
        if (queueTicketRepository.count() == 0) {
            List<QueueTicket> sampleTickets = new ArrayList<>();

            // Hôm nay: 4 ca hoàn tất, 1 ca đang khám, 2 ca đang chờ
            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P101-001").ticketDate(today).patientName("Trần Hoài Nam").patientPhone("0977112233")
                    .patientGender("Nam").patientYearOfBirth(2000).status("COMPLETED").isEmergency(false).hasAppointment(true)
                    .priorityScore(30).checkInTime(LocalTime.of(8, 5)).callTime(LocalTime.of(8, 20))
                    .startTime(LocalTime.of(8, 22)).endTime(LocalTime.of(8, 45)).estimatedWaitingMinutes(15)
                    .examinationRoom(room101).doctor(doctorHung).patient(patientNam).build());

            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P101-002").ticketDate(today).patientName("Nguyễn Thị Lan").patientPhone("0912345678")
                    .patientGender("Nữ").patientYearOfBirth(1952).status("COMPLETED").isEmergency(false).hasAppointment(false)
                    .priorityScore(20).checkInTime(LocalTime.of(8, 25)).callTime(LocalTime.of(8, 48))
                    .startTime(LocalTime.of(8, 50)).endTime(LocalTime.of(9, 15)).estimatedWaitingMinutes(23)
                    .examinationRoom(room102).doctor(doctorHoa).patient(patientLan).build());

            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P103-001").ticketDate(today).patientName("Phạm Văn Hùng").patientPhone("0988776655")
                    .patientGender("Nam").patientYearOfBirth(1980).status("COMPLETED").isEmergency(false).hasAppointment(true)
                    .priorityScore(30).checkInTime(LocalTime.of(8, 30)).callTime(LocalTime.of(8, 45))
                    .startTime(LocalTime.of(8, 46)).endTime(LocalTime.of(9, 10)).estimatedWaitingMinutes(15)
                    .examinationRoom(room103).build());

            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P201-001").ticketDate(today).patientName("Bé Lê Tuấn Khang").patientPhone("0933221100")
                    .patientGender("Nam").patientYearOfBirth(2021).status("COMPLETED").isEmergency(false).hasAppointment(false)
                    .priorityScore(20).checkInTime(LocalTime.of(8, 40)).callTime(LocalTime.of(8, 58))
                    .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(9, 25)).estimatedWaitingMinutes(18)
                    .examinationRoom(room201).build());

            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P101-003").ticketDate(today).patientName("Vũ Quốc Bảo").patientPhone("0903456789")
                    .patientGender("Nam").patientYearOfBirth(1995).status("IN_PROGRESS").isEmergency(false).hasAppointment(false)
                    .priorityScore(0).checkInTime(LocalTime.of(9, 10)).callTime(LocalTime.of(9, 20))
                    .startTime(LocalTime.of(9, 22)).estimatedWaitingMinutes(10)
                    .examinationRoom(room101).doctor(doctorHung).build());

            sampleTickets.add(QueueTicket.builder()
                    .ticketNumber("P101-004").ticketDate(today).patientName("Đặng Thu Thảo").patientPhone("0944556677")
                    .patientGender("Nữ").patientYearOfBirth(1998).status("WAITING").isEmergency(false).hasAppointment(false)
                    .priorityScore(0).checkInTime(LocalTime.of(9, 25)).estimatedWaitingMinutes(15)
                    .examinationRoom(room101).doctor(doctorHung).build());

            // Dữ liệu các ngày trước (để vẽ biểu đồ 7 ngày trên Dashboard)
            for (int i = 1; i <= 6; i++) {
                LocalDate pastDate = today.minusDays(i);
                int count = 5 + (i * 2) % 7;
                for (int j = 1; j <= count; j++) {
                    LocalTime cIn = LocalTime.of(8, 10 + (j * 15) % 50);
                    LocalTime cStart = cIn.plusMinutes(12 + (j * 3) % 15);
                    LocalTime cEnd = cStart.plusMinutes(15);
                    sampleTickets.add(QueueTicket.builder()
                            .ticketNumber("P101-" + String.format("%03d", j))
                            .ticketDate(pastDate)
                            .patientName("Bệnh nhân ngày T-" + i + " #" + j)
                            .patientPhone("0912000" + (100 + j))
                            .patientGender(j % 2 == 0 ? "Nữ" : "Nam")
                            .patientYearOfBirth(1985 + j)
                            .status("COMPLETED")
                            .priorityScore(0)
                            .checkInTime(cIn)
                            .callTime(cStart.minusMinutes(1))
                            .startTime(cStart)
                            .endTime(cEnd)
                            .estimatedWaitingMinutes(15)
                            .examinationRoom(j % 2 == 0 ? room102 : room101)
                            .doctor(doctorHung)
                            .build());
                }
            }

            queueTicketRepository.saveAll(sampleTickets);
            log.info("-> Đã khởi tạo danh sách vé khám mẫu cho hôm nay và các ngày trước phục vụ Dashboard!");
        }

        // 2. Tạo các lịch hẹn mẫu
        if (appointmentRepository.count() == 0) {
            List<Appointment> sampleAppointments = new ArrayList<>();

            sampleAppointments.add(Appointment.builder()
                    .appointmentDate(today).estimatedStartTime(LocalTime.of(8, 0))
                    .reasonForVisit("Tái khám kiểm tra huyết áp định kỳ").status("COMPLETED")
                    .patient(patientLan).doctor(doctorHoa).build());

            sampleAppointments.add(Appointment.builder()
                    .appointmentDate(today).estimatedStartTime(LocalTime.of(10, 0))
                    .reasonForVisit("Đau đầu âm ỉ kèm chóng mặt").status("CONFIRMED")
                    .patient(patientNam).doctor(doctorHung).build());

            sampleAppointments.add(Appointment.builder()
                    .appointmentDate(today).estimatedStartTime(LocalTime.of(14, 30))
                    .reasonForVisit("Khám sức khỏe tổng quát").status("CANCELLED")
                    .cancellationReason("Bận công tác đột xuất, dời sang tuần sau")
                    .patient(patientNam).doctor(doctorHung).build());

            for (int i = 1; i <= 6; i++) {
                LocalDate pastDate = today.minusDays(i);
                sampleAppointments.add(Appointment.builder()
                        .appointmentDate(pastDate).estimatedStartTime(LocalTime.of(9, 0))
                        .reasonForVisit("Khám định kỳ").status("COMPLETED")
                        .doctor(doctorHung).build());

                sampleAppointments.add(Appointment.builder()
                        .appointmentDate(pastDate).estimatedStartTime(LocalTime.of(15, 0))
                        .reasonForVisit("Khám ho và sốt").status(i % 3 == 0 ? "CANCELLED" : "COMPLETED")
                        .cancellationReason(i % 3 == 0 ? "Bệnh nhân tự khỏi, không đến khám" : null)
                        .doctor(doctorHung).build());
            }

            appointmentRepository.saveAll(sampleAppointments);
            log.info("-> Đã khởi tạo các cuộc hẹn mẫu với trạng thái hoàn tất / huỷ lịch để tính tỷ lệ huỷ!");
        }

        // 3. Khởi tạo danh mục dịch vụ cận lâm sàng / xét nghiệm (Lab Services)
        initComprehensiveLabServices();

        // 4. Khởi tạo các ca dữ liệu mẫu chuyên biệt cho luồng Xét Nghiệm
        initSampleLabWorkflowTickets(today, room101, room102, doctorHung, doctorHoa);
    }

    private void initComprehensiveLabServices() {
        createLabServiceIfNotFound("XN-HEM-01", "Tổng phân tích tế bào máu ngoại vi bằng máy laser (22 thông số)",
                120000.0, "4.0 - 10.0 G/L (WBC), 4.2 - 5.4 T/L (RBC)", 4.0, 10.0, "G/L", "Huyết học",
                "Đánh giá số lượng bạch cầu, hồng cầu, tiểu cầu, phát hiện tình trạng nhiễm trùng, thiếu máu.");

        createLabServiceIfNotFound("XN-GLU-01", "Định lượng Glucose trong máu (Đường huyết lúc đói)",
                60000.0, "3.9 - 6.4 mmol/L", 3.9, 6.4, "mmol/L", "Sinh hóa máu",
                "Sàng lọc, chẩn đoán và theo dõi điều trị đái tháo đường.");

        createLabServiceIfNotFound("XN-HBA1C-01", "Đo phần trăm HbA1c trong máu (Sắc ký lỏng)",
                150000.0, "4.0 - 5.6 %", 4.0, 5.6, "%", "Sinh hóa máu",
                "Chỉ số vàng theo dõi đường huyết trung bình trong 3 tháng gần nhất.");

        createLabServiceIfNotFound("XN-URE-01", "Định lượng Ure máu",
                60000.0, "2.5 - 7.5 mmol/L", 2.5, 7.5, "mmol/L", "Sinh hóa máu",
                "Đánh giá chức năng lọc cầu thận và tình trạng chuyển hóa đạm.");

        createLabServiceIfNotFound("XN-CRE-01", "Định lượng Creatinin huyết thanh",
                65000.0, "62 - 115 umol/L", 62.0, 115.0, "umol/L", "Sinh hóa máu",
                "Đánh giá chính xác chức năng lọc cầu thận và độ thanh thải thận.");

        createLabServiceIfNotFound("XN-AST-01", "Đo hoạt độ AST (GOT) trong máu",
                55000.0, "< 37 U/L", 0.0, 37.0, "U/L", "Men gan",
                "Đánh giá tổn thương tế bào gan, hoại tử nhu mô gan hoặc cơ tim.");

        createLabServiceIfNotFound("XN-ALT-01", "Đo hoạt độ ALT (GPT) trong máu",
                55000.0, "< 40 U/L", 0.0, 40.0, "U/L", "Men gan",
                "Chỉ số đặc hiệu cảnh báo viêm gan cấp, viêm gan virus, tổn thương gan do thuốc.");

        createLabServiceIfNotFound("XN-GGT-01", "Đo hoạt độ GGT (Gamma GT) trong máu",
                65000.0, "< 55 U/L", 0.0, 55.0, "U/L", "Men gan",
                "Đánh giá tổn thương đường mật, ứ mật và tác hại của rượu bia lên gan.");

        createLabServiceIfNotFound("XN-CHOL-01", "Định lượng Cholesterol toàn phần",
                70000.0, "3.9 - 5.2 mmol/L", 3.9, 5.2, "mmol/L", "Mỡ máu",
                "Sàng lọc rối loạn lipid máu và nguy cơ mảng xơ vữa động mạch.");

        createLabServiceIfNotFound("XN-TRIG-01", "Định lượng Triglycerid huyết thanh",
                65000.0, "0.4 - 1.7 mmol/L", 0.4, 1.7, "mmol/L", "Mỡ máu",
                "Đánh giá rối loạn chuyển hóa mỡ máu và nguy cơ viêm tụy cấp khi tăng quá cao.");

        createLabServiceIfNotFound("XN-HDL-01", "Định lượng HDL-Cholesterol (Mỡ tốt bảo vệ tim)",
                70000.0, "> 1.0 mmol/L", 1.0, 3.5, "mmol/L", "Mỡ máu",
                "Mỡ có lợi giúp vận chuyển cholesterol dư thừa từ mạch máu về gan thoái hóa.");

        createLabServiceIfNotFound("XN-LDL-01", "Định lượng LDL-Cholesterol (Mỡ xấu gây xơ vữa)",
                70000.0, "< 3.4 mmol/L", 0.0, 3.4, "mmol/L", "Mỡ máu",
                "Yếu tố nguy cơ hàng đầu gây tắc nghẽn động mạch và nhồi máu cơ tim.");

        createLabServiceIfNotFound("XN-URIC-01", "Định lượng Acid Uric trong máu",
                65000.0, "200 - 420 umol/L", 200.0, 420.0, "umol/L", "Sinh hóa máu",
                "Chẩn đoán cơn gút (gout) cấp tính và theo dõi nồng độ acid uric ở người thừa đạm.");

        createLabServiceIfNotFound("XN-URI-01", "Tổng phân tích nước tiểu tự động (10 thông số)",
                50000.0, "Âm tính các thông số bệnh lý", null, null, "Que thử", "Nước tiểu",
                "Phát hiện hồng cầu, bạch cầu, protein, đường trong nước tiểu, tầm soát bệnh thận - tiết niệu.");

        createLabServiceIfNotFound("XN-DENGUE-01", "Test nhanh kháng nguyên & kháng thể Sốt xuất huyết Dengue",
                180000.0, "Âm tính (Negative)", null, null, "Test nhanh", "Miễn dịch",
                "Phát hiện sớm kháng nguyên NS1 và kháng thể IgM/IgG Dengue từ ngày đầu của sốt.");

        createLabServiceIfNotFound("XN-CRP-01", "Định lượng CRP (C-Reactive Protein định lượng cao)",
                130000.0, "< 5.0 mg/L", 0.0, 5.0, "mg/L", "Miễn dịch",
                "Chỉ số sinh học đánh giá nhanh phản ứng viêm nhiễm cấp do vi khuẩn.");

        createLabServiceIfNotFound("CDHA-XR-01", "Chụp X-Quang ngực thẳng kỹ thuật số (CR/DR)",
                150000.0, "Hình ảnh tim phổi bình thường", null, null, "Phim", "Chẩn đoán hình ảnh",
                "Kiểm tra tổn thương nhu mô phổi, phế quản, bóng tim và xương lồng ngực.");

        createLabServiceIfNotFound("CDHA-US-01", "Siêu âm ổ bụng tổng quát Doppler màu",
                180000.0, "Cấu trúc gan, mật, tụy, lách, thận bình thường", null, null, "Lần", "Chẩn đoán hình ảnh",
                "Khảo sát hình thái các tạng trong ổ bụng, phát hiện khối u, sỏi, nang, dịch tự do.");

        createLabServiceIfNotFound("CDHA-ECG-01", "Ghi điện tim (ECG) 12 chuyển đạo",
                80000.0, "Nhịp xoang đều, tần số 60 - 90 chu kỳ/phút", null, null, "Bản ghi", "Chẩn đoán hình ảnh",
                "Phát hiện nhanh rối loạn nhịp tim, thiếu máu cục bộ cơ tim và phì đại tâm thất.");

        createLabServiceIfNotFound("CDHA-CT-01", "Chụp cắt lớp vi tính (CT Scanner) sọ não",
                950000.0, "Nhu mô não không thấy ổ tổn thương tỷ trọng bất thường", null, null, "Lần", "Chẩn đoán hình ảnh",
                "Chẩn đoán tai biến mạch máu não, xuất huyết não, chấn thương sọ não cấp.");

        log.info("-> Đã kiểm tra và đồng bộ đầy đủ danh mục xét nghiệm & cận lâm sàng!");
    }

    private LabService createLabServiceIfNotFound(String code, String name, Double price, String refRange,
                                                  Double lower, Double upper, String unit, String category, String desc) {
        return labServiceRepository.findByServiceCode(code).orElseGet(() -> {
            LabService s = LabService.builder()
                    .serviceCode(code)
                    .serviceName(name)
                    .price(price)
                    .referenceRange(refRange)
                    .lowerLimit(lower)
                    .upperLimit(upper)
                    .unit(unit)
                    .category(category)
                    .description(desc)
                    .isActive(true)
                    .build();
            return labServiceRepository.save(s);
        });
    }

    /**
     * Tạo hàng đợi của NGÀY HÔM NAY cho mọi phòng có ca trực: vài bệnh nhân chờ khám (có người cao tuổi,
     * người đặt trước) và một bệnh nhân nhỡ lượt. Phòng nào hôm nay đã có từ 3 người chờ hoặc có người nhỡ lượt
     * thì bỏ qua, nên khởi động lại backend không bị nhân đôi dữ liệu.
     */
    private void seedTodayQueueTicketsForTesting() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        String[][] patients = {
                {"Ngô Thị Hạnh", "Nữ", "1950", "0911000101"},
                {"Trịnh Văn Toàn", "Nam", "1987", "0911000102"},
                {"Lương Thị Thu", "Nữ", "1993", "0911000103"},
                {"Bé Phan Gia Huy", "Nam", "2020", "0911000104"},
                {"Đỗ Mạnh Cường", "Nam", "1979", "0911000105"},
                {"Cao Thị Ngọc", "Nữ", "2001", "0911000106"},
                {"Tạ Quang Vinh", "Nam", "1966", "0911000107"},
        };
        // {chỉ số bệnh nhân, trạng thái, điểm ưu tiên, cấp cứu, đặt trước, phút trước hiện tại, ghi chú}
        Object[][] layout = {
                {0, "WAITING", 30, false, false, 40, "Người cao tuổi, đau đầu chóng mặt"},
                {1, "WAITING", 20, false, true, 35, "Đã đặt lịch online"},
                {2, "WAITING", 0, false, false, 30, "Ho, sốt nhẹ 2 ngày"},
                {3, "WAITING", 30, false, false, 25, "Trẻ nhỏ, sốt 38.5°C"},
                {4, "WAITING", 0, false, false, 15, "Đau bụng vùng thượng vị"},
                {5, "SKIPPED", 0, false, false, 50, "Đã gọi nhưng vắng mặt"},
        };

        int roomIndex = 0;
        for (ExaminationRoom room : examinationRoomRepository.findAllByOrderByRoomNumberAsc()) {
            Doctor doctor = workScheduleRepository.findByExaminationRoomIdAndWorkDate(room.getId(), today).stream()
                    .filter(ws -> !"CANCELLED".equals(ws.getStatus()) && ws.getDoctor() != null)
                    .sorted((a, b) -> {
                        boolean aActive = a.getEndTime() == null || a.getEndTime().isAfter(now);
                        boolean bActive = b.getEndTime() == null || b.getEndTime().isAfter(now);
                        if (aActive != bActive) return aActive ? -1 : 1;
                        return a.getStartTime().compareTo(b.getStartTime());
                    })
                    .map(WorkSchedule::getDoctor)
                    .findFirst().orElse(null);
            if (doctor == null) continue;

            List<QueueTicket> todayTickets = queueTicketRepository
                    .findByTicketDateAndExaminationRoomIdOrderByPriorityScoreDescCheckInTimeAsc(today, room.getId());
            long waitingCount = todayTickets.stream().filter(t -> "WAITING".equals(t.getStatus())).count();
            boolean hasSkipped = todayTickets.stream().anyMatch(t -> "SKIPPED".equals(t.getStatus()));
            if (waitingCount >= 3 || hasSkipped) continue;

            String prefix = room.getRoomNumber().replace(".", "").replace(" ", "").toUpperCase() + "-";
            int seq = queueTicketRepository.findTicketNumbersByDateAndPrefix(today, prefix).stream()
                    .map(n -> n.substring(prefix.length()))
                    .filter(n -> n.matches("\\d+"))
                    .mapToInt(Integer::parseInt)
                    .max().orElse(0);

            List<QueueTicket> tickets = new ArrayList<>();
            for (int i = 0; i < layout.length; i++) {
                Object[] row = layout[i];
                // Xoay vòng danh sách tên để mỗi phòng có bệnh nhân khác nhau
                String[] p = patients[((Integer) row[0] + roomIndex) % patients.length];
                String status = (String) row[1];
                boolean emergency = (Boolean) row[3];
                LocalTime checkIn = now.minusMinutes((Integer) row[5]);
                if (checkIn.isAfter(now)) checkIn = LocalTime.MIDNIGHT;

                tickets.add(QueueTicket.builder()
                        .ticketNumber(String.format("%s%03d", prefix, ++seq))
                        .ticketDate(today)
                        .patientName(p[0])
                        .patientGender(p[1])
                        .patientYearOfBirth(Integer.parseInt(p[2]))
                        .patientPhone(p[3].substring(0, 8) + roomIndex + i)
                        .status(status)
                        .isEmergency(emergency)
                        .hasAppointment((Boolean) row[4])
                        .priorityScore((Integer) row[2] + (emergency ? 100 : 0))
                        .checkInTime(checkIn)
                        .callTime("SKIPPED".equals(status) ? checkIn.plusMinutes(10) : null)
                        .estimatedWaitingMinutes(15 * (i + 1))
                        .notes((String) row[6])
                        .examinationRoom(room)
                        .doctor(doctor)
                        .build());
            }
            queueTicketRepository.saveAll(tickets);
            roomIndex++;
            log.info("-> Đã tạo {} vé hàng đợi hôm nay cho phòng {} (BS: {})", tickets.size(), room.getRoomNumber(), doctor.getFullName());
        }
    }

    private void initSampleLabWorkflowTickets(LocalDate today, ExaminationRoom room101, ExaminationRoom room102,
                                             Doctor doctorHung, Doctor doctorHoa) {
        // Ca 1: P101-005 - WAITING_FOR_RESULTS (Có 2 chỉ định PENDING để KTV test bấm "Tiếp nhận" và "Nhập KQ")
        if (queueTicketRepository.findByTicketNumberAndTicketDate("P101-005", today).isEmpty()) {
            QueueTicket ticket1 = QueueTicket.builder()
                    .ticketNumber("P101-005")
                    .ticketDate(today)
                    .patientName("Hoàng Minh Tuấn")
                    .patientPhone("0912888999")
                    .patientGender("Nam")
                    .patientYearOfBirth(1990)
                    .status("WAITING_FOR_RESULTS")
                    .isEmergency(false)
                    .hasAppointment(false)
                    .priorityScore(0)
                    .checkInTime(LocalTime.of(9, 30))
                    .callTime(LocalTime.of(9, 40))
                    .startTime(LocalTime.of(9, 42))
                    .estimatedWaitingMinutes(20)
                    .examinationRoom(room101)
                    .doctor(doctorHung)
                    .build();
            ticket1 = queueTicketRepository.save(ticket1);

            MedicalRecord record1 = medicalRecordRepository.save(MedicalRecord.builder()
                    .symptoms("Sốt cao 39°C liên tục 3 ngày, đau mỏi cơ khớp toàn thân, nhức hai hốc mắt, mệt lả.")
                    .preliminaryDiagnosis("Theo dõi Sốt xuất huyết Dengue ngày thứ 3 / Sốt siêu vi")
                    .vitalSigns("HA: 115/75 mmHg, Mạch: 88 ck/ph, T: 39.1°C, SpO2: 98%")
                    .bloodPressure("115/75").heartRate(88).temperature(39.1).weight(68.0).height(172.0)
                    .queueTicket(ticket1).doctor(doctorHung).build());

            LabService hem = labServiceRepository.findByServiceCode("XN-HEM-01").orElse(null);
            LabService dengue = labServiceRepository.findByServiceCode("XN-DENGUE-01").orElse(null);

            List<LabOrder> orders = new ArrayList<>();
            if (hem != null) {
                orders.add(LabOrder.builder().medicalRecord(record1).labService(hem).price(hem.getPrice())
                        .status("PENDING").notes("Kiểm tra số lượng tiểu cầu và hematocrit xem có cô đặc máu không").build());
            }
            if (dengue != null) {
                orders.add(LabOrder.builder().medicalRecord(record1).labService(dengue).price(dengue.getPrice())
                        .status("PENDING").notes("Test NS1 Ag và IgM/IgG chẩn đoán sốt xuất huyết").build());
            }
            labOrderRepository.saveAll(orders);
            log.info("-> Đã tạo ca P101-005 (Hoàng Minh Tuấn) với 2 chỉ định PENDING!");
        }

        // Ca 2: P102-003 - WAITING_FOR_RESULTS (Có 2 chỉ định PROCESSING đang chạy máy sinh hóa)
        if (queueTicketRepository.findByTicketNumberAndTicketDate("P102-003", today).isEmpty()) {
            QueueTicket ticket2 = QueueTicket.builder()
                    .ticketNumber("P102-003")
                    .ticketDate(today)
                    .patientName("Bùi Thanh Hương")
                    .patientPhone("0983112233")
                    .patientGender("Nữ")
                    .patientYearOfBirth(1975)
                    .status("WAITING_FOR_RESULTS")
                    .isEmergency(false)
                    .hasAppointment(true)
                    .priorityScore(10)
                    .checkInTime(LocalTime.of(8, 45))
                    .callTime(LocalTime.of(8, 55))
                    .startTime(LocalTime.of(9, 0))
                    .estimatedWaitingMinutes(15)
                    .examinationRoom(room102)
                    .doctor(doctorHoa)
                    .build();
            ticket2 = queueTicketRepository.save(ticket2);

            MedicalRecord record2 = medicalRecordRepository.save(MedicalRecord.builder()
                    .symptoms("Tức nặng ngực trái khi gắng sức, hồi hộp trống ngực, tiền sử tăng mỡ máu.")
                    .preliminaryDiagnosis("Theo dõi Bệnh mạch vành / Rối loạn lipid máu hỗn hợp")
                    .vitalSigns("HA: 135/85 mmHg, Mạch: 78 ck/ph, T: 36.6°C, SpO2: 99%")
                    .bloodPressure("135/85").heartRate(78).temperature(36.6).weight(58.0).height(155.0)
                    .queueTicket(ticket2).doctor(doctorHoa).build());

            LabService chol = labServiceRepository.findByServiceCode("XN-CHOL-01").orElse(null);
            LabService ldl = labServiceRepository.findByServiceCode("XN-LDL-01").orElse(null);
            LabService ecg = labServiceRepository.findByServiceCode("CDHA-ECG-01").orElse(null);

            List<LabOrder> orders2 = new ArrayList<>();
            if (chol != null) {
                orders2.add(LabOrder.builder().medicalRecord(record2).labService(chol).price(chol.getPrice())
                        .status("PROCESSING").resultValue("Đang ly tâm mẫu huyết thanh").notes("Mẫu máu lấy lúc 09:10").build());
            }
            if (ldl != null) {
                orders2.add(LabOrder.builder().medicalRecord(record2).labService(ldl).price(ldl.getPrice())
                        .status("PROCESSING").resultValue("Đang ủ hóa chất đo quang").notes("Chờ đọc kết quả máy tự động").build());
            }
            if (ecg != null) {
                orders2.add(LabOrder.builder().medicalRecord(record2).labService(ecg).price(ecg.getPrice())
                        .status("COMPLETED").resultValue("Nhịp xoang đều, 76 ck/phút, ST không chênh")
                        .conclusion("Chưa thấy hình ảnh thiếu máu cục bộ cơ tim trên điện tâm đồ").performedTime(LocalDateTime.now().minusMinutes(20))
                        .notes("Đã in bản ghi 12 cần").build());
            }
            labOrderRepository.saveAll(orders2);
            log.info("-> Đã tạo ca P102-003 (Bùi Thanh Hương) với 2 chỉ định PROCESSING và 1 COMPLETED!");
        }

        // Ca 3: P101-006 - RESULTS_READY (Đã có kết quả xét nghiệm, có chỉ số bất thường vọt ngưỡng bôi đỏ)
        if (queueTicketRepository.findByTicketNumberAndTicketDate("P101-006", today).isEmpty()) {
            QueueTicket ticket3 = QueueTicket.builder()
                    .ticketNumber("P101-006")
                    .ticketDate(today)
                    .patientName("Lê Thị Mai")
                    .patientPhone("0988665544")
                    .patientGender("Nữ")
                    .patientYearOfBirth(1982)
                    .status("RESULTS_READY")
                    .isEmergency(false)
                    .hasAppointment(false)
                    .priorityScore(0)
                    .checkInTime(LocalTime.of(9, 15))
                    .callTime(LocalTime.of(9, 25))
                    .startTime(LocalTime.of(9, 27))
                    .estimatedWaitingMinutes(10)
                    .examinationRoom(room101)
                    .doctor(doctorHung)
                    .build();
            ticket3 = queueTicketRepository.save(ticket3);

            MedicalRecord record3 = medicalRecordRepository.save(MedicalRecord.builder()
                    .symptoms("Khát nước nhiều, tiểu đêm 3-4 lần, sụt 3kg trong 1 tháng qua, ăn nhiều nhưng hay mệt mỏi.")
                    .preliminaryDiagnosis("Theo dõi Đái tháo đường type 2 / Rối loạn chuyển hóa men gan")
                    .vitalSigns("HA: 130/85 mmHg, Mạch: 80 ck/ph, T: 36.8°C, BMI: 25.4")
                    .bloodPressure("130/85").heartRate(80).temperature(36.8).weight(64.0).height(158.0)
                    .queueTicket(ticket3).doctor(doctorHung).build());

            LabService glu = labServiceRepository.findByServiceCode("XN-GLU-01").orElse(null);
            LabService alt = labServiceRepository.findByServiceCode("XN-ALT-01").orElse(null);
            LabService hba1c = labServiceRepository.findByServiceCode("XN-HBA1C-01").orElse(null);

            List<LabOrder> orders3 = new ArrayList<>();
            if (glu != null) {
                orders3.add(LabOrder.builder().medicalRecord(record3).labService(glu).price(glu.getPrice())
                        .resultValue("9.8").isAbnormal(true).conclusion("Đường huyết lúc đói tăng cao vượt ngưỡng tham chiếu (3.9 - 6.4 mmol/L)")
                        .status("COMPLETED").performedTime(LocalDateTime.now().minusMinutes(15)).notes("Đã kiểm tra lại 2 lần trên máy sinh hóa").build());
            }
            if (alt != null) {
                orders3.add(LabOrder.builder().medicalRecord(record3).labService(alt).price(alt.getPrice())
                        .resultValue("68.0").isAbnormal(true).conclusion("Hoạt độ men gan ALT tăng gấp 1.7 lần giới hạn trên (< 40 U/L)")
                        .status("COMPLETED").performedTime(LocalDateTime.now().minusMinutes(15)).notes("Huyết thanh đục nhẹ").build());
            }
            if (hba1c != null) {
                orders3.add(LabOrder.builder().medicalRecord(record3).labService(hba1c).price(hba1c.getPrice())
                        .resultValue("7.8").isAbnormal(true).conclusion("Chỉ số HbA1c tăng cao (> 6.5%), xác định đái tháo đường chưa kiểm soát")
                        .status("COMPLETED").performedTime(LocalDateTime.now().minusMinutes(15)).notes("Chạy sắc ký lỏng cao áp").build());
            }
            labOrderRepository.saveAll(orders3);
            log.info("-> Đã tạo ca P101-006 (Lê Thị Mai) với 3 chỉ định COMPLETED bất thường!");
        }

        // Ca 4: P101-007 - WAITING (Chờ vào khám ban đầu)
        if (queueTicketRepository.findByTicketNumberAndTicketDate("P101-007", today).isEmpty()) {
            QueueTicket ticketWaiting = QueueTicket.builder()
                    .ticketNumber("P101-007")
                    .ticketDate(today)
                    .patientName("Nguyễn Văn An")
                    .patientPhone("0977223344")
                    .patientGender("Nam")
                    .patientYearOfBirth(1988)
                    .status("WAITING")
                    .isEmergency(false)
                    .hasAppointment(false)
                    .priorityScore(0)
                    .checkInTime(LocalTime.of(9, 45))
                    .estimatedWaitingMinutes(25)
                    .examinationRoom(room101)
                    .doctor(doctorHung)
                    .build();
            queueTicketRepository.save(ticketWaiting);
            log.info("-> Đã tạo ca P101-007 (Nguyễn Văn An) trạng thái WAITING!");
        }
    }
}
