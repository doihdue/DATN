package com.demo.be.email.event;

import com.demo.be.model.MedicalRecord;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public class MedicalRecordCompletedEvent {
    private final MedicalRecord medicalRecord;
    private final byte[] pdfBytes;
}

