package com.demo.be.email.listener;

import com.demo.be.email.event.AppointmentBookedEvent;
import com.demo.be.email.event.AppointmentCancelledEvent;
import com.demo.be.email.event.MedicalRecordCompletedEvent;
import com.demo.be.email.service.EmailService;
import com.demo.be.model.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailEventListener {

    private final EmailService emailService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @EventListener
    public void handleAppointmentBooked(AppointmentBookedEvent event) {
        Appointment appointment = event.getAppointment();
        if (appointment == null) return;

        Patient patient = appointment.getPatient();
        String toEmail = extractPatientEmail(patient);
        if (toEmail == null) {
            log.info("Bệnh nhân {} không có email để gửi thông báo đặt lịch LH: {}", 
                    patient != null ? patient.getFullName() : "N/A", appointment.getAppointmentCode());
            return;
        }

        Doctor doctor = appointment.getDoctor();
        WorkSchedule schedule = appointment.getWorkSchedule();
        ExaminationRoom room = schedule != null ? schedule.getExaminationRoom() : null;

        Map<String, Object> vars = new HashMap<>();
        vars.put("patientName", patient != null ? patient.getFullName() : "Quý khách");
        vars.put("appointmentCode", appointment.getAppointmentCode());
        vars.put("bookingNumber", appointment.getBookingNumber() != null ? appointment.getBookingNumber() : 1);
        vars.put("doctorName", doctor != null ? doctor.getFullName() : "Đang cập nhật");
        vars.put("specialtyName", (doctor != null && doctor.getSpecialty() != null) ? doctor.getSpecialty().getName() : "Khám đa khoa");
        vars.put("roomNumber", room != null ? room.getRoomNumber() : "Quầy lễ tân hướng dẫn");
        vars.put("appointmentDate", appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().format(DATE_FMT) : "");
        vars.put("estimatedTime", appointment.getEstimatedStartTime() != null ? appointment.getEstimatedStartTime().format(TIME_FMT) : "");
        vars.put("reasonForVisit", appointment.getReasonForVisit());

        String subject = "[SmartClinic] Xác nhận đặt lịch khám thành công - Mã số: " + appointment.getAppointmentCode();
        emailService.sendHtmlMail(toEmail, subject, "appointment-confirmation", vars);
    }

    @EventListener
    public void handleAppointmentCancelled(AppointmentCancelledEvent event) {
        Appointment appointment = event.getAppointment();
        if (appointment == null) return;

        Patient patient = appointment.getPatient();
        String toEmail = extractPatientEmail(patient);
        if (toEmail == null) return;

        Doctor doctor = appointment.getDoctor();

        Map<String, Object> vars = new HashMap<>();
        vars.put("patientName", patient != null ? patient.getFullName() : "Quý khách");
        vars.put("appointmentCode", appointment.getAppointmentCode());
        vars.put("doctorName", doctor != null ? doctor.getFullName() : "Bác sĩ phụ trách");
        vars.put("appointmentDate", appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().format(DATE_FMT) : "");
        vars.put("estimatedTime", appointment.getEstimatedStartTime() != null ? appointment.getEstimatedStartTime().format(TIME_FMT) : "");
        vars.put("cancellationReason", event.getReason() != null ? event.getReason() : appointment.getCancellationReason());

        String subject = "[SmartClinic] Thông báo hủy lịch hẹn khám - Mã số: " + appointment.getAppointmentCode();
        emailService.sendHtmlMail(toEmail, subject, "appointment-cancelled", vars);
    }

    @EventListener
    public void handleMedicalRecordCompleted(MedicalRecordCompletedEvent event) {
        MedicalRecord record = event.getMedicalRecord();
        if (record == null) return;

        Patient patient = record.getPatient();
        String toEmail = extractPatientEmail(patient);
        if (toEmail == null) {
            log.info("Bệnh nhân {} không có email để nhận kết quả khám bệnh án ID: {}", 
                    patient != null ? patient.getFullName() : "N/A", record.getId());
            return;
        }

        Doctor doctor = record.getDoctor();
        Prescription prescription = record.getPrescription();

        Map<String, Object> vars = new HashMap<>();
        vars.put("patientName", patient != null ? patient.getFullName() : "Quý khách");
        vars.put("doctorName", doctor != null ? doctor.getFullName() : "Bác sĩ phụ trách");
        vars.put("symptoms", record.getSymptoms());
        vars.put("finalDiagnosis", record.getFinalDiagnosis() != null ? record.getFinalDiagnosis() : record.getPreliminaryDiagnosis());
        vars.put("icd10Code", record.getIcd10Code());
        vars.put("bloodPressure", record.getBloodPressure());
        vars.put("notes", record.getNotes());
        vars.put("revisitDate", record.getRevisitDate() != null ? record.getRevisitDate().format(DATE_FMT) : null);
        vars.put("revisitNotes", record.getRevisitNotes());

        // Chuẩn bị danh sách thuốc cho template
        List<Map<String, Object>> itemsList = new ArrayList<>();
        if (prescription != null && prescription.getItems() != null) {
            for (PrescriptionItem item : prescription.getItems()) {
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("medicineName", item.getMedicine() != null ? item.getMedicine().getName() : "Thuốc");
                itemMap.put("unit", item.getMedicine() != null ? item.getMedicine().getUnit() : "Viên");
                itemMap.put("quantity", item.getQuantity());
                itemMap.put("dosage", item.getDosage());
                itemMap.put("instructions", item.getInstructions());
                itemsList.add(itemMap);
            }
        }
        vars.put("prescriptionItems", itemsList);

        String subject = "[SmartClinic] Kết quả khám bệnh & Đơn thuốc điện tử - Bệnh nhân " + (patient != null ? patient.getFullName() : "");
        String filename = "Don-thuoc-SmartClinic-" + record.getId() + ".pdf";

        emailService.sendMailWithPdfAttachment(toEmail, subject, "medical-record-completed", vars, filename, event.getPdfBytes());
    }

    private String extractPatientEmail(Patient patient) {
        if (patient == null) return null;
        if (patient.getUser() != null && patient.getUser().getEmail() != null && !patient.getUser().getEmail().isBlank()) {
            return patient.getUser().getEmail();
        }
        return null;
    }
}

