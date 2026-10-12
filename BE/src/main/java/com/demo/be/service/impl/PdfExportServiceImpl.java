package com.demo.be.service.impl;

import com.demo.be.dto.report.PrescriptionItemReportDto;
import com.demo.be.exception.BadRequestException;
import com.demo.be.exception.ResourceNotFoundException;
import com.demo.be.model.MedicalRecord;
import com.demo.be.model.Medicine;
import com.demo.be.model.PrescriptionItem;
import com.demo.be.repository.MedicalRecordRepository;
import com.demo.be.service.PdfExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfExportServiceImpl implements PdfExportService {

    private final MedicalRecordRepository medicalRecordRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // Cache template đã biên dịch để tối ưu hiệu năng
    private JasperReport compiledReport;

    private synchronized JasperReport getCompiledReport() throws JRException {
        if (compiledReport == null) {
            try {
                ClassPathResource resource = new ClassPathResource("reports/medical_record_report.jrxml");
                try (InputStream inputStream = resource.getInputStream()) {
                    compiledReport = JasperCompileManager.compileReport(inputStream);
                    log.info("-> Đã biên dịch thành công JasperReports template: medical_record_report.jrxml");
                }
            } catch (Exception e) {
                log.error("Lỗi khi tải và biên dịch template JRXML: {}", e.getMessage(), e);
                throw new JRException("Không thể nạp báo cáo Jasper: " + e.getMessage(), e);
            }
        }
        return compiledReport;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] exportMedicalRecordPdf(Long medicalRecordId) {
        log.info("Bắt đầu kết xuất PDF phiếu khám và đơn thuốc cho hồ sơ ID: {}", medicalRecordId);

        MedicalRecord record = medicalRecordRepository.findByIdWithDetails(medicalRecordId)
                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án", "id", medicalRecordId));

        try {
            JasperReport report = getCompiledReport();

            // 1. Chuẩn bị Tham số (Parameters)
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("clinicName", "PHÒNG KHÁM ĐA KHOA QUỐC TẾ MEDQUEUE");
            parameters.put("clinicAddress", "Địa chỉ: Km10, Đường Nguyễn Trãi, Q. Hà Đông, Hà Nội");
            parameters.put("clinicPhone", "Hotline cấp cứu & Đặt hẹn: 1900 6868 | Website: medqueue.vn");

            parameters.put("recordId", "#REC-" + record.getId());
            parameters.put("createdAt", record.getCreatedAt() != null ? record.getCreatedAt().format(DATE_TIME_FORMATTER) : "N/A");
            parameters.put("ticketNumber", record.getQueueTicket() != null ? "#" + record.getQueueTicket().getTicketNumber() : "N/A");

            // Thông tin bệnh nhân
            String patientName = "N/A";
            String patientDob = "N/A";
            String patientGender = "Chưa rõ";
            String patientPhone = "Chưa cập nhật";
            String patientAddress = "";
            String bloodGroup = "Chưa rõ";
            String allergies = "Không ghi nhận";

            if (record.getPatient() != null) {
                if (record.getPatient().getFullName() != null && !record.getPatient().getFullName().isBlank()) {
                    patientName = record.getPatient().getFullName().trim().toUpperCase();
                }
                if (record.getPatient().getDateOfBirth() != null) {
                    patientDob = record.getPatient().getDateOfBirth().format(DATE_FORMATTER);
                }
                if (record.getPatient().getGender() != null && !record.getPatient().getGender().isBlank()) {
                    patientGender = record.getPatient().getGender();
                }
                if (record.getPatient().getPhoneNumber() != null && !record.getPatient().getPhoneNumber().isBlank()) {
                    patientPhone = record.getPatient().getPhoneNumber();
                }
                if (record.getPatient().getAddress() != null) {
                    patientAddress = record.getPatient().getAddress();
                }
                if (record.getPatient().getBloodGroup() != null && !record.getPatient().getBloodGroup().isBlank()) {
                    bloodGroup = record.getPatient().getBloodGroup();
                }
                if (record.getPatient().getAllergies() != null && !record.getPatient().getAllergies().isBlank()) {
                    allergies = record.getPatient().getAllergies();
                }
            }

            // Nếu vé khám có thông tin chi tiết (được tiếp đón tại quầy cấp số)
            if (record.getQueueTicket() != null) {
                if (record.getQueueTicket().getPatientName() != null && !record.getQueueTicket().getPatientName().isBlank()) {
                    patientName = record.getQueueTicket().getPatientName().trim().toUpperCase();
                }
                if (record.getQueueTicket().getPatientPhone() != null && !record.getQueueTicket().getPatientPhone().isBlank()) {
                    patientPhone = record.getQueueTicket().getPatientPhone().trim();
                }
                if (record.getQueueTicket().getPatientDob() != null) {
                    patientDob = record.getQueueTicket().getPatientDob().format(DATE_FORMATTER);
                } else if (record.getQueueTicket().getPatientYearOfBirth() != null) {
                    patientDob = "Năm " + record.getQueueTicket().getPatientYearOfBirth();
                }
                if (record.getQueueTicket().getPatientGender() != null && !record.getQueueTicket().getPatientGender().isBlank() && !"Chưa rõ".equalsIgnoreCase(record.getQueueTicket().getPatientGender())) {
                    patientGender = record.getQueueTicket().getPatientGender();
                }
            }

            parameters.put("patientName", patientName);
            parameters.put("patientDob", patientDob);
            parameters.put("patientGender", patientGender);
            parameters.put("patientPhone", patientPhone);
            parameters.put("patientAddress", patientAddress);
            parameters.put("bloodGroup", bloodGroup);
            parameters.put("allergies", allergies);

            // Thông tin bác sĩ
            if (record.getDoctor() != null) {
                String title = record.getDoctor().getAcademicTitle() != null ? record.getDoctor().getAcademicTitle() + " " : "";
                parameters.put("doctorName", title + record.getDoctor().getFullName());
                if (record.getDoctor().getSpecialty() != null) {
                    parameters.put("specialtyName", record.getDoctor().getSpecialty().getName());
                } else {
                    parameters.put("specialtyName", "Đa khoa tổng quát");
                }
            } else {
                parameters.put("doctorName", "Bác sĩ phụ trách");
                parameters.put("specialtyName", "Khám bệnh đa khoa");
            }

            // Sinh hiệu
            parameters.put("bloodPressure", record.getBloodPressure() != null ? record.getBloodPressure() + " mmHg" : "---");
            parameters.put("heartRate", record.getHeartRate() != null ? record.getHeartRate() + " bpm" : "---");
            parameters.put("temperature", record.getTemperature() != null ? record.getTemperature() + " °C" : "---");
            parameters.put("weight", record.getWeight() != null ? record.getWeight() + " kg" : "---");
            parameters.put("height", record.getHeight() != null ? record.getHeight() + " cm" : "---");

            // Tính BMI
            String bmiDisplay = "---";
            if (record.getWeight() != null && record.getHeight() != null && record.getHeight() > 0) {
                double hM = record.getHeight() / 100.0;
                double bmiVal = Math.round((record.getWeight() / (hM * hM)) * 10.0) / 10.0;
                String state = bmiVal < 18.5 ? "Gầy" : (bmiVal < 23.0 ? "Chuẩn" : (bmiVal < 25.0 ? "Thừa cân" : "Béo phì"));
                bmiDisplay = bmiVal + " (" + state + ")";
            }
            parameters.put("bmi", bmiDisplay);

            // Chẩn đoán & Lâm sàng
            parameters.put("symptoms", record.getSymptoms() != null ? record.getSymptoms() : "---");
            parameters.put("preliminaryDiagnosis", record.getPreliminaryDiagnosis() != null ? record.getPreliminaryDiagnosis() : "---");
            parameters.put("finalDiagnosis", record.getFinalDiagnosis() != null ? record.getFinalDiagnosis() : "---");
            parameters.put("icd10Code", record.getIcd10Code() != null ? record.getIcd10Code() : "---");
            parameters.put("doctorNotes", record.getNotes() != null ? record.getNotes() : "Uống nhiều nước, nghỉ ngơi hợp lý và tái khám khi có bất thường.");

            // Tái khám
            parameters.put("revisitDate", record.getRevisitDate() != null ? record.getRevisitDate().format(DATE_FORMATTER) : "");
            parameters.put("revisitNotes", record.getRevisitNotes() != null ? record.getRevisitNotes() : "");

            // 2. Chuẩn bị Danh sách Thuốc (Detail Records)
            List<PrescriptionItemReportDto> itemDtos = new ArrayList<>();
            boolean hasPrescription = false;

            if (record.getPrescription() != null && record.getPrescription().getItems() != null && !record.getPrescription().getItems().isEmpty()) {
                hasPrescription = true;
                parameters.put("prescriptionAdvice", record.getPrescription().getDoctorAdvice() != null
                        ? record.getPrescription().getDoctorAdvice() : "Uống thuốc sau bữa ăn, tuân thủ đúng liều lượng.");

                int stt = 1;
                for (PrescriptionItem item : record.getPrescription().getItems()) {
                    Medicine med = item.getMedicine();
                    String medName = med != null ? med.getName() : "Thuốc";
                    String active = med != null ? med.getActiveIngredient() : "";
                    String unit = med != null && med.getUnit() != null ? med.getUnit() : "Đơn vị";

                    String dosageAndRoute = "";
                    if (item.getDosage() != null && !item.getDosage().isBlank()) {
                        dosageAndRoute += item.getDosage();
                    }
                    if (item.getRoute() != null && !item.getRoute().isBlank()) {
                        dosageAndRoute += (dosageAndRoute.isEmpty() ? "" : " - ") + item.getRoute();
                    }

                    itemDtos.add(PrescriptionItemReportDto.builder()
                            .stt(stt++)
                            .medicineName(medName)
                            .activeIngredient(active)
                            .quantity(item.getQuantity())
                            .unit(unit)
                            .instructions(item.getInstructions() != null ? item.getInstructions() : "Theo chỉ dẫn bác sĩ")
                            .dosageAndRoute(dosageAndRoute)
                            .build());
                }
            } else {
                parameters.put("prescriptionAdvice", "");
            }
            parameters.put("hasPrescription", hasPrescription);

            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(itemDtos);

            // 3. Đổ dữ liệu vào Report và Kết xuất PDF
            JasperPrint jasperPrint = JasperFillManager.fillReport(report, parameters, dataSource);
            byte[] pdfBytes = JasperExportManager.exportReportToPdf(jasperPrint);

            log.info("-> Kết xuất thành công PDF phiếu khám & đơn thuốc ID: {}, kích thước: {} bytes", medicalRecordId, pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("Lỗi khi kết xuất PDF bằng JasperReports cho hồ sơ ID {}: {}", medicalRecordId, e.getMessage(), e);
            throw new BadRequestException("Lỗi sinh tài liệu PDF: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }
}
