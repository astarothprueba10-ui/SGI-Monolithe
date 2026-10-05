package monolithe.auth_service.service;

import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.exception.AccountTemporarilyLockedException;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.JwtService;
import monolithe.auth_service.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AuthenticationServiceTest {

    private AuthenticationManager authenticationManager;
    private JwtService jwtService;
    private RefreshTokenService refreshTokenService;
    private CustomUserDetailsService customUserDetailsService;
    private LoginSecurityService loginSecurityService;
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordPolicyService passwordPolicyService;
    private AuditService auditService;

    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        jwtService = mock(JwtService.class);
        refreshTokenService = mock(RefreshTokenService.class);
        customUserDetailsService = mock(CustomUserDetailsService.class);
        loginSecurityService = mock(LoginSecurityService.class);
        userRepository = mock(UserRepository.class);
        passwordEncoder = mock(PasswordEncoder.class);
        passwordPolicyService = mock(PasswordPolicyService.class);
        auditService = mock(AuditService.class);

        authenticationService = new AuthenticationService(
                authenticationManager,
                jwtService,
                refreshTokenService,
                customUserDetailsService,
                loginSecurityService,
                userRepository,
                passwordEncoder,
                passwordPolicyService,
                auditService
        );
    }

    @Test
    void intentoFallidoNormalNoBloqueaYDevuelveBadCredentials() {
        LoginRequest solicitud = crearSolicitud("usuario1", "claveIncorrecta");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        when(userRepository.findByUsuarioLogin("usuario1"))
                .thenReturn(Optional.of(crearUsuario(1L, "usuario1")));
        when(loginSecurityService.registrarIntentoFallido("usuario1"))
                .thenReturn(null);

        assertThrows(BadCredentialsException.class, () ->
                authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit")
        );

        verify(auditService).registrar(
                eq(1L),
                eq("LOGIN_FALLIDO"),
                eq("FALLIDO"),
                anyString(),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("POST"),
                eq("/api/auth/login")
        );
        verify(auditService, never()).registrar(
                anyLong(),
                eq("USUARIO_BLOQUEADO"),
                anyString(),
                anyString(),
                anyString(),
                anyString(),
                anyString(),
                anyString()
        );
    }

    @Test
    void intentoQueAlcanzaElMaximoGeneraBloqueoTemporalConMinutos() {
        LoginRequest solicitud = crearSolicitud("usuario1", "claveIncorrecta");
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));
        when(userRepository.findByUsuarioLogin("usuario1"))
                .thenReturn(Optional.of(crearUsuario(1L, "usuario1")));
        when(loginSecurityService.registrarIntentoFallido("usuario1"))
                .thenReturn(1L);
        when(loginSecurityService.getLockDurationMinutes())
                .thenReturn(15L);

        AccountTemporarilyLockedException ex = assertThrows(
                AccountTemporarilyLockedException.class,
                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit")
        );

        assertEquals(15L, ex.getMinutosRestantes());
        assertTrue(ex.getMinutosRestantes() > 0);
        assertEquals(
                "Usuario bloqueado temporalmente por 15 minutos debido a múltiples intentos fallidos.",
                ex.getMessage()
        );

        verify(auditService).registrar(
                eq(1L),
                eq("LOGIN_FALLIDO"),
                eq("FALLIDO"),
                anyString(),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("POST"),
                eq("/api/auth/login")
        );
        verify(auditService).registrar(
                eq(1L),
                eq("USUARIO_BLOQUEADO"),
                eq("EXITOSO"),
                anyString(),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("POST"),
                eq("/api/auth/login")
        );
    }

    @Test
    void cuentaYaBloqueadaDevuelveBloqueoTemporalConTiempoRestante() {
        LoginRequest solicitud = crearSolicitud("usuarioBloqueado", "cualquierClave");
        User usuario = crearUsuario(2L, "usuarioBloqueado");
        usuario.setBloqueadoHasta(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10));

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new LockedException("Locked"));
        when(userRepository.findByUsuarioLogin("usuarioBloqueado"))
                .thenReturn(Optional.of(usuario));
        when(loginSecurityService.calcularMinutosRestantes(any()))
                .thenReturn(10L);

        AccountTemporarilyLockedException ex = assertThrows(
                AccountTemporarilyLockedException.class,
                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit")
        );

        assertEquals(10L, ex.getMinutosRestantes());
        assertTrue(ex.getMinutosRestantes() > 0);
        assertEquals(
                "Usuario bloqueado temporalmente por 10 minutos debido a múltiples intentos fallidos.",
                ex.getMessage()
        );

        verify(auditService).registrar(
                eq(2L),
                eq("LOGIN_DENEGADO"),
                eq("DENEGADO"),
                anyString(),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("POST"),
                eq("/api/auth/login")
        );
    }

    @Test
    void debeAutenticarExitosamenteCuandoCredencialesSonCorrectas() {
        LoginRequest solicitud = crearSolicitud("usuarioOk", "claveValida");
        UserPrincipal principal = new UserPrincipal(
                3L,
                "usuarioOk",
                "hash",
                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")),
                true,
                true,
                false
        );
        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(jwtService.generarAccessToken(principal)).thenReturn("mockJwt");
        when(refreshTokenService.crearSesion(eq(3L), anyString(), anyString())).thenReturn("mockRefresh");

        LoginResponse resp = authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit");

        assertNotNull(resp);
        assertEquals("mockJwt", resp.getAccessToken());
        assertEquals("mockRefresh", resp.getRefreshToken());
        verify(loginSecurityService).registrarAccesoExitoso(3L);
        verify(auditService).registrar(
                eq(3L),
                eq("LOGIN_EXITOSO"),
                eq("EXITOSO"),
                anyString(),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("POST"),
                eq("/api/auth/login")
        );
    }

    private LoginRequest crearSolicitud(String usuario, String contrasena) {
        LoginRequest req = new LoginRequest();
        req.setUsuario(usuario);
        req.setContrasena(contrasena);
        return req;
    }

    private User crearUsuario(Long id, String login) {
        User u = new User();
        u.setIdUsuario(id);
        u.setUsuarioLogin(login);
        u.setIntentosFallidos(0);
        return u;
    }
}
