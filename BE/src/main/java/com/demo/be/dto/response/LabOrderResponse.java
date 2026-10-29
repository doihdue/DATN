package com.demo.be.dto.response;

import com.demo.be.model.LabOrder;
import com.demo.be.model.QueueTicket;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrderResponse {

    private Long id;
    private Long medicalRecordId;
    private Long labServiceId;
    private String serviceCode;
    private String serviceName;
    private Double price;
    private String referenceRange;
    private Double lowerLimit;
    private Double upperLimit;
    private String unit;
    private String category;

    private LocalDateTime orderTime;
    private String resultValue;
    private Boolean isAbnormal;
    private String conclusion;
    private String status; // PENDING, PROCESSING, COMPLETED, CANCELLED
    private LocalDateTime performedTime;
    private String notes;

    private Long performerId;
    private String performerName;

    // Thông tin ca khám / bệnh nhân đi kèm
    private Long queueTicketId;
    private String ticketNumber;
    private String roomNumber; // Phòng khám ra chỉ định
    private Long patientId;
    private String patientName;
    private String patientGender;
    private Integer patientYearOfBirth;

    public static LabOrderResponse fromEntity(LabOrder entity) {
        if (entity == null) return null;

        LabOrderResponseBuilder builder = LabOrderResponse.builder()
                .id(entity.getId())
                .price(entity.getPrice())
                .orderTime(entity.getOrderTime())
                .resultValue(entity.getResultValue())
                .isAbnormal(entity.getIsAbnormal() != null ? entity.getIsAbnormal() : false)
                .conclusion(entity.getConclusion())
                .status(entity.getStatus())
                .performedTime(entity.getPerformedTime())
                .notes(entity.getNotes());

        if (entity.getMedicalRecord() != null) {
            builder.medicalRecordId(entity.getMedicalRecord().getId());
            if (entity.getMedicalRecord().getQueueTicket() != null) {
                builder.queueTicketId(entity.getMedicalRecord().getQueueTicket().getId());
                builder.ticketNumber(entity.getMedicalRecord().getQueueTicket().getTicketNumber());
                if (entity.getMedicalRecord().getQueueTicket().getExaminationRoom() != null) {
                    builder.roomNumber(entity.getMedicalRecord().getQueueTicket().getExaminationRoom().getRoomNumber());
                }
            }
            QueueTicket ticket = entity.getMedicalRecord().getQueueTicket();
            if (entity.getMedicalRecord().getPatient() == null && ticket != null) {
                // Khách vãng lai: chưa có hồ sơ bệnh nhân, thông tin chỉ nằm trên vé
                builder.patientName(ticket.getPatientName());
                builder.patientGender(ticket.getPatientGender());
                if (ticket.getPatientDob() != null) {
                    builder.patientYearOfBirth(ticket.getPatientDob().getYear());
                }
            }
            if (entity.getMedicalRecord().getPatient() != null) {
                builder.patientId(entity.getMedicalRecord().getPatient().getId());
                builder.patientName(entity.getMedicalRecord().getPatient().getFullName());
                builder.patientGender(entity.getMedicalRecord().getPatient().getGender());
                if (entity.getMedicalRecord().getPatient().getDateOfBirth() != null) {
                    builder.patientYearOfBirth(entity.getMedicalRecord().getPatient().getDateOfBirth().getYear());
                }
            }
        }

        if (entity.getLabService() != null) {
            builder.labServiceId(entity.getLabService().getId());
            builder.serviceCode(entity.getLabService().getServiceCode());
            builder.serviceName(entity.getLabService().getServiceName());
            builder.referenceRange(entity.getLabService().getReferenceRange());
            builder.lowerLimit(entity.getLabService().getLowerLimit());
            builder.upperLimit(entity.getLabService().getUpperLimit());
            builder.unit(entity.getLabService().getUnit());
            builder.category(entity.getLabService().getCategory());
            if (builder.price == null) {
                builder.price(entity.getLabService().getPrice());
            }
        }

        if (entity.getPerformer() != null) {
            builder.performerId(entity.getPerformer().getId());
            builder.performerName(entity.getPerformer().getFullName());
        }

        return builder.build();
    }
}
