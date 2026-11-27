package monolithe.auth_service.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.util.regex.Pattern;
import org.springframework.http.ResponseCookie;

/** Cookie de identificación del navegador emitida por el servidor al completar MFA. */
public final class LoginDeviceCookie {
    private static final String NAME = "__Host-monolithe-device";
    private static final Pattern TOKEN = Pattern.compile("[A-Za-z0-9_-]{43}");
    private static final Duration LIFETIME = Duration.ofDays(180);

    private LoginDeviceCookie() {}

    /** Lee un único valor válido. Cookies ausentes o ambiguas requieren MFA. */
    public static String read(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        String token = null;
        for (Cookie cookie : cookies) {
            if (!NAME.equals(cookie.getName())) continue;
            if (token != null || !TOKEN.matcher(cookie.getValue()).matches()) return null;
            token = cookie.getValue();
        }
        return token;
    }

    /** Permite el flujo entre frontend y API HTTPS con cookies particionadas. */
    public static ResponseCookie write(String token) {
        return ResponseCookie.from(NAME, token)
                .path("/").httpOnly(true).secure(true)
                .sameSite("None").partitioned(true).maxAge(LIFETIME)
                .build();
    }
}
