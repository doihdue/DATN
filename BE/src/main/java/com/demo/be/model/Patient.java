package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "patients")
@PrimaryKeyJoinColumn(name = "id")
public class Patient extends Person {

    @Column(name = "blood_group", length = 10)
    private String bloodGroup;

    @Column(name = "medical_history_summary", columnDefinition = "NVARCHAR(MAX)")
    private String medicalHistorySummary;

    @Column(name = "emergency_contact_name", length = 255)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    @Builder.Default
    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL)
    private List<AIChatSession> chatSessions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "patient")
    private List<Appointment> appointments = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "patient")
    private List<QueueTicket> queueTickets = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "patient")
    private List<MedicalRecord> medicalRecords = new ArrayList<>();
}
