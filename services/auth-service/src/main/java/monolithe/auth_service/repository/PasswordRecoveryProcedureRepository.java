package monolithe.auth_service.repository;

import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.repository.projection.FailedOtpAttemptResult;
import monolithe.auth_service.repository.projection.RecoveryRequestResult;
import monolithe.auth_service.repository.projection.RecoveryVerificationContext;
import monolithe.auth_service.repository.projection.StartedRecoveryVerification;
import monolithe.auth_service.repository.projection.TokenRecoveryContext;
import monolithe.auth_service.repository.projection.ResendOtpResult;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Map;
import java.util.Optional;

@Repository
@Slf4j
public class PasswordRecoveryProcedureRepository {

    private final SimpleJdbcCall callSolicitarRecuperacion;
    private final SimpleJdbcCall callObtenerContextoToken;
    private final SimpleJdbcCall callIniciarVerificacion;
    private final SimpleJdbcCall callObtenerContextoVerificacion;
    private final SimpleJdbcCall callRegistrarIntentoOtpFallido;
    private final SimpleJdbcCall callConfirmarRecuperacion;
    private final SimpleJdbcCall callObtenerCorreoRecuperacion;
    private final SimpleJdbcCall callReenviarOtp;

    public PasswordRecoveryProcedureRepository(
            JdbcTemplate jdbcTemplate) {

        this.callSolicitarRecuperacion = crearCallSolicitarRecuperacion(
                jdbcTemplate);

        this.callObtenerContextoToken = crearCallObtenerContextoToken(
                jdbcTemplate);

        this.callIniciarVerificacion = crearCallIniciarVerificacion(
                jdbcTemplate);

        this.callObtenerContextoVerificacion = crearCallObtenerContextoVerificacion(
                jdbcTemplate);

        this.callRegistrarIntentoOtpFallido = crearCallRegistrarIntentoOtpFallido(
                jdbcTemplate);

        this.callConfirmarRecuperacion = crearCallConfirmarRecuperacion(
                jdbcTemplate);

        this.callObtenerCorreoRecuperacion = crearCallObtenerCorreoRecuperacion(
                jdbcTemplate);
        this.callReenviarOtp = crearCallReenviarOtp(
                jdbcTemplate);
    }

    private SimpleJdbcCall crearCallSolicitarRecuperacion(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_solicitar_recuperacion_password")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_usuario_login",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_origen",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_token_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_fecha_expiracion",
                                Types.TIMESTAMP_WITH_TIMEZONE),

