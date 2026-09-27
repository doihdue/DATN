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

    @OneToOne(mappedBy = "queueTicket", fetch = FetchType.LAZY)
    private Appointment appointment;
}
