package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.PasswordResetToken;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.PasswordResetTokenRepository;
import monolithe.auth_service.repository.PersonContactRepository;
import monolithe.auth_service.repository.UserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import monolithe.auth_service.exception.InvalidTokenException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

        private static final int TOKEN_BYTES = 32;

        private final SecureRandom secureRandom = new SecureRandom();

        private final PasswordResetTokenRepository passwordResetTokenRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final PasswordPolicyService passwordPolicyService;
        private final RefreshTokenService refreshTokenService;
        private final PersonContactRepository personContactRepository;
        private final EmailService emailService;
        private final AuditService auditService;

        @Value("${security.auth.password-reset-expiration}")
        private long passwordResetExpiration;

        @Transactional
        public String crearTokenRecuperacion(
                        Long idUsuario,
                        String ipSolicitud,
                        String userAgent) {

                User usuario = userRepository.findById(idUsuario)
                                .orElseThrow(() -> new IllegalStateException(
                                                "Usuario no encontrado"));

                LocalDateTime ahora = LocalDateTime.now();

                /*
                 * Invalidamos tokens anteriores que todavía
                 * no habían sido utilizados.
                 */
                var tokensAnteriores = passwordResetTokenRepository
                                .findByUsuarioIdUsuarioAndFechaUsoIsNull(
                                                idUsuario);

                tokensAnteriores.forEach(token -> token.setFechaUso(ahora));

                passwordResetTokenRepository.saveAll(
                                tokensAnteriores);

                String tokenReal = generarTokenSeguro();

                String tokenHash = calcularSha256(tokenReal);

                PasswordResetToken token = new PasswordResetToken();

                token.setUsuario(usuario);
                token.setTokenHash(tokenHash);

                token.setFechaExpiracion(
                                ahora.plusSeconds(
                                                passwordResetExpiration));

                token.setIpSolicitud(
                                limitarTexto(ipSolicitud, 45));

                token.setUserAgent(
                                limitarTexto(userAgent, 500));

                passwordResetTokenRepository.save(token);

                /*
                 * Solo devolvemos el token real una vez.
                 * La BD conserva únicamente su SHA-256.
                 */
                return tokenReal;
        }

        public String calcularSha256(String token) {

                try {

                        MessageDigest digest = MessageDigest.getInstance("SHA-256");

                        byte[] hash = digest.digest(
                                        token.getBytes(StandardCharsets.UTF_8));

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
                                : texto.substring(0, longitudMaxima);
        }

        @Transactional
        public Long restablecerContrasena(
                        String tokenReal,
                        String nuevaContrasena,
                        String confirmarContrasena) {

                if (!nuevaContrasena.equals(confirmarContrasena)) {
                        throw new IllegalArgumentException(
                                        "La nueva contraseña y su confirmación no coinciden");
                }

                String tokenHash = calcularSha256(tokenReal);

                PasswordResetToken token = passwordResetTokenRepository
                                .findByTokenHashAndFechaUsoIsNull(tokenHash)
                                .orElseThrow(() -> new InvalidTokenException(
                                                "Token de recuperación inválido o ya utilizado"));

                LocalDateTime ahora = LocalDateTime.now();

                if (!token.getFechaExpiracion().isAfter(ahora)) {
                        throw new InvalidTokenException(
                                        "El token de recuperación ha expirado");
                }

                User usuario = token.getUsuario();

                passwordPolicyService.validar(
                                nuevaContrasena);

                if (passwordEncoder.matches(
                                nuevaContrasena,
                                usuario.getPasswordHash())) {

                        throw new IllegalArgumentException(
                                        "La nueva contraseña debe ser diferente a la contraseña anterior");
                }

                usuario.setPasswordHash(
                                passwordEncoder.encode(
                                                nuevaContrasena));

                usuario.setRequiereCambioPassword(false);
                usuario.setPasswordActualizadoEn(ahora);

                /*
                 * Si el bloqueo provenía de intentos fallidos,
                 * recuperamos también el acceso normal.
                 */
                usuario.setIntentosFallidos(0);
                usuario.setBloqueadoHasta(null);

                userRepository.save(usuario);

                /*
                 * El token queda consumido y no puede volver
                 * a utilizarse.
                 */
                token.setFechaUso(ahora);

                passwordResetTokenRepository.save(token);

                /*
                 * Una recuperación de contraseña invalida
                 * todas las sesiones existentes.
                 */
                refreshTokenService.revocarTodasLasSesiones(
                                usuario.getIdUsuario(),
                                "RECUPERACION_PASSWORD");

                return usuario.getIdUsuario();
        }

        @Transactional
        public void solicitarRecuperacion(
                        String usuarioLogin,
                        String ipSolicitud,
                        String userAgent) {

                User usuario = userRepository
                                .findByUsuarioLogin(usuarioLogin)
                                .orElse(null);

                if (usuario == null) {
                        return;
                }

                String correo = personContactRepository
                                .buscarEmailPrincipalVerificado(
                                                usuario.getIdPersona())
                                .orElse(null);

                if (correo == null) {
                        return;
                }

                String tokenRecuperacion = crearTokenRecuperacion(
                                usuario.getIdUsuario(),
                                ipSolicitud,
                                userAgent);

                emailService.enviarRecuperacionContrasena(
                                correo,
                                tokenRecuperacion);

                auditService.registrar(
                                usuario.getIdUsuario(),
                                "RECUPERACION_SOLICITADA",
                                "EXITOSO",
                                "Se solicitó recuperación de contraseña",
                                ipSolicitud,
                                userAgent,
                                "POST",
                                "/api/auth/forgot-password");
        }
}