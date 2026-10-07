package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "queue_tickets")
public class QueueTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_number", nullable = false, length = 50)
    private String ticketNumber;

    @Column(name = "ticket_date")
    private java.time.LocalDate ticketDate;

    @Column(name = "patient_name", length = 150)
    private String patientName;

    @Column(name = "patient_phone", length = 20)
    private String patientPhone;

    @Column(name = "patient_year_of_birth")
    private Integer patientYearOfBirth;

    @Column(name = "patient_dob")
    private java.time.LocalDate patientDob;

    @Column(name = "is_emergency")
    @Builder.Default
    private Boolean isEmergency = false;

    @Column(name = "has_appointment")
    @Builder.Default
    private Boolean hasAppointment = false;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "priority_score")
    @Builder.Default
    private Integer priorityScore = 0;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "check_in_time")
    private LocalTime checkInTime;

    @Column(name = "call_time")
    private LocalTime callTime;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "estimated_waiting_minutes")
    private Integer estimatedWaitingMinutes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_room_id")
    private ExaminationRoom examinationRoom;

    @OneToOne(mappedBy = "queueTicket", fetch = FetchType.LAZY)
    private Appointment appointment;

    @OneToOne(mappedBy = "queueTicket", fetch = FetchType.LAZY)
    private MedicalRecord medicalRecord;
}
