package com.demo.be.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@Entity
@Table(name = "persons")
@Inheritance(strategy = InheritanceType.JOINED)
public class Person {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @org.hibernate.annotations.Nationalized
    @Column(name = "gender", length = 20)
    private String gender;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @org.hibernate.annotations.Nationalized
    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "national_id", unique = true, length = 50)
    private String nationalId;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @OneToOne(mappedBy = "person", fetch = FetchType.LAZY)
    private User user;
}
