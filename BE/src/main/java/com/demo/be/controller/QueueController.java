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
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> callNext(@PathVariable Long roomId) {
        QueueTicketResponse calledTicket = queueService.callNext(roomId);
        return ResponseEntity.ok(ApiResponse.success(calledTicket, "Đã gọi lượt khám: " + calledTicket.getTicketNumber()));
    }

    // 5.5. Lấy thông tin chi tiết vé khám theo ID
    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> getTicketById(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.getTicketById(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Lấy thông tin vé khám thành công"));
    }

    // 6. Bắt đầu vào khám
    @PostMapping("/ticket/{ticketId}/start")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> startExamination(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.startExamination(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã bắt đầu lượt khám: " + ticket.getTicketNumber()));
    }

    // 7. Hoàn thành khám
    @PostMapping("/ticket/{ticketId}/complete")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> completeExamination(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.completeExamination(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã hoàn thành lượt khám: " + ticket.getTicketNumber()));
    }

    // 8. Bỏ qua lượt (vắng mặt)
    @PostMapping("/ticket/{ticketId}/skip")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> skipTicket(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.skipTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã chuyển sang danh sách nhỡ lượt: " + ticket.getTicketNumber()));
    }

    // 9. Gọi lại lượt đã nhỡ
    @PostMapping("/ticket/{ticketId}/recall")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> recallTicket(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.recallTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã gọi lại số: " + ticket.getTicketNumber()));
    }

    // 10. Ưu tiên cấp cứu
    @PostMapping("/ticket/{ticketId}/emergency")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> setEmergency(@PathVariable Long ticketId) {
        QueueTicketResponse ticket = queueService.setEmergency(ticketId);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã kích hoạt ưu tiên khẩn cấp cho vé: " + ticket.getTicketNumber()));
    }

    // 11. Chuyển phòng khám (Điều phối tải hàng đợi)
    @PostMapping("/ticket/{ticketId}/transfer")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> transferTicket(
            @PathVariable Long ticketId,
            @RequestParam Long targetRoomId,
            @RequestParam(required = false) String reason) {
        QueueTicketResponse ticket = queueService.transferTicket(ticketId, targetRoomId, reason);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Chuyển phòng khám thành công sang phòng " + ticket.getRoomNumber()));
    }

    // 12. Hủy lượt khám (Bệnh nhân về hoặc xin hủy)
    @PostMapping("/ticket/{ticketId}/cancel")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN')")
    public ResponseEntity<ApiResponse<QueueTicketResponse>> cancelTicket(
            @PathVariable Long ticketId,
            @RequestParam(required = false) String reason) {
        QueueTicketResponse ticket = queueService.cancelTicket(ticketId, reason);
        return ResponseEntity.ok(ApiResponse.success(ticket, "Đã hủy lượt khám: " + ticket.getTicketNumber()));
    }

    // 13. Lịch sử các số đã cấp trong ngày (cho quầy tiếp đón)
    @GetMapping("/recent-today")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<QueueTicketResponse>>> getRecentTicketsToday() {
        List<QueueTicketResponse> tickets = queueService.getRecentTicketsToday();
        return ResponseEntity.ok(ApiResponse.success(tickets, "Lấy danh sách vé đã cấp gần nhất thành công"));
    }

    // 14. Tìm kiếm hồ sơ bệnh nhân cũ (gợi ý/auto-complete khi tiếp đón)
    @GetMapping("/patient-lookup")
    @PreAuthorize("hasAnyRole('STAFF', 'ADMIN', 'DOCTOR')")
    public ResponseEntity<ApiResponse<List<PatientLookupResponse>>> searchPatients(@RequestParam String keyword) {
        List<PatientLookupResponse> patients = queueService.searchPatients(keyword);
        return ResponseEntity.ok(ApiResponse.success(patients, "Tìm kiếm bệnh nhân thành công"));
    }
}

