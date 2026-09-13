package monolithe.auth_service.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.dto.RefreshTokenRequest;
import monolithe.auth_service.dto.RefreshTokenResponse;
import monolithe.auth_service.service.AuthenticationService;
import monolithe.auth_service.dto.ChangePasswordRequest;
import monolithe.auth_service.dto.ForgotPasswordRequest;
import monolithe.auth_service.dto.MessageResponse;
import monolithe.auth_service.dto.ResetPasswordRequest;
import monolithe.auth_service.service.PasswordResetService;
import monolithe.auth_service.service.AuditService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

        private final AuthenticationService authenticationService;
        private final PasswordResetService passwordResetService;
        private final AuditService auditService;

        @PostMapping("/login")
        public ResponseEntity<LoginResponse> login(
                        @Valid @RequestBody LoginRequest solicitud,
                        HttpServletRequest request) {

                String ipOrigen = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");

                LoginResponse respuesta = authenticationService.autenticar(
                                solicitud,
                                ipOrigen,
                                userAgent);

                return ResponseEntity.ok(respuesta);
        }

        @PostMapping("/refresh")
        public ResponseEntity<RefreshTokenResponse> refresh(
                        @Valid @RequestBody RefreshTokenRequest solicitud,
                        HttpServletRequest request) {

                String ipOrigen = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");

                RefreshTokenResponse respuesta = authenticationService.renovarToken(
                                solicitud,
                                ipOrigen,
                                userAgent);

                return ResponseEntity.ok(respuesta);
        }

        @PostMapping("/logout")
        public ResponseEntity<Void> logout(
                        @Valid @RequestBody RefreshTokenRequest solicitud,
                        HttpServletRequest request) {

                Long idUsuario = authenticationService.cerrarSesion(
                                solicitud);

                if (idUsuario != null) {

                        auditService.registrar(
                                        idUsuario,
                                        "LOGOUT",
                                        "EXITOSO",
                                        "El usuario cerró su sesión",
                                        request.getRemoteAddr(),
                                        request.getHeader("User-Agent"),
                                        "POST",
                                        "/api/auth/logout");
                }

                return ResponseEntity.noContent().build();
        }

        @PostMapping("/change-password")
        public ResponseEntity<Void> changePassword(
                        @Valid @RequestBody ChangePasswordRequest solicitud,
                        @AuthenticationPrincipal Jwt jwt,
                        HttpServletRequest request) {

                Long idUsuario = Long.valueOf(jwt.getSubject());

                authenticationService.cambiarContrasena(
                                idUsuario,
                                solicitud);

                auditService.registrar(
                                idUsuario,
                                "CAMBIO_PASSWORD",
                                "EXITOSO",
                                "El usuario cambió su contraseña",
                                request.getRemoteAddr(),
                                request.getHeader("User-Agent"),
                                "POST",
                                "/api/auth/change-password");

                return ResponseEntity.noContent().build();
        }

        @PostMapping("/logout-all")
        public ResponseEntity<Void> logoutAll(
                        @AuthenticationPrincipal Jwt jwt,
                        HttpServletRequest request) {

                Long idUsuario = Long.valueOf(jwt.getSubject());

                authenticationService.cerrarTodasLasSesiones(
                                idUsuario);

                auditService.registrar(
                                idUsuario,
                                "LOGOUT_TODAS_SESIONES",
                                "EXITOSO",
                                "El usuario cerró todas sus sesiones activas",
                                request.getRemoteAddr(),
                                request.getHeader("User-Agent"),
                                "POST",
                                "/api/auth/logout-all");

                return ResponseEntity.noContent().build();
        }

        @PostMapping("/forgot-password")
        public ResponseEntity<MessageResponse> forgotPassword(
                        @Valid @RequestBody ForgotPasswordRequest solicitud,
                        HttpServletRequest request) {

                String ipSolicitud = request.getRemoteAddr();

                String userAgent = request.getHeader("User-Agent");

                passwordResetService.solicitarRecuperacion(
                                solicitud.getUsuario(),
                                ipSolicitud,
                                userAgent);

                return ResponseEntity.ok(
                                new MessageResponse(
                                                "Si la cuenta existe, se enviarán instrucciones para recuperar la contraseña"));
        }

        @PostMapping("/reset-password")
        public ResponseEntity<Void> resetPassword(
                        @Valid @RequestBody ResetPasswordRequest solicitud,
                        HttpServletRequest request) {

                Long idUsuario = passwordResetService.restablecerContrasena(
                                solicitud.getToken(),
                                solicitud.getNuevaContrasena(),
                                solicitud.getConfirmarContrasena());

                String ipOrigen = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");

                auditService.registrar(
                                idUsuario,
                                "PASSWORD_RESTABLECIDA",
                                "EXITOSO",
                                "La contraseña fue restablecida mediante recuperación",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/reset-password");

                return ResponseEntity.noContent().build();
        }
}