                        new SqlParameter(
                                "p_ip_solicitud",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_user_agent",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_correo",
                                Types.VARCHAR));
    }

    private SimpleJdbcCall crearCallObtenerCorreoRecuperacion(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_obtener_correo_recuperacion_password")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_id_usuario",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_correo",
                                Types.VARCHAR));
    }

    private SimpleJdbcCall crearCallObtenerContextoToken(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_obtener_contexto_token_recuperacion")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_token_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_id_token",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_password_actual_hash",
                                Types.VARCHAR));
    }

    private SimpleJdbcCall crearCallIniciarVerificacion(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_iniciar_verificacion_recuperacion")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_token_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_ticket_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_otp_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_password_pendiente_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_fecha_expiracion",
                                Types.TIMESTAMP_WITH_TIMEZONE),

                        new SqlOutParameter(
                                "p_id_verificacion",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT));
    }

    private SimpleJdbcCall crearCallObtenerContextoVerificacion(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_obtener_contexto_verificacion_recuperacion")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_ticket_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_id_verificacion",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_otp_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_password_pendiente_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_intentos_fallidos",
                                Types.SMALLINT),

                        /*
                         * PostgreSQL devuelve estos OUT como
                         * TIMESTAMP WITHOUT TIME ZONE.
                         *
                         * Por eso deben registrarse como
                         * java.sql.Types.TIMESTAMP (93)
                         * y no TIMESTAMP_WITH_TIMEZONE (2014).
                         */
                        new SqlOutParameter(
                                "p_fecha_expiracion",
                                Types.TIMESTAMP),

                        new SqlOutParameter(
                                "p_fecha_confirmacion",
                                Types.TIMESTAMP),

                        new SqlOutParameter(
                                "p_fecha_bloqueo",
                                Types.TIMESTAMP));
    }

    private SimpleJdbcCall crearCallRegistrarIntentoOtpFallido(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_registrar_intento_otp_fallido")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_ticket_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_intentos_fallidos",
                                Types.SMALLINT),

                        new SqlOutParameter(
                                "p_intentos_restantes",
                                Types.SMALLINT),

                        new SqlOutParameter(
                                "p_bloqueado",
                                Types.BOOLEAN));
    }

    private SimpleJdbcCall crearCallConfirmarRecuperacion(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_confirmar_recuperacion_password")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_ticket_hash",
                                Types.VARCHAR),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT));
    }

    private SimpleJdbcCall crearCallReenviarOtp(
            JdbcTemplate jdbcTemplate) {

        return new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName(
                        "sp_reenviar_otp_recuperacion")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_ticket_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_nuevo_otp_hash",
                                Types.VARCHAR),

                        new SqlParameter(
                                "p_nueva_fecha_expiracion",
                                Types.TIMESTAMP_WITH_TIMEZONE),

                        new SqlOutParameter(
                                "p_id_usuario",
                                Types.BIGINT),

                        new SqlOutParameter(
                                "p_reenvios_realizados",
                                Types.SMALLINT),

                        new SqlOutParameter(
                                "p_reenvios_restantes",
                                Types.SMALLINT),

                        new SqlOutParameter(
                                "p_segundos_espera",
                                Types.INTEGER),

                        new SqlOutParameter(
                                "p_estado",
                                Types.VARCHAR));
    }

    public Optional<String> obtenerCorreoRecuperacion(
            Long idUsuario) {

        MapSqlParameterSource params = new MapSqlParameterSource(
                "p_id_usuario",
                idUsuario);

        Map<String, Object> out = callObtenerCorreoRecuperacion
                .execute(params);

        String correo = (String) out.get(
                "p_correo");

        if (correo == null
                || correo.isBlank()) {

            return Optional.empty();
        }

        return Optional.of(correo);
    }

    public Optional<RecoveryRequestResult> solicitarRecuperacion(
            String usuarioLogin,
            String origen,
            String tokenHash,
            OffsetDateTime fechaExpiracion,
            String ipSolicitud,
            String userAgent) {

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue(
                        "p_usuario_login",
                        usuarioLogin)
                .addValue(
                        "p_origen",
                        origen)
                .addValue(
                        "p_token_hash",
                        tokenHash)
                .addValue(
                        "p_fecha_expiracion",
                        fechaExpiracion)
                .addValue(
                        "p_ip_solicitud",
                        ipSolicitud)
                .addValue(
                        "p_user_agent",
                        userAgent);

        Map<String, Object> out = callSolicitarRecuperacion
                .execute(params);

        Long idUsuario = toLong(
                out.get(
                        "p_id_usuario"));

        if (idUsuario == null) {
            return Optional.empty();
        }

        return Optional.of(
                new RecoveryRequestResult(
                        idUsuario,
                        (String) out.get(
                                "p_correo")));
    }

    public Optional<TokenRecoveryContext> obtenerContextoToken(
            String tokenHash) {

        MapSqlParameterSource params = new MapSqlParameterSource(
                "p_token_hash",
                tokenHash);

        Map<String, Object> out = callObtenerContextoToken
                .execute(params);

        Long idToken = toLong(
                out.get(
                        "p_id_token"));

        if (idToken == null) {
            return Optional.empty();
        }

        Long idUsuario = toLong(
                out.get(
                        "p_id_usuario"));

        String passwordHash = (String) out.get(
                "p_password_actual_hash");

        return Optional.of(
                new TokenRecoveryContext(
                        idToken,
                        idUsuario,
                        passwordHash));
    }

    public StartedRecoveryVerification iniciarVerificacion(
            String tokenHash,
            String ticketHash,
            String otpHash,
            String passwordPendienteHash,
            OffsetDateTime fechaExpiracion) {

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue(
                        "p_token_hash",
                        tokenHash)
                .addValue(
                        "p_ticket_hash",
                        ticketHash)
                .addValue(
                        "p_otp_hash",
                        otpHash)
                .addValue(
                        "p_password_pendiente_hash",
                        passwordPendienteHash)
                .addValue(
                        "p_fecha_expiracion",
                        fechaExpiracion);

        Map<String, Object> out = callIniciarVerificacion
                .execute(params);

        Long idVerificacion = toLong(
                out.get(
                        "p_id_verificacion"));

        Long idUsuario = toLong(
                out.get(
                        "p_id_usuario"));

        return new StartedRecoveryVerification(
                idVerificacion,
                idUsuario);
    }

    public Optional<RecoveryVerificationContext> obtenerContextoVerificacion(
            String ticketHash) {

        MapSqlParameterSource params = new MapSqlParameterSource(
                "p_ticket_hash",
                ticketHash);

        Map<String, Object> out = callObtenerContextoVerificacion
                .execute(params);

        Long idVerificacion = toLong(
                out.get(
                        "p_id_verificacion"));

        if (idVerificacion == null) {
            return Optional.empty();
        }

        return Optional.of(
                mapearRecoveryVerificationContext(
                        idVerificacion,
                        out));
    }

    private RecoveryVerificationContext mapearRecoveryVerificationContext(
            Long idVerificacion,
            Map<String, Object> out) {

        Long idUsuario = toLong(
                out.get(
                        "p_id_usuario"));

        String otpHash = (String) out.get(
                "p_otp_hash");

        String passwordPendiente = (String) out.get(
                "p_password_pendiente_hash");

        int intentosFallidos = toInt(
                out.get(
                        "p_intentos_fallidos"));

        OffsetDateTime fechaExpiracion = toOffsetDateTime(
                out.get(
                        "p_fecha_expiracion"));

        OffsetDateTime fechaConfirmacion = toOffsetDateTime(
                out.get(
                        "p_fecha_confirmacion"));

        OffsetDateTime fechaBloqueo = toOffsetDateTime(
                out.get(
                        "p_fecha_bloqueo"));

        return new RecoveryVerificationContext(
                idVerificacion,
                idUsuario,
                otpHash,
                passwordPendiente,
                intentosFallidos,
                fechaExpiracion,
                fechaConfirmacion,
                fechaBloqueo);
    }

    public ResendOtpResult reenviarOtp(
            String ticketHash,
            String nuevoOtpHash,
            OffsetDateTime nuevaFechaExpiracion) {

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue(
                        "p_ticket_hash",
                        ticketHash)
                .addValue(
                        "p_nuevo_otp_hash",
                        nuevoOtpHash)
                .addValue(
                        "p_nueva_fecha_expiracion",
                        nuevaFechaExpiracion);

        Map<String, Object> out = callReenviarOtp.execute(params);

        Long idUsuario = toLong(
                out.get(
                        "p_id_usuario"));

        int reenviosRealizados = toInt(
                out.get(
                        "p_reenvios_realizados"));

        int reenviosRestantes = toInt(
                out.get(
                        "p_reenvios_restantes"));

        int segundosEspera = toInt(
                out.get(
                        "p_segundos_espera"));

        String estado = (String) out.get(
                "p_estado");

        return new ResendOtpResult(
                idUsuario,
                reenviosRealizados,
                reenviosRestantes,
                segundosEspera,
                estado);
    }

    public FailedOtpAttemptResult registrarIntentoOtpFallido(
            String ticketHash) {

        MapSqlParameterSource params = new MapSqlParameterSource(
                "p_ticket_hash",
                ticketHash);

        Map<String, Object> out = callRegistrarIntentoOtpFallido
                .execute(params);

        int intentosFallidos = toInt(
                out.get(
                        "p_intentos_fallidos"));

        int intentosRestantes = toInt(
                out.get(
                        "p_intentos_restantes"));

        boolean bloqueado = toBoolean(
                out.get(
                        "p_bloqueado"));

        return new FailedOtpAttemptResult(
                intentosFallidos,
                intentosRestantes,
                bloqueado);
    }

    public Long confirmarRecuperacion(
            String ticketHash) {

        MapSqlParameterSource params = new MapSqlParameterSource(
                "p_ticket_hash",
                ticketHash);

        Map<String, Object> out = callConfirmarRecuperacion
                .execute(params);

        return toLong(
                out.get(
                        "p_id_usuario"));
    }

    private Long toLong(
            Object rawValue) {

        if (rawValue == null) {
            return null;
        }

        if (rawValue instanceof Number numero) {
            return numero.longValue();
        }

        return Long.valueOf(
                rawValue.toString());
    }

    private int toInt(
            Object rawValue) {

        if (rawValue == null) {
            return 0;
        }

        if (rawValue instanceof Number numero) {
            return numero.intValue();
        }

        return Integer.parseInt(
                rawValue.toString());
    }

    private boolean toBoolean(
            Object rawValue) {

        if (rawValue == null) {
            return false;
        }

        if (rawValue instanceof Boolean valor) {
            return valor;
        }

        return Boolean.parseBoolean(
                rawValue.toString());
    }

    private OffsetDateTime toOffsetDateTime(
            Object rawValue) {

        if (rawValue == null) {
            return null;
        }

        if (rawValue instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime;
        }

        /*
         * PostgreSQL TIMESTAMP WITHOUT TIME ZONE suele
         * llegar mediante JDBC como java.sql.Timestamp.
         *
         * Como todas las fechas de seguridad del sistema
         * se manejan en UTC, se interpreta como UTC.
         */
        if (rawValue instanceof Timestamp timestamp) {
            return timestamp
                    .toLocalDateTime()
                    .atOffset(
                            ZoneOffset.UTC);
        }

        if (rawValue instanceof LocalDateTime localDateTime) {
            return localDateTime
                    .atOffset(
                            ZoneOffset.UTC);
        }

        if (rawValue instanceof ZonedDateTime zonedDateTime) {
            return zonedDateTime
                    .toOffsetDateTime();
        }

        if (rawValue instanceof String texto) {
            return OffsetDateTime.parse(
                    texto);
        }

        throw new IllegalArgumentException(
                "No se puede convertir a OffsetDateTime: "
                        + rawValue
                                .getClass()
                                .getName());
    }
}