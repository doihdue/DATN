package com.demo.be.controller;

import com.demo.be.dto.request.CheckInRequest;
import com.demo.be.dto.response.*;
import com.demo.be.service.QueueService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/queue")
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    // 1. Check-in tiếp đón & sinh số thứ tự
    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> checkIn(@Valid @RequestBody CheckInRequest request) {
        QueueTicketResponse ticket = queueService.checkIn(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(ticket, "Đã cấp số thứ tự khám bệnh thành công: " + ticket.getTicketNumber()));
    }

    // 2. Màn hình TV sảnh chờ phòng khám (Public)
    @GetMapping("/display-board")
    public ResponseEntity<ApiResponse<List<ClinicDisplayBoardResponse>>> getDisplayBoard() {
        List<ClinicDisplayBoardResponse> board = queueService.getClinicDisplayBoard();
        return ResponseEntity.ok(ApiResponse.success(board, "Lấy dữ liệu bảng hiển thị TV thành công"));
    }

    // 3. Bệnh nhân tra cứu vị trí số phiếu & thời gian chờ (Public)
    @GetMapping("/my-ticket/{ticketNumber}")
    public ResponseEntity<ApiResponse<MyTicketStatusResponse>> getMyTicketStatus(@PathVariable String ticketNumber) {
        MyTicketStatusResponse status = queueService.getMyTicketStatus(ticketNumber);
        return ResponseEntity.ok(ApiResponse.success(status, "Tra cứu phiếu khám thành công"));
    }

    // 4. Lấy chi tiết hàng đợi của phòng khám (Dành cho Lễ tân và Bác sĩ)
    @GetMapping("/room/{roomId}")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<RoomQueueOverviewResponse>> getRoomQueueOverview(@PathVariable Long roomId) {
        RoomQueueOverviewResponse overview = queueService.getRoomQueueOverview(roomId);
        return ResponseEntity.ok(ApiResponse.success(overview, "Lấy thông tin hàng đợi phòng khám thành công"));
    }

    // 5. Gọi số tiếp theo
    @PostMapping("/room/{roomId}/call-next")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> callNext(@PathVariable Long roomId) {
        QueueTicketResponse calledTicket = queueService.callNext(roomId);
        return ResponseEntity.ok(ApiResponse.success(calledTicket, "Đã gọi lượt khám: " + calledTicket.getTicketNumber()));
    }

    // 6. Bắt đầu vào khám
    @PostMapping("/ticket/{ticketId}/start")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> startExamination(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.startExamination(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã bắt đầu lượt khám: " + ticket.getTicketNumber()));
    }

    // 7. Hoàn thành khám
    @PostMapping("/ticket/{ticketId}/complete")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> completeExamination(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.completeExamination(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã hoàn thành lượt khám: " + ticket.getTicketNumber()));
    }

    // 8. Bỏ qua lượt (vắng mặt)
    @PostMapping("/ticket/{ticketId}/skip")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> skipTicket(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.skipTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã chuyển sang danh sách nhỡ lượt: " + ticket.getTicketNumber()));
    }

    // 9. Gọi lại lượt đã nhỡ
    @PostMapping("/ticket/{ticketId}/recall")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> recallTicket(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.recallTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã gọi lại số: " + ticket.getTicketNumber()));
    }

    // 10. Ưu tiên cấp cứu
    @PostMapping("/ticket/{ticketId}/emergency")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> setEmergency(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.setEmergency(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã kích hoạt ưu tiên khẩn cấp cho vé: " + ticket.getTicketNumber()));
    }
}
