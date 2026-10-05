package monolithe.auth_service.service;

import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.repository.PasswordRecoveryProcedureRepository;
import monolithe.auth_service.repository.projection.FailedOtpAttemptResult;
import monolithe.auth_service.repository.projection.RecoveryRequestResult;
import monolithe.auth_service.repository.projection.RecoveryVerificationContext;
import monolithe.auth_service.repository.projection.TokenRecoveryContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {

        private PasswordEncoder passwordEncoder;
        private PasswordPolicyService passwordPolicyService;
        private EmailService emailService;

        private PasswordRecoveryProcedureRepository passwordRecoveryProcedureRepository;

        private PasswordResetService passwordResetService;

        @BeforeEach
        void setUp() {

                passwordEncoder = mock(PasswordEncoder.class);

                passwordPolicyService = mock(PasswordPolicyService.class);

                emailService = mock(EmailService.class);

                passwordRecoveryProcedureRepository = mock(PasswordRecoveryProcedureRepository.class);

                passwordResetService = new PasswordResetService(
                                passwordEncoder,
                                passwordPolicyService,
                                emailService,
                                passwordRecoveryProcedureRepository);

                ReflectionTestUtils.setField(
                                passwordResetService,
                                "passwordResetExpiration",
                                900L);

                ReflectionTestUtils.setField(
                                passwordResetService,
                                "passwordResetOtpExpiration",
                                600L);

                ReflectionTestUtils.setField(
                                passwordResetService,
                                "backofficePasswordResetUrl",
                                "http://localhost:5174/restablecer-contrasena");

                ReflectionTestUtils.setField(
                                passwordResetService,
                                "portalPasswordResetUrl",
                                "http://localhost:5173/restablecer-contrasena");
        }

        @Test
        void debeIniciarRestablecimientoConOtp() {

                String tokenReal = "token-recuperacion-valido";

                String tokenHash = passwordResetService.calcularSha256(
                                tokenReal);

                TokenRecoveryContext contexto = new TokenRecoveryContext(
                                10L,
                                1L,
                                "hash-anterior");

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoToken(tokenHash))
                                .thenReturn(
                                                Optional.of(contexto));

                when(passwordEncoder.matches(
                                "NuevaClave123*",
                                "hash-anterior"))
                                .thenReturn(false);

                when(passwordRecoveryProcedureRepository
                                .obtenerCorreoRecuperacion(1L))
                                .thenReturn(
                                                Optional.of(
                                                                "usuario@empresa.com"));

                when(passwordEncoder.encode(
                                "NuevaClave123*"))
                                .thenReturn(
                                                "hash-password-pendiente");

                when(passwordEncoder.encode(
                                argThat(
                                                (String valor) -> valor != null
                                                                && valor.matches("\\d{6}"))))
                                .thenReturn(
                                                "hash-otp");

                String ticket = passwordResetService
                                .iniciarRestablecimientoConOtp(
                                                tokenReal,
                                                "NuevaClave123*",
                                                "NuevaClave123*");

                assertNotNull(ticket);
                assertFalse(ticket.isBlank());

                verify(passwordPolicyService)
                                .validar(
                                                "NuevaClave123*");

                verify(passwordRecoveryProcedureRepository)
                                .obtenerContextoToken(
                                                tokenHash);

                verify(passwordRecoveryProcedureRepository)
                                .obtenerCorreoRecuperacion(
                                                1L);

                verify(passwordRecoveryProcedureRepository)
                                .iniciarVerificacion(
                                                eq(tokenHash),
                                                anyString(),
                                                eq("hash-otp"),
                                                eq("hash-password-pendiente"),
                                                any(OffsetDateTime.class));

                ArgumentCaptor<String> codigoCaptor = ArgumentCaptor.forClass(
                                String.class);

                verify(emailService)
                                .enviarCodigoRecuperacion(
                                                eq("usuario@empresa.com"),
                                                codigoCaptor.capture(),
                                                eq(10L));

                String codigoEnviado = codigoCaptor.getValue();

                assertNotNull(codigoEnviado);

                assertTrue(
                                codigoEnviado.matches("\\d{6}"),
                                "El OTP debe contener exactamente 6 digitos");
        }

        @Test
        void debeRechazarTokenInvalidoAlIniciarOtp() {

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoToken(
                                                anyString()))
                                .thenReturn(
                                                Optional.empty());

                assertThrows(
                                InvalidTokenException.class,
                                () -> passwordResetService
                                                .iniciarRestablecimientoConOtp(
                                                                "token-invalido",
                                                                "NuevaClave123*",
                                                                "NuevaClave123*"));

                verify(emailService, never())
                                .enviarCodigoRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyLong());
        }

        @Test
        void debeRechazarContrasenasQueNoCoinciden() {

                assertThrows(
                                IllegalArgumentException.class,
                                () -> passwordResetService
                                                .iniciarRestablecimientoConOtp(
                                                                "token",
                                                                "NuevaClave123*",
                                                                "OtraClave123*"));

                verify(passwordRecoveryProcedureRepository, never())
                                .obtenerContextoToken(
                                                anyString());
        }

        @Test
        void debeRechazarContrasenaIgualALaActual() {

                String tokenReal = "token-valido";

                String tokenHash = passwordResetService.calcularSha256(
                                tokenReal);

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoToken(tokenHash))
                                .thenReturn(
                                                Optional.of(
                                                                new TokenRecoveryContext(
                                                                                10L,
                                                                                1L,
                                                                                "hash-anterior")));

                when(passwordEncoder.matches(
                                "NuevaClave123*",
                                "hash-anterior"))
                                .thenReturn(true);

                assertThrows(
                                IllegalArgumentException.class,
                                () -> passwordResetService
                                                .iniciarRestablecimientoConOtp(
                                                                tokenReal,
                                                                "NuevaClave123*",
                                                                "NuevaClave123*"));

                verify(passwordRecoveryProcedureRepository, never())
                                .iniciarVerificacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any());
        }

        @Test
        void debeConfirmarRestablecimientoConOtpCorrecto() {

                String ticketReal = "ticket-recuperacion";

                String ticketHash = passwordResetService.calcularSha256(
                                ticketReal);

                RecoveryVerificationContext contexto = new RecoveryVerificationContext(
                                100L,
                                1L,
                                "hash-otp",
                                "hash-password-pendiente",
                                0,
                                OffsetDateTime
                                                .now(ZoneOffset.UTC)
                                                .plusMinutes(10),
                                null,
                                null);

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                ticketHash))
                                .thenReturn(
                                                Optional.of(contexto));

                when(passwordEncoder.matches(
                                "123456",
                                "hash-otp"))
                                .thenReturn(true);

                when(passwordRecoveryProcedureRepository
                                .confirmarRecuperacion(
                                                ticketHash))
                                .thenReturn(1L);

                Long idUsuario = passwordResetService
                                .confirmarRestablecimientoConOtp(
                                                ticketReal,
                                                "123456");

                assertEquals(
                                1L,
                                idUsuario);

                verify(passwordRecoveryProcedureRepository)
                                .confirmarRecuperacion(
                                                ticketHash);

                verify(passwordRecoveryProcedureRepository, never())
                                .registrarIntentoOtpFallido(
                                                anyString());
        }

        @Test
        void debeRegistrarIntentoCuandoOtpEsIncorrecto() {

                String ticketReal = "ticket-recuperacion";

                String ticketHash = passwordResetService.calcularSha256(
                                ticketReal);

                RecoveryVerificationContext contexto = new RecoveryVerificationContext(
                                100L,
                                1L,
                                "hash-otp",
                                "hash-password-pendiente",
                                1,
                                OffsetDateTime
                                                .now(ZoneOffset.UTC)
                                                .plusMinutes(10),
                                null,
                                null);

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                ticketHash))
                                .thenReturn(
                                                Optional.of(contexto));

                when(passwordEncoder.matches(
                                "999999",
                                "hash-otp"))
                                .thenReturn(false);

                when(passwordRecoveryProcedureRepository
                                .registrarIntentoOtpFallido(
                                                ticketHash))
                                .thenReturn(
                                                new FailedOtpAttemptResult(
                                                                2,
                                                                3,
                                                                false));

                IllegalArgumentException exception = assertThrows(
                                IllegalArgumentException.class,
                                () -> passwordResetService
                                                .confirmarRestablecimientoConOtp(
                                                                ticketReal,
                                                                "999999"));

                assertTrue(
                                exception.getMessage()
                                                .contains(
                                                                "Intentos restantes: 3"));

                verify(passwordRecoveryProcedureRepository)
                                .registrarIntentoOtpFallido(
                                                ticketHash);

                verify(passwordRecoveryProcedureRepository, never())
                                .confirmarRecuperacion(
                                                anyString());
        }

        @Test
        void debeBloquearVerificacionAlQuintoIntentoOtp() {

                String ticketReal = "ticket-recuperacion";

                String ticketHash = passwordResetService.calcularSha256(
                                ticketReal);

                RecoveryVerificationContext contexto = new RecoveryVerificationContext(
                                100L,
                                1L,
                                "hash-otp",
                                "hash-password-pendiente",
                                4,
                                OffsetDateTime
                                                .now(ZoneOffset.UTC)
                                                .plusMinutes(10),
                                null,
                                null);

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                ticketHash))
                                .thenReturn(
                                                Optional.of(contexto));

                when(passwordEncoder.matches(
                                "999999",
                                "hash-otp"))
                                .thenReturn(false);

                when(passwordRecoveryProcedureRepository
                                .registrarIntentoOtpFallido(
                                                ticketHash))
                                .thenReturn(
                                                new FailedOtpAttemptResult(
                                                                5,
                                                                0,
                                                                true));

                IllegalArgumentException exception = assertThrows(
                                IllegalArgumentException.class,
                                () -> passwordResetService
                                                .confirmarRestablecimientoConOtp(
                                                                ticketReal,
                                                                "999999"));

                assertTrue(
                                exception.getMessage()
                                                .contains(
                                                                "maximo de 5 intentos"));

                verify(passwordRecoveryProcedureRepository, never())
                                .confirmarRecuperacion(
                                                anyString());
        }

        @Test
        void debeRechazarVerificacionOtpExpirada() {

                String ticketReal = "ticket-expirado";

                String ticketHash = passwordResetService.calcularSha256(
                                ticketReal);

                RecoveryVerificationContext contexto = new RecoveryVerificationContext(
                                100L,
                                1L,
                                "hash-otp",
                                "hash-password-pendiente",
                                0,
                                OffsetDateTime
                                                .now(ZoneOffset.UTC)
                                                .minusMinutes(1),
                                null,
                                null);

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                ticketHash))
                                .thenReturn(
                                                Optional.of(contexto));

                assertThrows(
                                InvalidTokenException.class,
                                () -> passwordResetService
                                                .confirmarRestablecimientoConOtp(
                                                                ticketReal,
                                                                "123456"));

                verify(passwordRecoveryProcedureRepository, never())
                                .confirmarRecuperacion(
                                                anyString());

                verify(passwordRecoveryProcedureRepository, never())
                                .registrarIntentoOtpFallido(
                                                anyString());
        }

        @Test
        void debeRechazarTicketInvalido() {

                when(passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                anyString()))
                                .thenReturn(
                                                Optional.empty());

                assertThrows(
                                InvalidTokenException.class,
                                () -> passwordResetService
                                                .confirmarRestablecimientoConOtp(
                                                                "ticket-invalido",
                                                                "123456"));

                verify(passwordRecoveryProcedureRepository, never())
                                .confirmarRecuperacion(
                                                anyString());
        }

        @Test
        void debeRechazarOtpConFormatoInvalido() {

                assertThrows(
                                IllegalArgumentException.class,
                                () -> passwordResetService
                                                .confirmarRestablecimientoConOtp(
                                                                "ticket",
                                                                "12345"));

                verify(passwordRecoveryProcedureRepository, never())
                                .obtenerContextoVerificacion(
                                                anyString());
        }

        @Test
        void debeSolicitarRecuperacionCuentaValidaEnviaCorreoConUrlYTokenReal() {

                RecoveryRequestResult resultado = new RecoveryRequestResult(
                                50L,
                                "usuario@empresa.com");

                when(passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any(),
                                                anyString(),
                                                anyString()))
                                .thenReturn(
                                                Optional.of(resultado));

                passwordResetService
                                .solicitarRecuperacion(
                                                "usuario_test",
                                                "BACKOFFICE",
                                                "192.168.1.1",
                                                "JUnit");

                ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(
                                String.class);

                verify(emailService)
                                .enviarRecuperacionContrasena(
                                                eq("usuario@empresa.com"),
                                                urlCaptor.capture(),
                                                eq(15L));

                String urlEnviada = urlCaptor.getValue();

                assertTrue(
                                urlEnviada.startsWith(
                                                "http://localhost:5174/restablecer-contrasena?token="),
                                "La URL debe usar la base del backoffice: "
                                                + urlEnviada);

                ArgumentCaptor<String> hashCaptor = ArgumentCaptor.forClass(
                                String.class);

                verify(passwordRecoveryProcedureRepository)
                                .solicitarRecuperacion(
                                                eq("usuario_test"),
                                                eq("BACKOFFICE"),
                                                hashCaptor.capture(),
                                                any(),
                                                eq("192.168.1.1"),
                                                eq("JUnit"));

                String tokenHashEnviado = hashCaptor.getValue();

                assertEquals(
                                64,
                                tokenHashEnviado.length(),
                                "El hash SHA-256 debe tener exactamente 64 caracteres hex");

                String tokenReal = urlEnviada.substring(
                                urlEnviada.indexOf("token=") + 6);

                assertNotEquals(
                                tokenReal,
                                tokenHashEnviado,
                                "El token real NO debe coincidir con el hash guardado en BD");
        }

        @Test
        void debeSolicitarRecuperacionProcedureRetornaEmptyNoEnviaCorreo() {

                when(passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any(),
                                                any(),
                                                any()))
                                .thenReturn(
                                                Optional.empty());

                assertDoesNotThrow(
                                () -> passwordResetService
                                                .solicitarRecuperacion(
                                                                "usuario_invalido",
                                                                "BACKOFFICE",
                                                                "127.0.0.1",
                                                                "JUnit"));

                verify(emailService, never())
                                .enviarRecuperacionContrasena(
                                                anyString(),
                                                anyString(),
                                                anyLong());
        }

        @Test
        void debeSolicitarRecuperacionOrigenBackofficeUsaUrlBackoffice() {

                RecoveryRequestResult resultado = new RecoveryRequestResult(
                                1L,
                                "admin@empresa.com");

                when(passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any(),
                                                any(),
                                                any()))
                                .thenReturn(
                                                Optional.of(resultado));

                passwordResetService
                                .solicitarRecuperacion(
                                                "admin",
                                                "BACKOFFICE",
                                                "10.0.0.1",
                                                "JUnit");

                ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(
                                String.class);

                verify(emailService)
                                .enviarRecuperacionContrasena(
                                                eq("admin@empresa.com"),
                                                urlCaptor.capture(),
                                                eq(15L));

                assertTrue(
                                urlCaptor.getValue()
                                                .startsWith(
                                                                "http://localhost:5174/restablecer-contrasena"),
                                "BACKOFFICE debe usar la URL del backoffice");
        }

        @Test
        void debeSolicitarRecuperacionOrigenPortalClienteUsaUrlPortal() {

                RecoveryRequestResult resultado = new RecoveryRequestResult(
                                2L,
                                "cliente@empresa.com");

                when(passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any(),
                                                any(),
                                                any()))
                                .thenReturn(
                                                Optional.of(resultado));

                passwordResetService
                                .solicitarRecuperacion(
                                                "cliente",
                                                "PORTAL_CLIENTE",
                                                "10.0.0.2",
                                                "JUnit");

                ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(
                                String.class);

                verify(emailService)
                                .enviarRecuperacionContrasena(
                                                eq("cliente@empresa.com"),
                                                urlCaptor.capture(),
                                                eq(15L));

                assertTrue(
                                urlCaptor.getValue()
                                                .startsWith(
                                                                "http://localhost:5173/restablecer-contrasena"),
                                "PORTAL_CLIENTE debe usar la URL del portal");
        }

        @Test
        void debeSolicitarRecuperacionSmtpFallaPropagaMailException() {

                RecoveryRequestResult resultado = new RecoveryRequestResult(
                                3L,
                                "usuario@empresa.com");

                when(passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                anyString(),
                                                anyString(),
                                                anyString(),
                                                any(),
                                                any(),
                                                any()))
                                .thenReturn(
                                                Optional.of(resultado));

                MailException mailException = new MailSendException(
                                "SMTP no disponible");

                doThrow(mailException)
                                .when(emailService)
                                .enviarRecuperacionContrasena(
                                                anyString(),
                                                anyString(),
                                                anyLong());

                assertThrows(
                                MailException.class,
                                () -> passwordResetService
                                                .solicitarRecuperacion(
                                                                "usuario",
                                                                "BACKOFFICE",
                                                                "127.0.0.1",
                                                                "JUnit"),
                                "MailException debe propagarse para provocar rollback transaccional");
        }
}