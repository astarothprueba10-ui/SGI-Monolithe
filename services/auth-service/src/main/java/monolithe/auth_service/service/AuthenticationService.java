package monolithe.auth_service.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.dto.AuthenticationContext;
import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.dto.MfaChallenge;
import monolithe.auth_service.dto.MfaCodeRequest;
import monolithe.auth_service.dto.MfaEnrollment;
import monolithe.auth_service.exception.MfaException;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.exception.AccountAccessRestrictedException;
import monolithe.auth_service.exception.AccountTemporarilyLockedException;
import monolithe.auth_service.exception.UserDisabledException;
import monolithe.auth_service.repository.AuthenticationContextRepository;
import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.JwtService;
import monolithe.auth_service.security.UserPrincipal;
import monolithe.auth_service.dto.RefreshTokenRequest;
import monolithe.auth_service.dto.RefreshTokenResponse;
import monolithe.auth_service.security.RefreshTokenRotation;
import monolithe.auth_service.dto.ChangePasswordRequest;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.DocumentLoginProcedureRepository;
import monolithe.auth_service.repository.UserVisualIdentityRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthenticationService {

        private final AuthenticationManager authenticationManager;
        private final JwtService jwtService;
        private final RefreshTokenService refreshTokenService;
        private final CustomUserDetailsService customUserDetailsService;
        private final AuthenticationContextRepository authenticationContextRepository;
        private final LoginSecurityService loginSecurityService;
        private final DocumentLoginProcedureRepository documentLoginProcedureRepository;
        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final PasswordPolicyService passwordPolicyService;
        private final AuditService auditService;
        private final UserVisualIdentityRepository userVisualIdentityRepository;
        private final MfaLoginService mfaLoginService;

        @Value("${security.jwt.access-token-expiration}")
        private long accessTokenExpiration;

        /** Comprueba el primer factor sin emitir una sesión. */
        public MfaChallenge autenticar(LoginRequest solicitud, String ipOrigen, String userAgent) {
                String login = resolverLoginEfectivo(solicitud, ipOrigen, userAgent);
                var principal = autenticarContrasena(login, solicitud.getContrasena(), ipOrigen, userAgent);
                return mfaLoginService.start(principal, solicitud.getPortal());
        }

        /** Prepara la vinculación con una prueba de activación o recuperación válida. */
        public MfaEnrollment prepararMfa(MfaCodeRequest solicitud) {
                return mfaLoginService.prepare(solicitud);
        }

        /** Consume el reto y emite tokens en la misma transacción. */
        @Transactional(noRollbackFor = MfaException.class)
        public LoginResponse confirmarMfa(MfaCodeRequest solicitud, String ip, String agent) {
                var verified = mfaLoginService.verify(solicitud);
                UserPrincipal principal = verified.principal();
                if (verified.factorChanged()) {
                        refreshTokenService.revocarTodasLasSesiones(principal.getIdUsuario(), "VINCULACION_MFA");
                        principal = (UserPrincipal) customUserDetailsService.loadUserByUsername(principal.getUsername());
                }
                return crearSesionVerificada(principal, ip, agent);
        }

        private UserPrincipal autenticarContrasena(String login, String password, String ip, String agent) {
                try {
                        Authentication authentication = authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(login, password));
                        return (UserPrincipal) authentication.getPrincipal();
                } catch (LockedException e) {
                        throw procesarCuentaBloqueada(login, ip, agent);
                } catch (DisabledException e) {
                        throw procesarRestriccionAcceso(login, ip, agent, e);
                } catch (BadCredentialsException e) {
                        throw procesarCredencialesInvalidas(login, ip, agent, e);
                }
        }

        private LoginResponse crearSesionVerificada(UserPrincipal principal, String ip, String agent) {
                Long user = principal.getIdUsuario();
                loginSecurityService.registrarAccesoExitoso(user);
                String access = jwtService.generarAccessToken(principal);
                String refresh = refreshTokenService.crearSesion(user, ip, agent);
                var identity = userVisualIdentityRepository.obtenerPorIdUsuario(user);
                List<String> authorities = principal.getAuthorities().stream()
                                .map(authority -> authority.getAuthority()).toList();
                return new LoginResponse(user, principal.getUsername(), identity.nombreMostrar(),
                                identity.iniciales(), authorities, principal.isRequiereCambioPassword(),
                                access, refresh, "Bearer", accessTokenExpiration, "Autenticación exitosa");
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

                if (!Objects.equals(rotacion.versionSesiones(), principal.getVersionSesiones())) {
                        throw new InvalidTokenException("Sesión revocada");
                }
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
                usuario.setPasswordTemporalExpiraEn(null);
                usuario.setPasswordActualizadoEn(
                                LocalDateTime.now(ZoneOffset.UTC));

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

        private AccountTemporarilyLockedException procesarCuentaBloqueada(
                        String login,
                        String ipOrigen,
                        String userAgent) {

                AuthenticationContext contexto = authenticationContextRepository
                                .obtenerPorLogin(login)
                                .orElse(null);

                Long idUsuario = contexto != null
                                ? contexto.idUsuario()
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

                LocalDateTime bloqueadoHasta = contexto != null
                                ? contexto.bloqueadoHasta()
                                : null;
                long minutos = loginSecurityService.calcularMinutosRestantes(bloqueadoHasta);

                return new AccountTemporarilyLockedException(minutos);
        }

        private RuntimeException procesarCredencialesInvalidas(
                        String login,
                        String ipOrigen,
                        String userAgent,
                        BadCredentialsException excepcionOriginal) {

                AuthenticationContext contexto = authenticationContextRepository
                                .obtenerPorLogin(login)
                                .orElse(null);

                Long idUsuario = contexto != null
                                ? contexto.idUsuario()
                                : null;

                Long idBloqueado = loginSecurityService.registrarIntentoFallido(login);

                auditService.registrar(
                                idUsuario,
                                "LOGIN_FALLIDO",
                                "FALLIDO",
                                "Intento de inicio de sesión con credenciales inválidas",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/login");

                if (idBloqueado != null) {
                        auditService.registrar(
                                        idBloqueado,
                                        "USUARIO_BLOQUEADO",
                                        "EXITOSO",
                                        "El usuario fue bloqueado temporalmente por exceder los intentos fallidos de inicio de sesión",
                                        ipOrigen,
                                        userAgent,
                                        "POST",
                                        "/api/auth/login");

                        return new AccountTemporarilyLockedException(loginSecurityService.getLockDurationMinutes());
                }

                return excepcionOriginal;
        }

        private RuntimeException procesarRestriccionAcceso(
                        String login,
                        String ipOrigen,
                        String userAgent,
                        DisabledException excepcionOriginal) {

                Optional<AuthenticationContext> contextoOpt = authenticationContextRepository.obtenerPorLogin(login);

                if (contextoOpt.isEmpty()) {
                        return excepcionOriginal;
                }

                AuthenticationContext contexto = contextoOpt.get();

                return !contexto.estadoActivo()
                                ? procesarCuentaInactiva(contexto, ipOrigen, userAgent)
                                : procesarAccesoNoPermitido(contexto, ipOrigen, userAgent);
        }

        private UserDisabledException procesarCuentaInactiva(
                        AuthenticationContext contexto,
                        String ipOrigen,
                        String userAgent) {

                auditService.registrar(
                                contexto.idUsuario(),
                                "LOGIN_DENEGADO",
                                "DENEGADO",
                                "Inicio de sesión denegado porque la cuenta está desactivada",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/login");

                return new UserDisabledException("El usuario se encuentra desactivado.");
        }

        private AccountAccessRestrictedException procesarAccesoNoPermitido(
                        AuthenticationContext contexto,
                        String ipOrigen,
                        String userAgent) {

                String mensaje = contexto.requiereCambioPassword()
                                ? "La contraseña temporal ha expirado. Solicita una nueva activación o recuperación de contraseña."
                                : "El acceso a la cuenta no está permitido en este momento.";

                auditService.registrar(
                                contexto.idUsuario(),
                                "LOGIN_DENEGADO",
                                "DENEGADO",
                                "Inicio de sesión denegado: " + mensaje,
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/login");

                return new AccountAccessRestrictedException(mensaje);
        }

        private String resolverLoginEfectivo(
                        LoginRequest solicitud,
                        String ipOrigen,
                        String userAgent) {

                String tipoDocumento = solicitud.getTipoDocumento();

                if (tipoDocumento == null || tipoDocumento.isBlank()) {
                        throw rechazarResolucionDocumental(ipOrigen, userAgent);
                }

                log.debug("Resolviendo login por documento tipo={}", tipoDocumento);

                return documentLoginProcedureRepository
                                .resolverLogin(tipoDocumento, solicitud.getUsuario())
                                .orElseThrow(() -> rechazarResolucionDocumental(ipOrigen, userAgent));
        }

        private BadCredentialsException rechazarResolucionDocumental(
                        String ipOrigen,
                        String userAgent) {

                auditService.registrar(
                                null,
                                "LOGIN_FALLIDO",
                                "FALLIDO",
                                "Documento no encontrado o sin cuenta asociada",
                                ipOrigen,
                                userAgent,
                                "POST",
                                "/api/auth/login");

                return new BadCredentialsException("No fue posible autenticar al usuario");
        }
}
