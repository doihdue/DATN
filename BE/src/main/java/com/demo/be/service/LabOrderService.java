package com.demo.be.service;

import com.demo.be.dto.request.SendLabOrdersRequest;
import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.dto.response.MedicalRecordResponse;

import java.time.LocalDate;
import java.util.List;

public interface LabOrderService {

    // Pha 1: Bác sĩ gửi chỉ định cận lâm sàng
    MedicalRecordResponse sendLabOrders(SendLabOrdersRequest request);

    // Lấy danh sách chỉ định theo mã bệnh án
    List<LabOrderResponse> getOrdersByMedicalRecordId(Long recordId);

    // Lấy danh sách chỉ định theo mã phiếu khám
    List<LabOrderResponse> getOrdersByTicketId(Long ticketId);

    // Dành cho phòng Lab / Kỹ thuật viên: chỉ định trong ngày + chỉ định còn dang dở
    List<LabOrderResponse> getWorklist(LocalDate date);

    // KTV tiếp nhận mẫu: PENDING -> PROCESSING
    LabOrderResponse startProcessing(Long orderId);

    // KTV nhập kết quả & ký duyệt: -> COMPLETED
    LabOrderResponse updateOrderResult(Long orderId, UpdateLabOrderResultRequest request);

    void cancelOrder(Long orderId);
}
