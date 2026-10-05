package monolithe.auth_service.repository;

import monolithe.auth_service.repository.projection.FailedOtpAttemptResult;
import monolithe.auth_service.repository.projection.RecoveryRequestResult;
import monolithe.auth_service.repository.projection.RecoveryVerificationContext;
import monolithe.auth_service.repository.projection.StartedRecoveryVerification;
import monolithe.auth_service.repository.projection.TokenRecoveryContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.test.util.ReflectionTestUtils;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PasswordRecoveryProcedureRepositoryTest {

    private PasswordRecoveryProcedureRepository repository;
    private SimpleJdbcCall callSolicitarRecuperacion;
    private SimpleJdbcCall callObtenerContextoToken;
    private SimpleJdbcCall callIniciarVerificacion;
    private SimpleJdbcCall callObtenerContextoVerificacion;
    private SimpleJdbcCall callRegistrarIntentoOtpFallido;
    private SimpleJdbcCall callConfirmarRecuperacion;

    @BeforeEach
    void setUp() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        repository = new PasswordRecoveryProcedureRepository(jdbcTemplate);

        callSolicitarRecuperacion = mock(SimpleJdbcCall.class);
        callObtenerContextoToken = mock(SimpleJdbcCall.class);
        callIniciarVerificacion = mock(SimpleJdbcCall.class);
        callObtenerContextoVerificacion = mock(SimpleJdbcCall.class);
        callRegistrarIntentoOtpFallido = mock(SimpleJdbcCall.class);
        callConfirmarRecuperacion = mock(SimpleJdbcCall.class);

        ReflectionTestUtils.setField(repository, "callSolicitarRecuperacion", callSolicitarRecuperacion);
        ReflectionTestUtils.setField(repository, "callObtenerContextoToken", callObtenerContextoToken);
        ReflectionTestUtils.setField(repository, "callIniciarVerificacion", callIniciarVerificacion);
        ReflectionTestUtils.setField(repository, "callObtenerContextoVerificacion", callObtenerContextoVerificacion);
        ReflectionTestUtils.setField(repository, "callRegistrarIntentoOtpFallido", callRegistrarIntentoOtpFallido);
        ReflectionTestUtils.setField(repository, "callConfirmarRecuperacion", callConfirmarRecuperacion);
    }

    @Test
    void debeSolicitarRecuperacionYRetornarIdUsuarioYCorreo() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_usuario", 50L);
        out.put("p_correo", "usuario@empresa.com");

        when(callSolicitarRecuperacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        OffsetDateTime exp = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30);
        Optional<RecoveryRequestResult> resultado = repository.solicitarRecuperacion(
                "usuario_login", "BACKOFFICE", "hash-64-chars", exp, "192.168.1.1", "Mozilla/5.0");

        assertTrue(resultado.isPresent());
        assertEquals(50L, resultado.get().idUsuario());
        assertEquals("usuario@empresa.com", resultado.get().correo());
    }

    @Test
    void debeRetornarEmptySiSolicitarRecuperacionDevuelveIdUsuarioNull() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_usuario", null);
        out.put("p_correo", null);

        when(callSolicitarRecuperacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        OffsetDateTime exp = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30);
        Optional<RecoveryRequestResult> resultado = repository.solicitarRecuperacion(
                "usuario_invalido", "BACKOFFICE", "hash-64-chars", exp, null, null);

        assertTrue(resultado.isEmpty());
    }

    @Test
    void debeSolicitarRecuperacionConIpYUserAgentNull() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_usuario", 50L);
        out.put("p_correo", "cliente@empresa.com");

        when(callSolicitarRecuperacion.execute(any(MapSqlParameterSource.class))).thenAnswer(invocation -> {
            MapSqlParameterSource params = invocation.getArgument(0);
            assertNull(params.getValue("p_ip_solicitud"));
            assertNull(params.getValue("p_user_agent"));
            assertTrue(params.getValue("p_fecha_expiracion") instanceof OffsetDateTime);
            return out;
        });

        OffsetDateTime exp = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(30);
        Optional<RecoveryRequestResult> resultado = repository.solicitarRecuperacion(
                "cliente_login", "PORTAL_CLIENTE", "hash-64-chars", exp, null, null);

        assertTrue(resultado.isPresent());
        assertEquals(50L, resultado.get().idUsuario());
        assertEquals("cliente@empresa.com", resultado.get().correo());
    }

    @Test
    void debeObtenerContextoTokenCorrectamente() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_token", 100L);
        out.put("p_id_usuario", 50L);
        out.put("p_password_actual_hash", "$2a$10$abcdef");

        when(callObtenerContextoToken.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        Optional<TokenRecoveryContext> resultado = repository.obtenerContextoToken("hash-123");

        assertTrue(resultado.isPresent());
        assertEquals(100L, resultado.get().idToken());
        assertEquals(50L, resultado.get().idUsuario());
        assertEquals("$2a$10$abcdef", resultado.get().passwordActualHash());
    }

    @Test
    void debeRetornarEmptySiContextoTokenEsNull() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_token", null);

        when(callObtenerContextoToken.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        Optional<TokenRecoveryContext> resultado = repository.obtenerContextoToken("hash-invalid");

        assertTrue(resultado.isEmpty());
    }

    @Test
    void debeIniciarVerificacionCorrectamente() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_verificacion", 200L);
        out.put("p_id_usuario", 50L);

        when(callIniciarVerificacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        StartedRecoveryVerification resultado = repository.iniciarVerificacion(
                "token-hash", "ticket-hash", "otp-hash", "pwd-hash", OffsetDateTime.now(ZoneOffset.UTC));

        assertNotNull(resultado);
        assertEquals(200L, resultado.idVerificacion());
        assertEquals(50L, resultado.idUsuario());
    }

    @Test
    void debeObtenerContextoVerificacionYConvertirTimestamptz() {
        Instant ahora = Instant.now();
        Timestamp expTs = Timestamp.from(ahora);

        Map<String, Object> out = new HashMap<>();
        out.put("p_id_verificacion", 200L);
        out.put("p_id_usuario", 50L);
        out.put("p_otp_hash", "$2a$10$otp");
        out.put("p_password_pendiente_hash", "$2a$10$newpwd");
        out.put("p_intentos_fallidos", (short) 2);
        out.put("p_fecha_expiracion", expTs);
        out.put("p_fecha_confirmacion", null);
        out.put("p_fecha_bloqueo", null);

        when(callObtenerContextoVerificacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        Optional<RecoveryVerificationContext> resultado = repository.obtenerContextoVerificacion("ticket-123");

        assertTrue(resultado.isPresent());
        assertEquals(200L, resultado.get().idVerificacion());
        assertEquals(50L, resultado.get().idUsuario());
        assertEquals("$2a$10$otp", resultado.get().otpHash());
        assertEquals(2, resultado.get().intentosFallidos());
        assertNotNull(resultado.get().fechaExpiracion());
        assertNull(resultado.get().fechaConfirmacion());
        assertNull(resultado.get().fechaBloqueo());
    }

    @Test
    void debeRetornarEmptySiContextoVerificacionEsNull() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_verificacion", null);

        when(callObtenerContextoVerificacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        Optional<RecoveryVerificationContext> resultado = repository.obtenerContextoVerificacion("ticket-invalid");

        assertTrue(resultado.isEmpty());
    }

    @Test
    void debeRegistrarIntentoOtpFallido() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_intentos_fallidos", (short) 3);
        out.put("p_intentos_restantes", (short) 2);
        out.put("p_bloqueado", false);

        when(callRegistrarIntentoOtpFallido.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        FailedOtpAttemptResult resultado = repository.registrarIntentoOtpFallido("ticket-123");

        assertEquals(3, resultado.intentosFallidos());
        assertEquals(2, resultado.intentosRestantes());
        assertFalse(resultado.bloqueado());
    }

    @Test
    void debeConfirmarRecuperacionCorrectamente() {
        Map<String, Object> out = new HashMap<>();
        out.put("p_id_usuario", 50L);

        when(callConfirmarRecuperacion.execute(any(MapSqlParameterSource.class))).thenReturn(out);

        Long idUsuario = repository.confirmarRecuperacion("ticket-123");

        assertEquals(50L, idUsuario);
    }
}
