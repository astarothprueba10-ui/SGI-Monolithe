package monolithe.auth_service.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.dto.MfaChallenge;
import monolithe.auth_service.dto.MfaCodeRequest;
import monolithe.auth_service.dto.MfaEnrollment;
import monolithe.auth_service.dto.MfaInvitationRequest;
import monolithe.auth_service.dto.MfaInvitationResponse;
import monolithe.auth_service.dto.RefreshTokenRequest;
import monolithe.auth_service.dto.RefreshTokenResponse;
import monolithe.auth_service.dto.ResetPasswordOtpResponse;
import monolithe.auth_service.dto.ResetPasswordRequest;
import monolithe.auth_service.service.AuthenticationService;
import monolithe.auth_service.service.MfaInvitationService;
import monolithe.auth_service.dto.ChangePasswordRequest;
import monolithe.auth_service.dto.ForgotPasswordRequest;
import monolithe.auth_service.dto.MessageResponse;
import monolithe.auth_service.service.PasswordResetService;
import monolithe.auth_service.service.AuditService;
import monolithe.auth_service.dto.ConfirmResetPasswordRequest;
import monolithe.auth_service.dto.ResendOtpRequest;
import monolithe.auth_service.dto.ResendOtpResponse;
import monolithe.auth_service.repository.projection.ResendOtpResult;
import monolithe.auth_service.dto.ForgotPasswordResponse;
import monolithe.auth_service.repository.projection.RecoveryRequestResult;

