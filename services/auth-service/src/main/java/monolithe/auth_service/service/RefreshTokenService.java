package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.entity.Estado;
import monolithe.auth_service.entity.Session;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.SessionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.RefreshTokenRotation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
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
        private final JdbcTemplate jdbcTemplate;

        @Value("${security.jwt.refresh-token-expiration}")
        private long refreshTokenExpiration;

        @Transactional
        public String crearSesion(
                        Long idUsuario,
                        String ipOrigen,
                        String userAgent) {

                User usuario = userRepository.getReferenceById(idUsuario);

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

                sesionActual.setUltimaActividad(ahora);
                sesionActual.setFechaRevocacion(ahora);
                sesionActual.setMotivoRevocacion(
                                "ROTACION_REFRESH_TOKEN");

                sessionRepository.save(sesionActual);

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

                validarAccesoAdministrativo(usuario, ahora);
                validarAccesoLaboral(usuario.getIdPersona());
        }

        private void validarAccesoAdministrativo(
                        User usuario,
                        LocalDateTime ahora) {

                validarEstadoUsuario(usuario.getEstadoUsuario());
                validarBloqueoUsuario(usuario.getBloqueadoHasta(), ahora);
        }

        private void validarEstadoUsuario(Estado estado) {
                if (estado == null) {
                        throw new IllegalArgumentException("El usuario no tiene un estado válido");
                }
                if (!"ACTIVO".equals(estado.getCodigo()) || !Boolean.TRUE.equals(estado.getActivo())) {
                        throw new IllegalArgumentException("Usuario inactivo");
                }
                if (!Boolean.TRUE.equals(estado.getPermiteAcceso())) {
                        throw new IllegalArgumentException("El usuario no tiene permitido el acceso");
                }
        }

        private void validarBloqueoUsuario(LocalDateTime bloqueadoHasta, LocalDateTime ahora) {
                if (bloqueadoHasta != null && bloqueadoHasta.isAfter(ahora)) {
                        throw new IllegalArgumentException("Usuario bloqueado temporalmente");
                }
        }

        private void validarAccesoLaboral(Long idPersona) {
                if (idPersona == null) {
                        throw new IllegalArgumentException("Usuario sin persona asociada");
                }
                try {
                        String sql = "SELECT public.fn_seguridad_acceso_laboral_permitido(?)";
                        Boolean permitido = jdbcTemplate.queryForObject(sql, Boolean.class, idPersona);
                        if (!Boolean.TRUE.equals(permitido)) {
                                throw new IllegalArgumentException("Acceso laboral no permitido");
                        }
                } catch (IllegalArgumentException e) {
                        throw e;
                } catch (Exception e) {
                        throw new IllegalArgumentException("No fue posible validar el acceso laboral", e);
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