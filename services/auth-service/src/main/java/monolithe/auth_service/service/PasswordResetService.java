package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.repository.PasswordRecoveryProcedureRepository;
import monolithe.auth_service.repository.projection.FailedOtpAttemptResult;
import monolithe.auth_service.repository.projection.RecoveryRequestResult;
import monolithe.auth_service.repository.projection.RecoveryVerificationContext;
import monolithe.auth_service.repository.projection.TokenRecoveryContext;
import monolithe.auth_service.repository.projection.ResendOtpResult;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

        private static final int TOKEN_BYTES = 32;

        private final SecureRandom secureRandom = new SecureRandom();

        private final PasswordEncoder passwordEncoder;
        private final PasswordPolicyService passwordPolicyService;
        private final EmailService emailService;
        private final PasswordRecoveryProcedureRepository passwordRecoveryProcedureRepository;

        @Value("${security.auth.password-reset-expiration}")
        private long passwordResetExpiration;

        @Value("${security.auth.password-reset-otp-expiration}")
        private long passwordResetOtpExpiration;

        @Value("${security.auth.backoffice-password-reset-url}")
        private String backofficePasswordResetUrl;

        @Value("${security.auth.portal-password-reset-url}")
        private String portalPasswordResetUrl;

        public String calcularSha256(String token) {

                try {

                        MessageDigest digest = MessageDigest.getInstance("SHA-256");

                        byte[] hash = digest.digest(
                                        token.getBytes(
                                                        StandardCharsets.UTF_8));

                        return HexFormat.of()
                                        .formatHex(hash);

                } catch (NoSuchAlgorithmException e) {

                        throw new IllegalStateException(
                                        "No fue posible calcular SHA-256",
                                        e);
                }
        }

        private String generarTokenSeguro() {

                byte[] bytes = new byte[TOKEN_BYTES];

                secureRandom.nextBytes(bytes);

                return Base64.getUrlEncoder()
                                .withoutPadding()
                                .encodeToString(bytes);
        }

        private String limitarTexto(
                        String texto,
                        int longitudMaxima) {

                if (texto == null) {
                        return null;
                }

                return texto.length() <= longitudMaxima
                                ? texto
                                : texto.substring(
                                                0,
                                                longitudMaxima);
        }

        @Transactional
        public String iniciarRestablecimientoConOtp(
                        String tokenReal,
                        String nuevaContrasena,
                        String confirmarContrasena) {

                if (tokenReal == null
                                || tokenReal.isBlank()) {

                        throw new InvalidTokenException(
                                        "Token de recuperacion invalido");
                }

                if (nuevaContrasena == null
                                || !nuevaContrasena.equals(
                                                confirmarContrasena)) {

                        throw new IllegalArgumentException(
                                        "La nueva contrasena y su confirmacion no coinciden");
                }

                passwordPolicyService.validar(
                                nuevaContrasena);

                String tokenHash = calcularSha256(tokenReal);

                TokenRecoveryContext contexto = passwordRecoveryProcedureRepository
                                .obtenerContextoToken(
                                                tokenHash)
                                .orElseThrow(
                                                () -> new InvalidTokenException(
                                                                "Token de recuperacion invalido, usado o expirado"));

                if (passwordEncoder.matches(
                                nuevaContrasena,
                                contexto.passwordActualHash())) {

                        throw new IllegalArgumentException(
                                        "La nueva contrasena debe ser diferente a la contrasena anterior");
                }

                String correo = passwordRecoveryProcedureRepository
                                .obtenerCorreoRecuperacion(
                                                contexto.idUsuario())
                                .orElseThrow(
                                                () -> new IllegalStateException(
                                                                "No se encontro un correo verificado para el usuario"));

                /*
                 * Ticket opaco entregado al frontend.
                 * En base de datos solamente se almacena
                 * SHA-256(ticketReal).
                 */
                String ticketReal = generarTokenSeguro();

                String ticketHash = calcularSha256(ticketReal);

                /*
                 * Codigo OTP de exactamente 6 digitos.
                 * Nunca se almacena en texto plano.
                 */
                String codigoOtp = String.format(
                                "%06d",
                                secureRandom.nextInt(
                                                1_000_000));

                String otpHash = passwordEncoder.encode(
                                codigoOtp);

                /*
                 * La nueva contrasena se almacena solamente
                 * como hash pendiente hasta validar el OTP.
                 */
                String passwordPendienteHash = passwordEncoder.encode(
                                nuevaContrasena);

                OffsetDateTime fechaExpiracionOtp = OffsetDateTime
                                .now(ZoneOffset.UTC)
                                .plusSeconds(
                                                passwordResetOtpExpiration);

                passwordRecoveryProcedureRepository
                                .iniciarVerificacion(
                                                tokenHash,
                                                ticketHash,
                                                otpHash,
                                                passwordPendienteHash,
                                                fechaExpiracionOtp);

                long minutosExpiracion = Math.max(
                                1,
                                (passwordResetOtpExpiration + 59)
                                                / 60);

                /*
                 * Si SMTP falla, MailException se propaga.
                 * Al encontrarnos dentro de @Transactional,
                 * la operacion de inicio del OTP se revierte.
                 */
                emailService.enviarCodigoRecuperacion(
                                correo,
                                codigoOtp,
                                minutosExpiracion);

                return ticketReal;
        }

        @Transactional
        public ResendOtpResult reenviarCodigoRecuperacion(
                        String ticketReal) {

                if (ticketReal == null || ticketReal.isBlank()) {
                        throw new InvalidTokenException(
                                        "Ticket de recuperacion invalido");
                }

                String ticketHash = calcularSha256(ticketReal);

                /*
                 * Generamos un OTP completamente nuevo.
                 * El codigo anterior quedara invalidado cuando
                 * el procedimiento sustituya su hash.
                 */
                String codigoOtp = String.format(
                                "%06d",
                                secureRandom.nextInt(1_000_000));

                String nuevoOtpHash = passwordEncoder.encode(
                                codigoOtp);

                OffsetDateTime nuevaFechaExpiracion = OffsetDateTime
                                .now(ZoneOffset.UTC)
                                .plusSeconds(
                                                passwordResetOtpExpiration);

                ResendOtpResult resultado = passwordRecoveryProcedureRepository
                                .reenviarOtp(
                                                ticketHash,
                                                nuevoOtpHash,
                                                nuevaFechaExpiracion);

                if (resultado == null
                                || resultado.estado() == null) {

                        throw new InvalidTokenException(
                                        "No fue posible reenviar el codigo de verificacion");
                }

                switch (resultado.estado()) {

                        case "REENVIADO" -> {
                                // Continuamos con el envio del correo.
                        }

                        case "ESPERA" -> throw new IllegalArgumentException(
                                        "Debes esperar "
                                                        + resultado.segundosEspera()
                                                        + " segundos antes de solicitar otro codigo");

                        case "LIMITE_REENVIOS" -> throw new IllegalArgumentException(
                                        "Se alcanzo el maximo de 3 reenvios permitidos");

                        case "VENTANA_EXPIRADA" -> throw new InvalidTokenException(
                                        "El periodo para reenviar codigos ha expirado. "
                                                        + "Debes iniciar nuevamente la recuperacion");

                        case "NO_DISPONIBLE" -> throw new InvalidTokenException(
                                        "La verificacion ya fue confirmada, bloqueada "
                                                        + "o alcanzo el maximo de intentos");

                        default -> throw new InvalidTokenException(
                                        "Verificacion de recuperacion invalida");
                }

                if (resultado.idUsuario() == null) {
                        throw new InvalidTokenException(
                                        "No fue posible identificar al usuario de la recuperacion");
                }

                String correo = passwordRecoveryProcedureRepository
                                .obtenerCorreoRecuperacion(
                                                resultado.idUsuario())
                                .orElseThrow(
                                                () -> new IllegalStateException(
                                                                "No se encontro un correo verificado para el usuario"));

                long minutosExpiracion = Math.max(
                                1,
                                (passwordResetOtpExpiration + 59) / 60);

                /*
                 * El envio ocurre dentro de la misma transaccion.
                 *
                 * Si SMTP falla y EmailService propaga MailException,
                 * el cambio del OTP en base de datos se revierte.
                 */
                emailService.enviarCodigoRecuperacion(
                                correo,
                                codigoOtp,
                                minutosExpiracion);

                return resultado;
        }

        /*
         * Este metodo deliberadamente NO utiliza
         * @Transactional.
         * Si el OTP es incorrecto, el procedimiento
         * sp_registrar_intento_otp_fallido debe poder
         * confirmar el incremento del contador aunque
         * Java posteriormente lance una excepcion.
         */
        public Long confirmarRestablecimientoConOtp(
                        String ticketReal,
                        String codigoOtp) {

                if (ticketReal == null
                                || ticketReal.isBlank()) {

                        throw new InvalidTokenException(
                                        "Ticket de recuperacion invalido");
                }

                String otpNormalizado = codigoOtp == null
                                ? null
                                : codigoOtp.trim();

                if (otpNormalizado == null
                                || !otpNormalizado.matches(
                                                "\\d{6}")) {

                        throw new IllegalArgumentException(
                                        "El codigo de verificacion debe contener 6 digitos");
                }

                String ticketHash = calcularSha256(ticketReal);

                RecoveryVerificationContext contexto = passwordRecoveryProcedureRepository
                                .obtenerContextoVerificacion(
                                                ticketHash)
                                .orElseThrow(
                                                () -> new InvalidTokenException(
                                                                "Verificacion de recuperacion invalida"));

                OffsetDateTime ahora = OffsetDateTime.now(
                                ZoneOffset.UTC);

                if (contexto.fechaConfirmacion() != null
                                || contexto.fechaBloqueo() != null
                                || contexto.intentosFallidos() >= 5
                                || contexto.fechaExpiracion() == null
                                || !contexto.fechaExpiracion()
                                                .isAfter(ahora)
                                || contexto.otpHash() == null) {

                        throw new InvalidTokenException(
                                        "La verificacion ha expirado, fue confirmada o esta bloqueada");
                }

                if (!passwordEncoder.matches(
                                otpNormalizado,
                                contexto.otpHash())) {

                        FailedOtpAttemptResult intento = passwordRecoveryProcedureRepository
                                        .registrarIntentoOtpFallido(
                                                        ticketHash);

                        if (intento.bloqueado()) {

                                throw new IllegalArgumentException(
                                                "Codigo incorrecto. Se alcanzo el maximo de 5 intentos");
                        }

                        throw new IllegalArgumentException(
                                        "Codigo incorrecto. Intentos restantes: "
                                                        + intento.intentosRestantes());
                }

                /*
                 * El procedimiento almacenado realiza de forma
                 * atomica:
                 *
                 * - aplicacion del password pendiente;
                 * - confirmacion de la verificacion;
                 * - limpieza del bloqueo del usuario;
                 * - revocacion de sesiones;
                 * - invalidacion de recuperaciones restantes.
                 */
                Long idUsuario = passwordRecoveryProcedureRepository
                                .confirmarRecuperacion(
                                                ticketHash);

                if (idUsuario == null) {

                        throw new InvalidTokenException(
                                        "No fue posible confirmar la recuperacion de contrasena");
                }

                return idUsuario;
        }

        /*
         * Devuelve el id del usuario unicamente cuando
         * realmente se genero la recuperacion.
         *
         * Esto permite registrar la auditoria desde el
         * controlador DESPUES de que esta transaccion
         * haya terminado y liberado los bloqueos de BD.
         */
        @Transactional
        public Optional<RecoveryRequestResult> solicitarRecuperacion(
                        String usuarioLogin,
                        String origen,
                        String ipSolicitud,
                        String userAgent) {

                /*
                 * El token real solamente existe en memoria.
                 * Nunca se almacena directamente en BD.
                 */
                String tokenReal = generarTokenSeguro();

                /*
                 * A PostgreSQL solamente se envia
                 * SHA-256(tokenReal).
                 */
                String tokenHash = calcularSha256(tokenReal);

                OffsetDateTime fechaExpiracion = OffsetDateTime
                                .now(ZoneOffset.UTC)
                                .plusSeconds(
                                                passwordResetExpiration);

                Optional<RecoveryRequestResult> resultado = passwordRecoveryProcedureRepository
                                .solicitarRecuperacion(
                                                usuarioLogin,
                                                origen,
                                                tokenHash,
                                                fechaExpiracion,
                                                limitarTexto(
                                                                ipSolicitud,
                                                                45),
                                                limitarTexto(
                                                                userAgent,
                                                                500));

                /*
                 * La respuesta publica no debe revelar si:
                 *
                 * - el usuario no existe;
                 * - no pertenece al canal solicitado;
                 * - esta inhabilitado;
                 * - no posee un correo valido.
                 */
                if (resultado.isEmpty()) {
                        return Optional.empty();
                }

                RecoveryRequestResult recuperacion = resultado.get();

                String correo = recuperacion.correo();

                if (correo == null
                                || correo.isBlank()) {

                        throw new IllegalStateException(
                                        "No se encontro un correo verificado para el usuario");
                }

                String baseUrl = resolverBaseUrl(origen);

                String urlRecuperacion = UriComponentsBuilder
                                .fromUriString(baseUrl)
                                .queryParam(
                                                "token",
                                                tokenReal)
                                .build()
                                .toUriString();

                long minutosExpiracion = Math.max(
                                1,
                                (passwordResetExpiration + 59)
                                                / 60);

                /*
                 * EmailService recibe la URL completa.
                 * El token real no se registra en logs ni
                 * se almacena directamente en BD.
                 */
                emailService
                                .enviarRecuperacionContrasena(
                                                correo,
                                                urlRecuperacion,
                                                minutosExpiracion);

                /*
                 * NO registrar auditoria aqui.
                 *
                 * Esta transaccion puede mantener bloqueos
                 * sobre seg_usuarios. AuditService utiliza
                 * REQUIRES_NEW y aud_eventos posee una
                 * relacion con el usuario, lo que puede
                 * producir espera circular hasta el
                 * statement_timeout.
                 *
                 * El controlador registra la auditoria una
                 * vez terminado este metodo y confirmado
                 * este COMMIT.
                 */
                return Optional.of(recuperacion);
        }

        private String resolverBaseUrl(
                        String origen) {

                return "BACKOFFICE".equals(origen)
                                ? backofficePasswordResetUrl
                                : portalPasswordResetUrl;
        }
}