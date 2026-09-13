package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.JwtService;
import monolithe.auth_service.security.UserPrincipal;
import monolithe.auth_service.dto.RefreshTokenRequest;
import monolithe.auth_service.dto.RefreshTokenResponse;
import monolithe.auth_service.security.RefreshTokenRotation;
import monolithe.auth_service.dto.ChangePasswordRequest;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;
        private final RefreshTokenService refreshTokenService;
        private final CustomUserDetailsService customUserDetailsService;
        private final LoginSecurityService loginSecurityService;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final PasswordPolicyService passwordPolicyService;
        private final AuditService auditService;

        @Value("${security.jwt.access-token-expiration}")
        private long accessTokenExpiration;

        public LoginResponse autenticar(
                        LoginRequest solicitud,
                        String ipOrigen,
                        String userAgent) {

                Authentication authentication;

                try {

                        authentication = authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(
                                                        solicitud.getUsuario(),
                                                        solicitud.getContrasena()));

                } catch (LockedException e) {

                        User usuarioBloqueado = userRepository
                                        .findByUsuarioLogin(solicitud.getUsuario())
                                        .orElse(null);

                        Long idUsuario = usuarioBloqueado != null
                                        ? usuarioBloqueado.getIdUsuario()
                                        : null;

                        auditService.registrar(
                                        idUsuario,
                                        "LOGIN_DENEGADO",
                                        "DENEGADO",
                                        "Inicio de sesión denegado porque la cuenta está bloqueada temporalmente",
                                        ipOrigen,
                                        userAgent,
                                        "POST",
                                        "/api/auth/login");

                        throw e;

                } catch (BadCredentialsException e) {
                        User usuarioIntentado = userRepository
                                        .findByUsuarioLogin(solicitud.getUsuario())
                                        .orElse(null);

                        Long idUsuarioIntentado = usuarioIntentado != null
                                        ? usuarioIntentado.getIdUsuario()
                                        : null;

                        Long idUsuarioBloqueado = loginSecurityService.registrarIntentoFallido(
                                        solicitud.getUsuario());

                        auditService.registrar(
                                        idUsuarioIntentado,
                                        "LOGIN_FALLIDO",
                                        "FALLIDO",
                                        "Intento de inicio de sesión con credenciales inválidas para el usuario: "
                                                        + solicitud.getUsuario(),
                                        ipOrigen,
                                        userAgent,
                                        "POST",
                                        "/api/auth/login");

                        if (idUsuarioBloqueado != null) {

                                auditService.registrar(
                                                idUsuarioBloqueado,
                                                "USUARIO_BLOQUEADO",
                                                "EXITOSO",
                                                "El usuario fue bloqueado temporalmente por exceder los intentos fallidos de inicio de sesión",
                                                ipOrigen,
                                                userAgent,
                                                "POST",
                                                "/api/auth/login");
                        }

                        throw e;
                }

                UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();

                loginSecurityService.registrarAccesoExitoso(
                                principal.getIdUsuario());

                String accessToken = jwtService.generarAccessToken(principal);

                String refreshToken = refreshTokenService.crearSesion(
                                principal.getIdUsuario(),
                                ipOrigen,
                                userAgent);

                auditService.registrar(
                                principal.getIdUsuario(),
                                "LOGIN_EXITOSO",
                                "EXITOSO",
                                "Inicio de sesión exitoso",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/login");

                List<String> autoridades = principal.getAuthorities()
                                .stream()
                                .map(authority -> authority.getAuthority())
                                .toList();

                return new LoginResponse(
                                principal.getIdUsuario(),
                                principal.getUsername(),
                                autoridades,
                                principal.isRequiereCambioPassword(),
                                accessToken,
                                refreshToken,
                                "Bearer",
                                accessTokenExpiration,
                                "Autenticación exitosa");
        }

        public RefreshTokenResponse renovarToken(
                        RefreshTokenRequest solicitud,
                        String ipOrigen,
                        String userAgent) {

                RefreshTokenRotation rotacion = refreshTokenService.rotarRefreshToken(
                                solicitud.getRefreshToken(),
                                ipOrigen,
                                userAgent);

                UserPrincipal principal = (UserPrincipal) customUserDetailsService
                                .loadUserByUsername(
                                                rotacion.usuarioLogin());

                String nuevoAccessToken = jwtService.generarAccessToken(principal);

                auditService.registrar(
                                rotacion.idUsuario(),
                                "REFRESH_TOKEN_ROTADO",
                                "EXITOSO",
                                "Se renovó la sesión mediante refresh token",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/refresh");
                return new RefreshTokenResponse(
                                nuevoAccessToken,
                                rotacion.refreshToken(),
                                "Bearer",
                                accessTokenExpiration,
                                "Token renovado correctamente");
        }

        public Long cerrarSesion(
                        RefreshTokenRequest solicitud) {

                return refreshTokenService.revocarSesion(
                                solicitud.getRefreshToken());
        }

        @Transactional
        public void cambiarContrasena(
                        Long idUsuario,
                        ChangePasswordRequest solicitud,
                        String ipOrigen,
                        String userAgent) {

                User usuario = userRepository.findById(idUsuario)
                                .orElseThrow(() -> new IllegalStateException(
                                                "Usuario no encontrado"));

                if (!passwordEncoder.matches(
                                solicitud.getContrasenaActual(),
                                usuario.getPasswordHash())) {

                        auditService.registrar(
                                        idUsuario,
                                        "CAMBIO_PASSWORD_FALLIDO",
                                        "FALLIDO",
                                        "Intento de cambio de contraseña con contraseña actual incorrecta",
                                        ipOrigen,
                                        userAgent,
                                        "POST",
                                        "/api/auth/change-password");

                        throw new IllegalArgumentException(
                                        "La contraseña actual es incorrecta");
                }

                if (!solicitud.getNuevaContrasena()
                                .equals(solicitud.getConfirmarContrasena())) {

                        throw new IllegalArgumentException(
                                        "La nueva contraseña y su confirmación no coinciden");
                }

                if (passwordEncoder.matches(
                                solicitud.getNuevaContrasena(),
                                usuario.getPasswordHash())) {

                        throw new IllegalArgumentException(
                                        "La nueva contraseña debe ser diferente a la contraseña actual");
                }

                passwordPolicyService.validar(
                                solicitud.getNuevaContrasena());

                usuario.setPasswordHash(
                                passwordEncoder.encode(
                                                solicitud.getNuevaContrasena()));

                usuario.setRequiereCambioPassword(false);
                usuario.setPasswordActualizadoEn(
                                LocalDateTime.now());

                userRepository.save(usuario);

                refreshTokenService.revocarTodasLasSesiones(
                                idUsuario,
                                "CAMBIO_PASSWORD");
        }

        public void cerrarTodasLasSesiones(
                        Long idUsuario) {

                refreshTokenService.revocarTodasLasSesiones(
                                idUsuario,
                                "LOGOUT_TODAS_SESIONES");
        }
}