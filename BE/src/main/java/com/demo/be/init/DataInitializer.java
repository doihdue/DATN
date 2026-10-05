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

    private void seedMedicinesIfEmpty() {
        if (medicineRepository.count() > 0) return;

        List<Medicine> medicines = List.of(
                Medicine.builder().name("Paracetamol 500mg").activeIngredient("Paracetamol").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên khi sốt trên 38.5 độ C, cách 4-6 giờ").build(),
                Medicine.builder().name("Panadol Extra").activeIngredient("Paracetamol 500mg + Caffeine 65mg").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1-2 viên/lần khi đau đầu, mệt mỏi, tối đa 4 lần/ngày").build(),
                Medicine.builder().name("Augmentin 1g").activeIngredient("Amoxicillin 875mg + Acid Clavulanic 125mg").dosageForm("Viên bao phim").unit("Viên").defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau khi ăn no").build(),
                Medicine.builder().name("Cefixim 200mg").activeIngredient("Cefixime").dosageForm("Viên nang").unit("Viên").defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau bữa ăn").build(),
                Medicine.builder().name("Azithromycin 500mg").activeIngredient("Azithromycin").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên/ngày trước ăn 1 giờ hoặc sau ăn 2 giờ (liệu trình 3 ngày)").build(),
                Medicine.builder().name("Ibuprofen 400mg").activeIngredient("Ibuprofen").dosageForm("Viên bao đường").unit("Viên").defaultUsageInstructions("Uống 1 viên/lần x 2 lần/ngày sau khi ăn no").build(),
                Medicine.builder().name("Meloxicam 7.5mg").activeIngredient("Meloxicam").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên/ngày sau bữa ăn chính").build(),
                Medicine.builder().name("Nexium 40mg").activeIngredient("Esomeprazole").dosageForm("Viên bao tan trong ruột").unit("Viên").defaultUsageInstructions("Uống 1 viên vào buổi sáng trước khi ăn 30-60 phút").build(),
                Medicine.builder().name("Omeprazol 20mg").activeIngredient("Omeprazole").dosageForm("Viên nang").unit("Viên").defaultUsageInstructions("Uống 1 viên trước ăn sáng 30 phút").build(),
                Medicine.builder().name("Phosphalugel (Chữ P)").activeIngredient("Gel Aluminium Phosphate 20%").dosageForm("Hỗn dịch uống").unit("Gói").defaultUsageInstructions("Uống 1 gói khi đau rát dạ dày hoặc sau bữa ăn").build(),
                Medicine.builder().name("Amlodipine 5mg").activeIngredient("Amlodipine besylate").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên duy nhất vào buổi sáng cố định").build(),
                Medicine.builder().name("Losartan 50mg").activeIngredient("Losartan potassium").dosageForm("Viên bao phim").unit("Viên").defaultUsageInstructions("Uống 1 viên/ngày vào buổi sáng").build(),
                Medicine.builder().name("Metformin 500mg").activeIngredient("Metformin HCl").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên x 2 lần/ngày cùng bữa ăn").build(),
                Medicine.builder().name("Atorvastatin 20mg").activeIngredient("Atorvastatin calcium").dosageForm("Viên bao phim").unit("Viên").defaultUsageInstructions("Uống 1 viên vào buổi tối trước khi đi ngủ").build(),
                Medicine.builder().name("Telfast HD 180mg").activeIngredient("Fexofenadine HCl").dosageForm("Viên bao phim").unit("Viên").defaultUsageInstructions("Uống 1 viên/ngày khi có biểu hiện dị ứng").build(),
                Medicine.builder().name("Loratadine 10mg").activeIngredient("Loratadine").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên vào buổi sáng hoặc tối").build(),
                Medicine.builder().name("Acetylcystein 200mg").activeIngredient("Acetylcysteine").dosageForm("Gói thuốc bột").unit("Gói").defaultUsageInstructions("Hòa 1 gói với 50ml nước đun sôi để nguội, uống 3 lần/ngày").build(),
                Medicine.builder().name("Siro ho Prospan 100ml").activeIngredient("Cao lá thường xuân khô").dosageForm("Siro uống").unit("Chai").defaultUsageInstructions("Uống 5ml/lần x 3 lần/ngày sau bữa ăn").build(),
                Medicine.builder().name("Oresol 245").activeIngredient("Glucose, Natri clorid, Kali clorid").dosageForm("Gói thuốc bột").unit("Gói").defaultUsageInstructions("Pha 1 gói với đúng 200ml nước sôi để nguội, uống từng ngụm rải rác").build(),
                Medicine.builder().name("Smecta 3g").activeIngredient("Diosmectite").dosageForm("Gói hỗn dịch").unit("Gói").defaultUsageInstructions("Khuấy đều 1 gói vào 50ml nước, uống 2-3 lần/ngày xa bữa ăn").build(),
                Medicine.builder().name("Enterogermina 5ml").activeIngredient("Bào tử Bacillus clausii").dosageForm("Hỗn dịch uống").unit("Ống").defaultUsageInstructions("Lắc kỹ trước khi uống, dùng 1-2 ống/ngày sau bữa ăn").build(),
                Medicine.builder().name("Berocca Performance").activeIngredient("Vitamin B complex + Vitamin C + Kẽm").dosageForm("Viên sủi").unit("Viên").defaultUsageInstructions("Hòa tan 1 viên vào 200ml nước, uống vào buổi sáng sau ăn").build(),
                Medicine.builder().name("Vitamin C 500mg").activeIngredient("Acid ascorbic").dosageForm("Viên sủi").unit("Viên").defaultUsageInstructions("Hòa tan 1 viên trong 150ml nước, uống sau bữa ăn sáng").build(),
                Medicine.builder().name("Decolgen Forte").activeIngredient("Paracetamol + Chlorpheniramine").dosageForm("Viên nén").unit("Viên").defaultUsageInstructions("Uống 1 viên x 3 lần/ngày để giảm hắt hơi, sổ mũi").build(),
                Medicine.builder().name("Alpha Chymotrypsine (Choay)").activeIngredient("Chymotrypsin").dosageForm("Viên ngậm dưới lưỡi").unit("Viên").defaultUsageInstructions("Ngậm dưới lưỡi 2 viên/lần x 2-3 lần/ngày").build(),
                Medicine.builder().name("Nước muối sinh lý 0.9%").activeIngredient("Natri Clorid 0.9%").dosageForm("Dung dịch nhỏ mắt mũi").unit("Lọ").defaultUsageInstructions("Nhỏ 2-3 giọt vào mỗi bên mũi/mắt khi vệ sinh").build(),
                Medicine.builder().name("Salonpas Gel 30g").activeIngredient("Methyl Salicylate + L-Menthol").dosageForm("Gel bôi ngoài da").unit("Tuýp").defaultUsageInstructions("Bôi xoa bóp nhẹ một lượng vừa đủ lên vùng cơ bị đau nhức").build(),
                Medicine.builder().name("Tobradex 5ml").activeIngredient("Tobramycin + Dexamethasone").dosageForm("Hỗn dịch nhỏ mắt").unit("Lọ").defaultUsageInstructions("Nhỏ 1 giọt vào mắt bị viêm nhiễm mỗi 4-6 giờ").build(),
                Medicine.builder().name("Ginkgo Biloba 80mg").activeIngredient("Cao khô lá Bạch quả").dosageForm("Viên nang mềm").unit("Viên").defaultUsageInstructions("Uống 1 viên x 2 lần/ngày trong bữa ăn để tăng tuần hoàn não").build(),
                Medicine.builder().name("Magie B6").activeIngredient("Magnesium lactate + Vitamin B6").dosageForm("Viên bao phim").unit("Viên").defaultUsageInstructions("Uống 1 viên x 2 lần/ngày với nhiều nước").build()
        );

        medicineRepository.saveAll(medicines);
        log.info("-> Đã khởi tạo thành công 30 loại thuốc mẫu vào danh mục dược phẩm!");
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
