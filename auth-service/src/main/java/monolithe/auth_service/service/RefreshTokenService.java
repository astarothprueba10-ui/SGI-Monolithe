package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.Session;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.SessionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.RefreshTokenRotation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import monolithe.auth_service.exception.InvalidTokenException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

        private static final int REFRESH_TOKEN_BYTES = 32;

        private final SecureRandom secureRandom = new SecureRandom();

        private final SessionRepository sessionRepository;
        private final UserRepository userRepository;

        @Value("${security.jwt.refresh-token-expiration}")
        private long refreshTokenExpiration;

        @Transactional
        public String crearSesion(
                        Long idUsuario,
                        String ipOrigen,
                        String userAgent) {

                User usuario = userRepository.findById(idUsuario)
                                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));

                return crearNuevaSesion(
                                usuario,
                                ipOrigen,
                                userAgent);
        }

        @Transactional
        public RefreshTokenRotation rotarRefreshToken(
                        String refreshTokenActual,
                        String ipOrigen,
                        String userAgent) {

                String refreshTokenHash = calcularSha256(refreshTokenActual);

                Session sesionActual = sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                refreshTokenHash)
                                .orElseThrow(() -> new InvalidTokenException(
                                                "Refresh token inválido"));

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                if (!sesionActual.getFechaExpiracion().isAfter(ahora)) {
                        throw new InvalidTokenException(
                                        "Refresh token expirado");
                }

                User usuario = sesionActual.getUsuario();

                validarUsuario(usuario, ahora);

                /*
                 * El token actual deja de ser válido.
                 */
                sesionActual.setUltimaActividad(ahora);
                sesionActual.setFechaRevocacion(ahora);
                sesionActual.setMotivoRevocacion(
                                "ROTACION_REFRESH_TOKEN");

                sessionRepository.save(sesionActual);

                /*
                 * Se genera una sesión nueva con un
                 * Refresh Token completamente diferente.
                 */
                String nuevoRefreshToken = crearNuevaSesion(
                                usuario,
                                ipOrigen,
                                userAgent);

                return new RefreshTokenRotation(
                                usuario.getIdUsuario(),
                                usuario.getUsuarioLogin(),
                                nuevoRefreshToken);
        }

        public String calcularSha256(String token) {

                try {

                        MessageDigest digest = MessageDigest.getInstance("SHA-256");

                        byte[] hash = digest.digest(
                                        token.getBytes(StandardCharsets.UTF_8));

                        return HexFormat.of().formatHex(hash);

                } catch (NoSuchAlgorithmException e) {

                        throw new IllegalStateException(
                                        "No fue posible calcular SHA-256",
                                        e);
                }
        }

        private String crearNuevaSesion(
                        User usuario,
                        String ipOrigen,
                        String userAgent) {

                String refreshToken = generarTokenSeguro();

                String refreshTokenHash = calcularSha256(refreshToken);

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                Session sesion = new Session();

                sesion.setUsuario(usuario);
                sesion.setRefreshTokenHash(refreshTokenHash);
                sesion.setIpOrigen(limitarTexto(ipOrigen, 45));
                sesion.setUserAgent(limitarTexto(userAgent, 500));
                sesion.setFechaInicio(ahora);
                sesion.setUltimaActividad(ahora);
                sesion.setFechaExpiracion(
                                ahora.plusSeconds(refreshTokenExpiration));

                sessionRepository.save(sesion);

                return refreshToken;
        }

        private void validarUsuario(
                        User usuario,
                        LocalDateTime ahora) {

                if (usuario.getEstadoUsuario() == null
                                || !"USUARIO".equals(
                                                usuario.getEstadoUsuario().getEntidad())) {
                        throw new IllegalArgumentException(
                                        "El usuario no tiene un estado válido");
                }

                if (!Boolean.TRUE.equals(
                                usuario.getEstadoUsuario().getActivo())) {
                        throw new IllegalArgumentException(
                                        "Usuario inactivo");
                }

                if (!Boolean.TRUE.equals(
                                usuario.getEstadoUsuario().getPermiteAcceso())) {
                        throw new IllegalArgumentException(
                                        "El usuario no tiene permitido el acceso");
                }

                if (usuario.getBloqueadoHasta() != null
                                && usuario.getBloqueadoHasta().isAfter(ahora)) {

                        throw new IllegalArgumentException(
                                        "Usuario bloqueado temporalmente");
                }
        }

        private String generarTokenSeguro() {

                byte[] bytes = new byte[REFRESH_TOKEN_BYTES];

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
        public Long revocarSesion(String refreshToken) {

                String refreshTokenHash = calcularSha256(refreshToken);

                Session sesion = sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                refreshTokenHash)
                                .orElse(null);

                if (sesion == null) {
                        return null;
                }

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                sesion.setUltimaActividad(ahora);
                sesion.setFechaRevocacion(ahora);
                sesion.setMotivoRevocacion("LOGOUT");

                sessionRepository.save(sesion);

                return sesion.getUsuario().getIdUsuario();
        }

        @Transactional
        public void revocarTodasLasSesiones(
                        Long idUsuario,
                        String motivo) {

                LocalDateTime ahora = LocalDateTime.now(ZoneOffset.UTC);

                var sesionesActivas = sessionRepository
                                .findByUsuarioIdUsuarioAndFechaRevocacionIsNull(
                                                idUsuario);

                sesionesActivas.forEach(sesion -> {
                        sesion.setUltimaActividad(ahora);
                        sesion.setFechaRevocacion(ahora);
                        sesion.setMotivoRevocacion(motivo);
                });

                sessionRepository.saveAll(sesionesActivas);
        }
}