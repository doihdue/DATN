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
@Table(name = "doctors")
@PrimaryKeyJoinColumn(name = "id")
public class Doctor extends Employee {

    @Column(name = "academic_title", length = 100)
    private String academicTitle;

    @Column(name = "years_of_experience")
    private Integer yearsOfExperience;

    @Column(name = "biography", columnDefinition = "NVARCHAR(MAX)")
    private String biography;

    @Column(name = "average_consultation_time")
    private Integer averageConsultationTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "specialty_id")
    private Specialty specialty;

    @Builder.Default
    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL)
    private List<WorkSchedule> workSchedules = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "doctor")
    private List<Appointment> appointments = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "doctor")
    private List<QueueTicket> queueTickets = new ArrayList<>();
}