import org.springframework.mail.MailException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import monolithe.auth_service.exception.MfaFlowException;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

        private final AuthenticationService authenticationService;
        private final MfaInvitationService mfaInvitationService;
        private final PasswordResetService passwordResetService;
        private final AuditService auditService;

        /** Valida la contraseña y devuelve un reto temporal para el segundo factor. */
        @PostMapping("/login")
        public ResponseEntity<MfaChallenge> login(
                        @Valid @RequestBody LoginRequest solicitud,
                        HttpServletRequest request) {

                String ipOrigen = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");

                MfaChallenge respuesta = authenticationService.autenticar(
                                solicitud,
                                ipOrigen,
                                userAgent);

                return ResponseEntity.accepted().cacheControl(CacheControl.noStore()).body(respuesta);
        }

        /** Reenvía la invitación únicamente tras verificar contraseña y reto vigente. */
        @PostMapping("/mfa/activacion/enviar")
        public ResponseEntity<MfaInvitationResponse> enviarInvitacionMfa(
                        @Valid @RequestBody MfaInvitationRequest solicitud) {
                try {
                        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                        .body(mfaInvitationService.enviar(solicitud.reto()));
                } catch (MailException falloCorreo) {
                        throw new MfaFlowException(HttpStatus.SERVICE_UNAVAILABLE,
                                        "No pudimos enviar el correo. Intenta de nuevo más tarde o contacta a soporte.");
                }
        }

        /** Entrega el QR tras validar un código de activación o recuperación. */
        @PostMapping("/mfa/preparar")
        public ResponseEntity<MfaEnrollment> prepareMfa(@Valid @RequestBody MfaCodeRequest solicitud) {
                return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                                .body(authenticationService.prepararMfa(solicitud));
        }

        /** Emite la sesión una vez verificado el código del autenticador. */
        @PostMapping("/mfa/verificar")
        public ResponseEntity<LoginResponse> verifyMfa(@Valid @RequestBody MfaCodeRequest solicitud,
                        HttpServletRequest request) {
                String ip = request.getRemoteAddr();
                String agent = request.getHeader("User-Agent");
                LoginResponse login = authenticationService.confirmarMfa(solicitud, ip, agent);
                auditService.registrar(login.getIdUsuario(), "LOGIN_EXITOSO", "EXITOSO",
                                "Inicio de sesión con dos factores", ip, agent, "POST", "/api/auth/mfa/verificar");
                return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(login);
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
                                solicitud,
                                request.getRemoteAddr(),
                                request.getHeader("User-Agent"));

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
        public ResponseEntity<ForgotPasswordResponse> forgotPassword(
                        @Valid @RequestBody ForgotPasswordRequest solicitud,
                        HttpServletRequest request) {

                String ipSolicitud = request.getRemoteAddr();
                String userAgent = request.getHeader("User-Agent");

                String mensajeGenerico = "Si la cuenta esta registrada, recibiras un correo con las instrucciones.";

                Optional<RecoveryRequestResult> recuperacion = Optional.empty();

                try {
                        recuperacion = passwordResetService.solicitarRecuperacion(
                                        solicitud.getUsuario(),
                                        solicitud.getOrigen(),
                                        ipSolicitud,
                                        userAgent);
                } catch (MailException e) {
                        log.error(
                                        "Fallo SMTP al enviar correo de recuperacion",
                                        e);
                }

                if (recuperacion.isPresent()) {

                        RecoveryRequestResult resultado = recuperacion.get();

                        try {
                                auditService.registrar(
                                                resultado.idUsuario(),
                                                "RECUPERACION_SOLICITADA",
                                                "EXITOSO",
                                                "Se solicito recuperacion de contrasena",
                                                ipSolicitud,
                                                userAgent,
                                                "POST",
                                                "/api/auth/forgot-password");
                        } catch (RuntimeException e) {
                                log.error(
                                                "No se pudo registrar la auditoria de recuperacion",
                                                e);
                        }

                        return ResponseEntity.ok(
                                        new ForgotPasswordResponse(
                                                        mensajeGenerico,
                                                        enmascararCorreo(resultado.correo())));
                }

                return ResponseEntity.ok(
                                new ForgotPasswordResponse(
                                                mensajeGenerico,
                                                null));
        }

        @PostMapping("/reset-password")
        public ResponseEntity<ResetPasswordOtpResponse> resetPassword(
                        @Valid @RequestBody ResetPasswordRequest solicitud) {

                String ticket = passwordResetService.iniciarRestablecimientoConOtp(
                                solicitud.getToken(),
                                solicitud.getNuevaContrasena(),
                                solicitud.getConfirmarContrasena());

                return ResponseEntity.ok(
                                new ResetPasswordOtpResponse(ticket));
        }

        @PostMapping("/reset-password/resend")
        public ResponseEntity<ResendOtpResponse> resendResetPasswordOtp(
                        @Valid @RequestBody ResendOtpRequest solicitud,
                        HttpServletRequest request) {

                ResendOtpResult resultado = passwordResetService.reenviarCodigoRecuperacion(
                                solicitud.ticket());

                /*
                 * La transaccion del servicio ya termino antes
                 * de registrar auditoria, evitando bloqueos
                 * entre conexiones.
                 */
                try {
                        auditService.registrar(
                                        resultado.idUsuario(),
                                        "OTP_RECUPERACION_REENVIADO",
                                        "EXITOSO",
                                        "Se reenvio el codigo OTP de recuperacion de contrasena",
                                        request.getRemoteAddr(),
                                        request.getHeader("User-Agent"),
                                        "POST",
                                        "/api/auth/reset-password/resend");
                } catch (RuntimeException e) {
                        log.error(
                                        "No se pudo registrar la auditoria del reenvio OTP",
                                        e);
                }

                return ResponseEntity.ok(
                                new ResendOtpResponse(
                                                "Hemos enviado un nuevo codigo de verificacion a tu correo",
                                                resultado.reenviosRestantes(),
                                                resultado.segundosEspera()));
        }

        @PostMapping("/reset-password/confirm")
        public ResponseEntity<MessageResponse> confirmResetPassword(
                        @Valid @RequestBody ConfirmResetPasswordRequest solicitud,
                        HttpServletRequest request) {

                Long idUsuario = passwordResetService.confirmarRestablecimientoConOtp(
                                solicitud.getTicket(),
                                solicitud.getCodigoOtp());

                auditService.registrar(
                                idUsuario,
                                "PASSWORD_RESTABLECIDA",
                                "EXITOSO",
                                "La contrasena fue restablecida mediante verificacion OTP",
                                request.getRemoteAddr(),
                                request.getHeader("User-Agent"),
                                "POST",
                                "/api/auth/reset-password/confirm");

                return ResponseEntity.ok(
                                new MessageResponse(
                                                "Su contraseña ha sido cambiada con exito"));
        }

        private String enmascararCorreo(String correo) {

                if (correo == null || correo.isBlank()) {
                        return null;
                }

                int posicionArroba = correo.indexOf('@');

                if (posicionArroba <= 0) {
                        return "****";
                }

                String local = correo.substring(
                                0,
                                posicionArroba);

                String dominio = correo.substring(
                                posicionArroba);

                int caracteresVisibles = Math.min(
                                4,
                                local.length());

                return local.substring(
                                0,
                                caracteresVisibles)
                                + "****"
                                + dominio;
        }
}
