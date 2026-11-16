package com.demo.be.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class JwtService {

    // Phân biệt access token và refresh token: refresh token không được dùng để gọi API
    static final String TOKEN_TYPE_CLAIM = "type";
    static final String ACCESS_TOKEN = "access";
    static final String REFRESH_TOKEN = "refresh";

    @Value("${application.security.jwt.secret-key:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secretKey;

    @Value("${application.security.jwt.expiration:86400000}")
    private long jwtExpiration;

    @Value("${application.security.jwt.refresh-token.expiration:604800000}")
    private long refreshExpiration;

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public String generateToken(UserDetails userDetails) {
        Map<String, Object> extraClaims = new HashMap<>();
        if (userDetails instanceof UserPrincipal principal) {
            extraClaims.put("userId", principal.getId());
            extraClaims.put("email", principal.getEmail());
            extraClaims.put("fullName", principal.getFullName());
            List<String> roles = principal.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .collect(Collectors.toList());
            extraClaims.put("roles", roles);
        }
        extraClaims.put(TOKEN_TYPE_CLAIM, ACCESS_TOKEN);
        return buildToken(extraClaims, userDetails.getUsername(), jwtExpiration);
    }

    public String generateRefreshToken(UserDetails userDetails) {
        Map<String, Object> claims = new HashMap<>();
        claims.put(TOKEN_TYPE_CLAIM, REFRESH_TOKEN);
        return buildToken(claims, userDetails.getUsername(), refreshExpiration);
    }

    private String buildToken(Map<String, Object> extraClaims, String subject, long expiration) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .id(UUID.randomUUID().toString()) // mỗi token khác nhau dù cấp trong cùng một giây
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey())
                .compact();
    }

    // Dùng cho bộ lọc xác thực: chỉ nhận access token của tài khoản đang hoạt động,
    // cấp sau lần đổi mật khẩu gần nhất
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            Claims claims = extractAllClaims(token);
            return ACCESS_TOKEN.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
                    && claims.getSubject().equals(userDetails.getUsername())
                    && claims.getExpiration().after(new Date())
                    && userDetails.isEnabled()
                    && userDetails.isAccountNonLocked()
                    && !issuedBeforePasswordChange(claims, userDetails);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // Dùng cho endpoint làm mới token: chữ ký hợp lệ, còn hạn và đúng loại refresh
    public boolean isRefreshToken(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return REFRESH_TOKEN.equals(claims.get(TOKEN_TYPE_CLAIM, String.class))
                    && claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // iat của JWT chỉ chính xác tới giây nên so sánh sau khi làm tròn thời điểm đổi mật khẩu xuống giây
    private boolean issuedBeforePasswordChange(Claims claims, UserDetails userDetails) {
        if (!(userDetails instanceof UserPrincipal principal) || principal.getPasswordChangedAt() == null) {
            return false;
        }
        Instant changedAt = principal.getPasswordChangedAt().atZone(ZoneId.systemDefault()).toInstant()
                .truncatedTo(ChronoUnit.SECONDS);
        return claims.getIssuedAt().toInstant().isBefore(changedAt);
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public long getExpirationTime() {
        return jwtExpiration;
    }

    public long getRefreshExpirationTime() {
        return refreshExpiration;
    }
}
