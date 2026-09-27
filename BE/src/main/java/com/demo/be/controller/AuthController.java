package com.demo.be.controller;

import com.demo.be.dto.request.CreateUserRequest;
import com.demo.be.dto.request.LoginRequest;
import com.demo.be.dto.request.RefreshTokenRequest;
import com.demo.be.dto.request.RegisterRequest;
import com.demo.be.dto.response.ApiResponse;
import com.demo.be.dto.response.AuthResponse;
import com.demo.be.dto.response.UserSummaryResponse;
import com.demo.be.security.UserPrincipal;
import com.demo.be.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Đăng ký tài khoản bệnh nhân thành công"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Đăng nhập thành công"));
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<ApiResponse<AuthResponse>> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Cấp mới token thành công"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal UserPrincipal currentUser) {
        authService.logout(currentUser);
        return ResponseEntity.ok(ApiResponse.success(null, "Đăng xuất thành công"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> getCurrentUser(@AuthenticationPrincipal UserPrincipal currentUser) {
        UserSummaryResponse response = authService.getCurrentUser(currentUser);
        return ResponseEntity.ok(ApiResponse.success(response, "Lấy thông tin tài khoản hiện tại thành công"));
    }

    @PostMapping("/admin/create-user")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> createUser(@Valid @RequestBody CreateUserRequest request) {
        UserSummaryResponse response = authService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Admin tạo tài khoản thành công"));
    }
}
