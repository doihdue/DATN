package com.demo.be.exception;

import com.demo.be.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse<Object>> handleAppException(AppException ex) {
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Tên đăng nhập hoặc mật khẩu không chính xác"));
    }

    @ExceptionHandler({LockedException.class, DisabledException.class})
    public ResponseEntity<ApiResponse<Object>> handleLockedAccount(Exception ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động. Vui lòng liên hệ quản trị viên"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Bạn không có quyền truy cập tài nguyên này"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        String detailedMessage = errors.values().stream()
                .filter(msg -> msg != null && !msg.isBlank())
                .reduce((m1, m2) -> m1 + "; " + m2)
                .orElse("Dữ liệu đầu vào không hợp lệ");

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.<Map<String, String>>builder()
                        .success(false)
                        .message(detailedMessage)
                        .data(errors)
                        .build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGlobalException(Exception ex) {
        // Lỗi ngoài dự kiến: ghi chi tiết vào log cho lập trình viên, người dùng chỉ nhận thông báo dễ hiểu
        log.error("Lỗi hệ thống chưa được xử lý", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Hệ thống gặp lỗi khi xử lý yêu cầu. Vui lòng thử lại; nếu vẫn lỗi, hãy báo quản trị viên."));
    }
}
