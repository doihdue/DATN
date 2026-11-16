package com.demo.be.security;

import com.demo.be.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // Khoá thử nghiệm 384 bit (base64), không phải khoá thật của hệ thống
        ReflectionTestUtils.setField(jwtService, "secretKey",
                "dGVzdC1rZXktZm9yLWp3dC1zZXJ2aWNlLXVuaXQtdGVzdHMtb25seS0zODQtYml0cw==");
        ReflectionTestUtils.setField(jwtService, "jwtExpiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 7_200_000L);
    }

    private UserPrincipal principal(String status, LocalDateTime passwordChangedAt) {
        User user = User.builder().id(1L).username("staff_mai").passwordHash("x").status(status)
                .passwordChangedAt(passwordChangedAt).userRoles(List.of()).build();
        return UserPrincipal.create(user);
    }

    @Test
    void accessToken_ofActiveUser_isValid() {
        UserPrincipal user = principal("ACTIVE", null);
        assertThat(jwtService.isTokenValid(jwtService.generateToken(user), user)).isTrue();
    }

    @Test
    void refreshToken_cannotBeUsedAsAccessToken() {
        UserPrincipal user = principal("ACTIVE", null);
        String refresh = jwtService.generateRefreshToken(user);

        assertThat(jwtService.isTokenValid(refresh, user)).isFalse();
        assertThat(jwtService.isRefreshToken(refresh)).isTrue();
        assertThat(jwtService.isRefreshToken(jwtService.generateToken(user))).isFalse();
    }

    @Test
    void lockedAccount_isRejectedEvenWithUnexpiredToken() {
        String token = jwtService.generateToken(principal("ACTIVE", null));
        assertThat(jwtService.isTokenValid(token, principal("LOCKED", null))).isFalse();
    }

    @Test
    void tokenIssuedBeforePasswordChange_isRejected_butNewTokenIsValid() throws InterruptedException {
        String oldToken = jwtService.generateToken(principal("ACTIVE", null));
        Thread.sleep(1100); // iat chỉ chính xác tới giây
        UserPrincipal afterChange = principal("ACTIVE", LocalDateTime.now());

        assertThat(jwtService.isTokenValid(oldToken, afterChange)).isFalse();
        assertThat(jwtService.isTokenValid(jwtService.generateToken(afterChange), afterChange)).isTrue();
    }

    @Test
    void twoTokensIssuedInSameSecond_areDifferent() {
        UserPrincipal user = principal("ACTIVE", null);
        assertThat(jwtService.generateRefreshToken(user)).isNotEqualTo(jwtService.generateRefreshToken(user));
    }
}
