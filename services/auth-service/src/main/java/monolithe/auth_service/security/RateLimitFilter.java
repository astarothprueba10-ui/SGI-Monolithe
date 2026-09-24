package monolithe.auth_service.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

        private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
        private final Map<String, Bucket> forgotPasswordBuckets = new ConcurrentHashMap<>();
        private final Map<String, Bucket> changePasswordBuckets = new ConcurrentHashMap<>();

        @Override
        protected void doFilterInternal(
                        HttpServletRequest request,
                        HttpServletResponse response,
                        FilterChain filterChain) throws ServletException, IOException {

                String ruta = request.getRequestURI();
                String metodo = request.getMethod();

                if (!"POST".equalsIgnoreCase(metodo)) {
                        filterChain.doFilter(request, response);
                        return;
                }

                String ip = request.getRemoteAddr();

                if ("/api/auth/login".equals(ruta)) {

                        Bucket bucket = loginBuckets.computeIfAbsent(
                                        ip,
                                        key -> crearBucketLogin());

                        if (!bucket.tryConsume(1)) {
                                responderTooManyRequests(
                                                response,
                                                ruta,
                                                "Demasiados intentos de inicio de sesión. Intente nuevamente en unos minutos.");
                                return;
                        }
                }

                if ("/api/auth/forgot-password".equals(ruta)) {

                        Bucket bucket = forgotPasswordBuckets.computeIfAbsent(
                                        ip,
                                        key -> crearBucketForgotPassword());

                        if (!bucket.tryConsume(1)) {
                                responderTooManyRequests(
                                                response,
                                                ruta,
                                                "Demasiadas solicitudes de recuperación de contraseña. Intente nuevamente más tarde.");
                                return;
                        }
                }

                if ("/api/auth/change-password".equals(ruta)) {

                        Bucket bucket = changePasswordBuckets.computeIfAbsent(
                                        ip,
                                        key -> crearBucketChangePassword());

                        if (!bucket.tryConsume(1)) {
                                responderTooManyRequests(
                                                response,
                                                ruta,
                                                "Demasiados intentos de cambio de contraseña. Intente nuevamente más tarde.");
                                return;
                        }
                }

                filterChain.doFilter(request, response);
        }

        private Bucket crearBucketLogin() {

                Bandwidth limite = Bandwidth.builder()
                                .capacity(10)
                                .refillIntervally(
                                                10,
                                                Duration.ofMinutes(1))
                                .build();

                return Bucket.builder()
                                .addLimit(limite)
                                .build();
        }

        private Bucket crearBucketForgotPassword() {

                Bandwidth limite = Bandwidth.builder()
                                .capacity(5)
                                .refillIntervally(
                                                5,
                                                Duration.ofMinutes(15))
                                .build();

                return Bucket.builder()
                                .addLimit(limite)
                                .build();
        }

        private Bucket crearBucketChangePassword() {

                Bandwidth limite = Bandwidth.builder()
                                .capacity(5)
                                .refillIntervally(
                                                5,
                                                Duration.ofMinutes(15))
                                .build();

                return Bucket.builder()
                                .addLimit(limite)
                                .build();
        }

        private void responderTooManyRequests(
                        HttpServletResponse response,
                        String ruta,
                        String mensaje) throws IOException {

                response.setStatus(429);
                response.setContentType("application/json");
                response.setCharacterEncoding("UTF-8");

                String json = """
                                {
                                  "timestamp": "%s",
                                  "status": 429,
                                  "error": "Too Many Requests",
                                  "message": "%s",
                                  "path": "%s"
                                }
                                """.formatted(
                                Instant.now(),
                                mensaje,
                                ruta);

                response.getWriter().write(json);
        }
}