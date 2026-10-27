package com.demo.be.service;

import com.demo.be.dto.request.SendLabOrdersRequest;
import com.demo.be.dto.request.UpdateLabOrderResultRequest;
import com.demo.be.dto.response.LabOrderResponse;
import com.demo.be.dto.response.MedicalRecordResponse;

import java.util.List;

public interface LabOrderService {

    // Pha 1: Bác sĩ gửi chỉ định cận lâm sàng
    MedicalRecordResponse sendLabOrders(SendLabOrdersRequest request);

    // Lấy danh sách chỉ định theo mã bệnh án
    List<LabOrderResponse> getOrdersByMedicalRecordId(Long recordId);

    // Lấy danh sách chỉ định theo mã phiếu khám
    List<LabOrderResponse> getOrdersByTicketId(Long ticketId);

    // Dành cho phòng Lab / Kỹ thuật viên
    List<LabOrderResponse> getOrdersByStatus(String status);

    List<LabOrderResponse> getAllOrders();

    LabOrderResponse updateOrderResult(Long orderId, UpdateLabOrderResultRequest request);

    void cancelOrder(Long orderId);
}
