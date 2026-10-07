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
        Specialty cardioSpecialty = createSpecialtyIfNotFound("Khoa Tim mạch", "Khám và điều trị các bệnh lý tim mạch");
        Specialty pediatricsSpecialty = createSpecialtyIfNotFound("Khoa Nhi", "Chăm sóc và điều trị sức khỏe trẻ em");

        // 2b. Tạo các phòng khám mẫu
        ExaminationRoom room101 = createRoomIfNotFound("P.101", "Phòng Khám Nội Tổng Quát 1", 1);
        ExaminationRoom room102 = createRoomIfNotFound("P.102", "Phòng Khám Tim Mạch Chuyên Sâu", 1);
        ExaminationRoom room201 = createRoomIfNotFound("P.201", "Phòng Khám Nhi - Dinh Dưỡng", 2);

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
                    .academicTitle("Bác sĩ Chuyên khoa II")
                    .yearsOfExperience(18)
                    .biography("Bác sĩ có hơn 18 năm kinh nghiệm trong lĩnh vực khám chữa bệnh nội tổng quát.")
                    .averageConsultationTime(15)
                    .specialty(generalSpecialty)
                    .employeeCode("DOC001")
                    .position("Bác sĩ Trưởng khoa")
                    .fullName("BS.CKII Nguyễn Văn Hùng")
                    .gender("Nam")
                    .dateOfBirth(LocalDate.of(1980, 5, 20))
                    .address("Hà Nội")
                    .nationalId("001080654321")
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

        // 7. Tạo lịch làm việc mẫu hôm nay cho Bác sĩ Hùng
        if (doctorRepository.findByEmployeeCode("DOC001").isPresent()) {
            Doctor doc = doctorRepository.findByEmployeeCode("DOC001").get();
            LocalDate today = LocalDate.now();
            if (workScheduleRepository.findByDoctorIdAndWorkDateBetweenOrderByWorkDateAscStartTimeAsc(doc.getId(), today, today).isEmpty()) {
                WorkSchedule schedule = WorkSchedule.builder()
                        .doctor(doc)
                        .examinationRoom(room101)
                        .workDate(today)
                        .shiftType("CA_SÁNG")
                        .startTime(LocalTime.of(8, 0))
                        .endTime(LocalTime.of(12, 0))
                        .maxPatients(20)
                        .currentBookedCount(0)
                        .status("AVAILABLE")
                        .build();
                workScheduleRepository.save(schedule);
                log.info("-> Đã tạo ca làm việc mẫu hôm nay cho BS.CKII Nguyễn Văn Hùng tại phòng P.101");
            }
        }

        // 8. Khởi tạo danh mục thuốc mẫu (30 loại thuốc phổ biến phục vụ kê đơn)
        seedMedicinesIfEmpty();

        // 9. Khởi tạo bệnh án tiền sử mẫu cho Bệnh nhân Nam
        seedSampleMedicalRecordIfEmpty();

        log.info("==> Dữ liệu mẫu Unicode NVARCHAR đã được khởi tạo thành công 100%!");
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

    private void seedSampleMedicalRecordIfEmpty() {
        if (medicalRecordRepository.count() > 0) return;

        patientRepository.findAll().stream().findFirst().ifPresent(patient -> {
            doctorRepository.findByEmployeeCode("DOC001").ifPresent(doctor -> {
                MedicalRecord record = MedicalRecord.builder()
                        .patient(patient)
                        .doctor(doctor)
                        .bloodPressure("120/80")
                        .heartRate(78)
                        .temperature(37.2)
                        .weight(68.0)
                        .height(172.0)
                        .vitalSigns("Thể trạng trung bình, da niêm mạc hồng, không phù")
                        .symptoms("Bệnh nhân sốt nhẹ 2 ngày, đau rát họng khi nuốt, ho khan từng cơn, nghẹt mũi")
                        .preliminaryDiagnosis("Viêm đường hô hấp trên cấp tính")
                        .finalDiagnosis("Viêm họng cấp (J02) - Cúm mùa")
                        .icd10Code("J02.9")
                        .notes("Uống nhiều nước ấm, súc họng bằng nước muối sinh lý 0.9%, nghỉ ngơi tại nhà")
                        .revisitDate(LocalDate.now().plusDays(5))
                        .revisitNotes("Tái khám sau 5 ngày hoặc ngay khi sốt cao > 39 độ hoặc khó thở")
                        .build();

                Medicine para = medicineRepository.findByName("Paracetamol 500mg").orElse(null);
                Medicine aug = medicineRepository.findByName("Augmentin 1g").orElse(null);
                Medicine pro = medicineRepository.findByName("Siro ho Prospan 100ml").orElse(null);

                Prescription prescription = Prescription.builder()
                        .medicalRecord(record)
                        .doctorAdvice("Uống thuốc đúng giờ, không tự ý ngưng kháng sinh giữa chừng.")
                        .items(new ArrayList<>())
                        .build();

                if (para != null) {
                    prescription.getItems().add(PrescriptionItem.builder()
                            .prescription(prescription)
                            .medicine(para)
                            .quantity(10)
                            .dosage("1 viên/lần khi sốt")
                            .route("Đường uống")
                            .daysSupply(5)
                            .instructions("Uống khi sốt > 38.5 độ C, cách nhau tối thiểu 4 tiếng")
                            .build());
                }

                if (aug != null) {
                    prescription.getItems().add(PrescriptionItem.builder()
                            .prescription(prescription)
                            .medicine(aug)
                            .quantity(10)
                            .dosage("1 viên/lần, ngày 2 lần")
                            .route("Đường uống")
                            .daysSupply(5)
                            .instructions("Uống sáng 1 viên, tối 1 viên sau ăn no")
                            .build());
                }

                if (pro != null) {
                    prescription.getItems().add(PrescriptionItem.builder()
                            .prescription(prescription)
                            .medicine(pro)
                            .quantity(1)
                            .dosage("5ml/lần, ngày 3 lần")
                            .route("Đường uống")
                            .daysSupply(5)
                            .instructions("Uống sáng, trưa, tối sau khi ăn")
                            .build());
                }

                record.setPrescription(prescription);
                medicalRecordRepository.save(record);
                log.info("-> Đã khởi tạo hồ sơ bệnh án tiền sử mẫu cho bệnh nhân {} (BS khám: {})", 
                        patient.getFullName(), doctor.getFullName());
            });
        });
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
}
