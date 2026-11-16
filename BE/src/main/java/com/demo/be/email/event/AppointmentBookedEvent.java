package com.demo.be.email.event;

import com.demo.be.model.Appointment;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class AppointmentBookedEvent {
    private final Appointment appointment;
}

