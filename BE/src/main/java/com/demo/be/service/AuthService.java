package com.demo.be.service;

import com.demo.be.dto.request.CreateUserRequest;
import com.demo.be.dto.request.LoginRequest;
import com.demo.be.dto.request.RefreshTokenRequest;
import com.demo.be.dto.request.RegisterRequest;
import com.demo.be.dto.response.AuthResponse;
import com.demo.be.dto.response.UserSummaryResponse;
import com.demo.be.security.UserPrincipal;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(UserPrincipal currentUser);

    UserSummaryResponse getCurrentUser(UserPrincipal currentUser);

    UserSummaryResponse createUser(CreateUserRequest request);
}
