package com.demo.be.email.event;

import com.demo.be.model.Appointment;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class AppointmentCancelledEvent {
    private final Appointment appointment;
    private final String reason;
}

