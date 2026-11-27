package monolithe.auth_service.service;

import monolithe.auth_service.dto.AuthenticationContext;
import monolithe.auth_service.dto.LoginRequest;
import monolithe.auth_service.dto.LoginResponse;
import monolithe.auth_service.dto.MfaChallenge;
import monolithe.auth_service.dto.MfaCodeRequest;
import monolithe.auth_service.dto.MfaPortal;
import monolithe.auth_service.dto.RefreshTokenRequest;
import monolithe.auth_service.exception.MfaException;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.security.RefreshTokenRotation;
import monolithe.auth_service.exception.AccountAccessRestrictedException;
import monolithe.auth_service.exception.AccountTemporarilyLockedException;
import monolithe.auth_service.exception.UserDisabledException;
import monolithe.auth_service.repository.AuthenticationContextRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.CustomUserDetailsService;
import monolithe.auth_service.security.JwtService;
import monolithe.auth_service.security.UserPrincipal;
import monolithe.auth_service.repository.DocumentLoginProcedureRepository;
import monolithe.auth_service.repository.UserVisualIdentityRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

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
        private AuthenticationContextRepository authenticationContextRepository;
        private LoginSecurityService loginSecurityService;
        private DocumentLoginProcedureRepository documentLoginProcedureRepository;
        private UserRepository userRepository;
        private PasswordEncoder passwordEncoder;
        private PasswordPolicyService passwordPolicyService;
        private AuditService auditService;
        private UserVisualIdentityRepository userVisualIdentityRepository;

        private AuthenticationService authenticationService;
        private MfaLoginService mfaLoginService;

        private LoginDeviceService loginDevices;
        private final MfaChallenge reto = new MfaChallenge("A".repeat(43), MfaChallenge.Paso.CODIGO, 300);

        @BeforeEach
        void setUp() {
                authenticationManager = mock(AuthenticationManager.class);
                jwtService = mock(JwtService.class);
                refreshTokenService = mock(RefreshTokenService.class);
                customUserDetailsService = mock(CustomUserDetailsService.class);
                authenticationContextRepository = mock(AuthenticationContextRepository.class);
                loginSecurityService = mock(LoginSecurityService.class);
                documentLoginProcedureRepository = mock(DocumentLoginProcedureRepository.class);
                userRepository = mock(UserRepository.class);
                passwordEncoder = mock(PasswordEncoder.class);
                passwordPolicyService = mock(PasswordPolicyService.class);
                auditService = mock(AuditService.class);
                userVisualIdentityRepository = mock(UserVisualIdentityRepository.class);

                when(userVisualIdentityRepository.obtenerPorIdUsuario(anyLong()))
                                .thenReturn(
                                                new UserVisualIdentityRepository.IdentidadVisual(
                                                                "Juan P.",
                                                                "JP"));

                mfaLoginService = mock(MfaLoginService.class);
                loginDevices = mock(LoginDeviceService.class);
                var transactionManager = mock(PlatformTransactionManager.class);
                when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
                when(mfaLoginService.start(any(), any())).thenReturn(reto);
                authenticationService = new AuthenticationService(
                                authenticationManager,
                                jwtService,
                                refreshTokenService,
                                customUserDetailsService,
                                authenticationContextRepository,
                                loginSecurityService,
                                documentLoginProcedureRepository,
                                userRepository,
                                passwordEncoder,
                                passwordPolicyService,
                                auditService,
                                userVisualIdentityRepository, mfaLoginService, loginDevices,
                                new TransactionTemplate(transactionManager));
        }

        @Test
        void loginExitosoConDni() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveValida", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("juan.perez"));
                UserPrincipal principal = crearPrincipal(10L, "juan.perez");
                Authentication auth = autenticacionExitosa(principal);
                when(authenticationManager.authenticate(any())).thenReturn(auth);
                assertSame(reto, authenticationService.autenticar(solicitud, "1.1.1.1", "test"));
                verify(mfaLoginService).start(principal, null);
                verifyNoInteractions(jwtService, refreshTokenService, loginSecurityService);
                verify(documentLoginProcedureRepository).resolverLogin("DNI", "12345678");
        }

        // ---------------------------------------------------------------
        // Escenario 2: Login correcto con CE alfanumerico
        // ---------------------------------------------------------------
        @Test
        void loginExitosoConCeAlfanumerico() {
                LoginRequest solicitud = crearSolicitudConDocumento("ab123456", "claveValida", "CE");
                when(documentLoginProcedureRepository.resolverLogin("CE", "ab123456"))
                                .thenReturn(Optional.of("maria.rios"));
                UserPrincipal principal = crearPrincipal(11L, "maria.rios");
                Authentication auth = autenticacionExitosa(principal);
                when(authenticationManager.authenticate(any())).thenReturn(auth);
                assertSame(reto, authenticationService.autenticar(solicitud, "1.1.1.1", "test"));
                verify(mfaLoginService).start(principal, null);
                verifyNoInteractions(jwtService, refreshTokenService, loginSecurityService);
                verify(documentLoginProcedureRepository).resolverLogin("CE", "ab123456");
        }

        // ---------------------------------------------------------------
        // Escenario 3: Login correcto con PASAPORTE
        // ---------------------------------------------------------------
        @Test
        void loginExitosoConPasaporte() {
                LoginRequest solicitud = crearSolicitudConDocumento("pa1234567", "claveValida", "PASAPORTE");
                when(documentLoginProcedureRepository.resolverLogin("PASAPORTE", "pa1234567"))
                                .thenReturn(Optional.of("luis.garcia"));
                UserPrincipal principal = crearPrincipal(12L, "luis.garcia");
                Authentication auth = autenticacionExitosa(principal);
                when(authenticationManager.authenticate(any())).thenReturn(auth);
                assertSame(reto, authenticationService.autenticar(solicitud, "1.1.1.1", "test"));
                verify(mfaLoginService).start(principal, null);
                verifyNoInteractions(jwtService, refreshTokenService, loginSecurityService);
                verify(documentLoginProcedureRepository).resolverLogin("PASAPORTE", "pa1234567");
        }

        // ---------------------------------------------------------------
        // Escenario 4: Login correcto con RUC
        // ---------------------------------------------------------------
        @Test
        void loginExitosoConRuc() {
                LoginRequest solicitud = crearSolicitudConDocumento("20123456789", "claveValida", "RUC");
                when(documentLoginProcedureRepository.resolverLogin("RUC", "20123456789"))
                                .thenReturn(Optional.of("empresa.ruc"));
                UserPrincipal principal = crearPrincipal(13L, "empresa.ruc");
                Authentication auth = autenticacionExitosa(principal);
                when(authenticationManager.authenticate(any())).thenReturn(auth);
                assertSame(reto, authenticationService.autenticar(solicitud, "1.1.1.1", "test"));
                verify(mfaLoginService).start(principal, null);
                verifyNoInteractions(jwtService, refreshTokenService, loginSecurityService);
                verify(documentLoginProcedureRepository).resolverLogin("RUC", "20123456789");
        }

        // ---------------------------------------------------------------
        // Escenario 5: Tipo documental incorrecto — sp devuelve vacio
        // ---------------------------------------------------------------
        @Test
        void tipoDocumentalIncorrectoCausaRechazo() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "clave", "CE");
                when(documentLoginProcedureRepository.resolverLogin("CE", "12345678"))
                                .thenReturn(Optional.empty());

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "1.1.1.1", "test"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verify(authenticationManager, never()).authenticate(any());
                verify(loginSecurityService, never()).registrarIntentoFallido(anyString());
        }

        // ---------------------------------------------------------------
        // Escenario 6: Documento inexistente
        // ---------------------------------------------------------------
        @Test
        void documentoInexistenteDevuelveMensajeGenerico() {
                LoginRequest solicitud = crearSolicitudConDocumento("99999999", "clave", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "99999999"))
                                .thenReturn(Optional.empty());

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "1.1.1.1", "test"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verify(authenticationManager, never()).authenticate(any());
                verify(loginSecurityService, never()).registrarIntentoFallido(anyString());
                verify(auditService).registrar(isNull(), eq("LOGIN_FALLIDO"), eq("FALLIDO"),
                                eq("Documento no encontrado o sin cuenta asociada"),
                                eq("1.1.1.1"), eq("test"), eq("POST"), eq("/api/auth/login"));
        }

        // ---------------------------------------------------------------
        // Escenario 7: Contrasena incorrecta (documento resuelto OK)
        // ---------------------------------------------------------------
        @Test
        void contrasenaIncorrectaConDocumentoResueltoBloqueaNormal() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveIncorrecta", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("juan.perez"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new BadCredentialsException("Bad credentials"));
                AuthenticationContext contexto = new AuthenticationContext(
                                10L, "juan.perez", "hash", false, null, true, true, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("juan.perez"))
                                .thenReturn(Optional.of(contexto));
                when(loginSecurityService.registrarIntentoFallido("juan.perez")).thenReturn(null);

                assertThrows(BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "1.1.1.1", "test"));

                verify(loginSecurityService).registrarIntentoFallido("juan.perez");
                verify(auditService).registrar(eq(10L), eq("LOGIN_FALLIDO"), eq("FALLIDO"),
                                anyString(), eq("1.1.1.1"), eq("test"), eq("POST"), eq("/api/auth/login"));
        }

        // ---------------------------------------------------------------
        // Escenario 8: Usuario bloqueado (con documento)
        // ---------------------------------------------------------------
        @Test
        void usuarioBloqueadoConDocumentoDevuelveBloqueoTemporal() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "clave", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuariobloqueado"));
                LocalDateTime bloqueadoHasta = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10);
                AuthenticationContext contexto = new AuthenticationContext(
                                2L, "usuariobloqueado", "hash", false, bloqueadoHasta, true, true,
                                List.of("ROLE_ASESOR"));
                when(authenticationManager.authenticate(any())).thenThrow(new LockedException("Locked"));
                when(authenticationContextRepository.obtenerPorLogin("usuariobloqueado"))
                                .thenReturn(Optional.of(contexto));
                when(loginSecurityService.calcularMinutosRestantes(bloqueadoHasta)).thenReturn(10L);

                AccountTemporarilyLockedException ex = assertThrows(
                                AccountTemporarilyLockedException.class,
                                () -> authenticationService.autenticar(solicitud, "1.1.1.1", "test"));

                assertEquals(10L, ex.getMinutosRestantes());
                verify(auditService).registrar(eq(2L), eq("LOGIN_DENEGADO"), eq("DENEGADO"),
                                anyString(), eq("1.1.1.1"), eq("test"), eq("POST"), eq("/api/auth/login"));
        }

        // ---------------------------------------------------------------
        // Escenario 9: Usuario inactivo
        // ---------------------------------------------------------------
        @Test
        void usuarioInactivoLanzaUserDisabledException() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "clave123", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuarioinactivo"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new DisabledException("User is disabled"));
                AuthenticationContext contexto = new AuthenticationContext(
                                5L, "usuarioinactivo", "hash",
                                false, null, false, false, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuarioinactivo"))
                                .thenReturn(Optional.of(contexto));

                UserDisabledException ex = assertThrows(
                                UserDisabledException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals("El usuario se encuentra desactivado.", ex.getMessage());
                verify(auditService).registrar(eq(5L), eq("LOGIN_DENEGADO"), eq("DENEGADO"),
                                contains("desactivada"), eq("127.0.0.1"), eq("JUnit"),
                                eq("POST"), eq("/api/auth/login"));
        }

        // ---------------------------------------------------------------
        // Escenario 10: Contrasena temporal expirada
        // ---------------------------------------------------------------
        @Test
        void contrasenaTemporalExpiradaLanzaAccountAccessRestrictedException() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveTemp", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuariotemporal"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new DisabledException("User is disabled"));
                AuthenticationContext contexto = new AuthenticationContext(
                                6L, "usuariotemporal", "hash",
                                true, null, true, false, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuariotemporal"))
                                .thenReturn(Optional.of(contexto));

                AccountAccessRestrictedException ex = assertThrows(
                                AccountAccessRestrictedException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertTrue(ex.getMessage().contains("temporal ha expirado"));
        }

        // ---------------------------------------------------------------
        // Escenario 11: Autenticacion sin tipoDocumento es rechazada
        // ---------------------------------------------------------------
        @Test
        void autenticacionHeredadaSinTipoDocumentoEsRechazada() {
                LoginRequest solicitud = crearSolicitud("usuarioOk", "claveValida");

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verifyNoInteractions(documentLoginProcedureRepository);
                verify(authenticationManager, never()).authenticate(any());
                verify(auditService).registrar(isNull(), eq("LOGIN_FALLIDO"), eq("FALLIDO"),
                                eq("Documento no encontrado o sin cuenta asociada"),
                                eq("127.0.0.1"), eq("JUnit"), eq("POST"), eq("/api/auth/login"));
        }

        @Test
        void solicitudConTipoDocumentoVacioEsRechazada() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveValida", "   ");

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verifyNoInteractions(documentLoginProcedureRepository);
                verify(authenticationManager, never()).authenticate(any());
        }

        @Test
        void solicitudConTipoDocumentoNuloEsRechazada() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveValida", null);

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verifyNoInteractions(documentLoginProcedureRepository);
                verify(authenticationManager, never()).authenticate(any());
        }

        // ---------------------------------------------------------------
        // Escenario 12: Documento invalido no activa ruta alternativa
        // ---------------------------------------------------------------
        @Test
        void documentoInvalidoNoActivaRutaAlternativaDeLogin() {
                LoginRequest solicitud = crearSolicitudConDocumento("00000000", "clave", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "00000000"))
                                .thenReturn(Optional.empty());

                BadCredentialsException ex = assertThrows(
                                BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "1.1.1.1", "test"));

                assertEquals("No fue posible autenticar al usuario", ex.getMessage());
                verify(authenticationManager, never()).authenticate(any());
                verify(loginSecurityService, never()).registrarIntentoFallido(anyString());
                verify(userRepository, never()).findByUsuarioLogin(anyString());
        }

        // ---------------------------------------------------------------
        // Tests heredados conservados
        // ---------------------------------------------------------------
        @Test
        void intentoFallidoNormalNoBloqueaYDevuelveBadCredentials() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveIncorrecta", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuario1"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new BadCredentialsException("Bad credentials"));
                AuthenticationContext contexto = new AuthenticationContext(
                                1L, "usuario1", "hash", false, null, true, true, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuario1"))
                                .thenReturn(Optional.of(contexto));
                when(loginSecurityService.registrarIntentoFallido("usuario1")).thenReturn(null);

                assertThrows(BadCredentialsException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                verify(auditService).registrar(
                                eq(1L), eq("LOGIN_FALLIDO"), eq("FALLIDO"),
                                anyString(), eq("127.0.0.1"), eq("JUnit"),
                                eq("POST"), eq("/api/auth/login"));
                verify(auditService, never()).registrar(
                                anyLong(), eq("USUARIO_BLOQUEADO"),
                                anyString(), anyString(), anyString(), anyString(), anyString(), anyString());
        }

        @Test
        void intentoQueAlcanzaElMaximoGeneraBloqueoTemporalConMinutos() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveIncorrecta", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuario1"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new BadCredentialsException("Bad credentials"));
                AuthenticationContext contexto = new AuthenticationContext(
                                1L, "usuario1", "hash", false, null, true, true, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuario1"))
                                .thenReturn(Optional.of(contexto));
                when(loginSecurityService.registrarIntentoFallido("usuario1")).thenReturn(1L);
                when(loginSecurityService.getLockDurationMinutes()).thenReturn(15L);

                AccountTemporarilyLockedException ex = assertThrows(
                                AccountTemporarilyLockedException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals(15L, ex.getMinutosRestantes());
                assertTrue(ex.getMinutosRestantes() > 0);
                assertTrue(ex.getMessage().contains("15 minutos"));

                verify(auditService).registrar(
                                eq(1L), eq("LOGIN_FALLIDO"), eq("FALLIDO"),
                                anyString(), eq("127.0.0.1"), eq("JUnit"), eq("POST"), eq("/api/auth/login"));
                verify(auditService).registrar(
                                eq(1L), eq("USUARIO_BLOQUEADO"), eq("EXITOSO"),
                                anyString(), eq("127.0.0.1"), eq("JUnit"), eq("POST"), eq("/api/auth/login"));
        }

        @Test
        void cuentaYaBloqueadaDevuelveBloqueoTemporalConTiempoRestante() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "cualquierClave", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuariobloqueado"));
                LocalDateTime bloqueadoHasta = LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10);
                AuthenticationContext contexto = new AuthenticationContext(
                                2L, "usuariobloqueado", "hash", false, bloqueadoHasta, true, true,
                                List.of("ROLE_ASESOR"));

                when(authenticationManager.authenticate(any())).thenThrow(new LockedException("Locked"));
                when(authenticationContextRepository.obtenerPorLogin("usuariobloqueado"))
                                .thenReturn(Optional.of(contexto));
                when(loginSecurityService.calcularMinutosRestantes(bloqueadoHasta)).thenReturn(10L);

                AccountTemporarilyLockedException ex = assertThrows(
                                AccountTemporarilyLockedException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals(10L, ex.getMinutosRestantes());
                assertTrue(ex.getMinutosRestantes() > 0);
                assertTrue(ex.getMessage().contains("10 minutos"));

                verify(auditService).registrar(
                                eq(2L), eq("LOGIN_DENEGADO"), eq("DENEGADO"),
                                anyString(), eq("127.0.0.1"), eq("JUnit"), eq("POST"), eq("/api/auth/login"));
        }

        @Test
        void unEquipoRecordadoSoloCreaSesionDespuesDeComprobarLaContrasena() {
                var request = crearSolicitudConDocumento("12345678", "claveValida", "DNI");
                request.setPortal(MfaPortal.BACKOFFICE);
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuarioOk"));
                var principal = crearPrincipal(3L, "usuarioOk");
                var authentication = autenticacionExitosa(principal);
                when(authenticationManager.authenticate(any())).thenReturn(authentication);
                String token = "D".repeat(43);
                when(mfaLoginService.trustedDevice(principal, MfaPortal.BACKOFFICE, token)).thenReturn(true);
                var login = authenticationService.autenticar(request, "127.0.0.1", "JUnit", token);
                assertNotNull(login.session());
                assertNull(login.challenge());
                var order = inOrder(authenticationManager, mfaLoginService, refreshTokenService);
                order.verify(authenticationManager).authenticate(any());
                order.verify(mfaLoginService).trustedDevice(principal, MfaPortal.BACKOFFICE, token);
                order.verify(refreshTokenService).crearSesion(3L, "127.0.0.1", "JUnit");
        }

        @Test
        void emiteUnaSesionSoloDespuesDeValidarElSegundoFactor() {
                var code = new MfaCodeRequest(reto.reto(), "123456");
                var principal = crearPrincipal(3L, "usuarioOk");
                when(mfaLoginService.verify(code)).thenReturn(new MfaLoginService.Verified(principal, false, null));
                when(jwtService.generarAccessToken(principal)).thenReturn("mockJwt");
                when(refreshTokenService.crearSesion(3L, "127.0.0.1", "JUnit")).thenReturn("mockRefresh");

                LoginResponse resp = authenticationService.confirmarMfa(code, "127.0.0.1", "JUnit", null).session();
                assertEquals("mockJwt", resp.getAccessToken());
                assertEquals("mockRefresh", resp.getRefreshToken());
                verify(loginSecurityService).registrarAccesoExitoso(3L);
        }

        @Test
        void unSegundoFactorRechazadoNoCreaSesion() {
                var code = new MfaCodeRequest(reto.reto(), "000000");
                when(mfaLoginService.verify(code)).thenThrow(MfaException.invalidCode());
                assertThrows(MfaException.class, () -> authenticationService.confirmarMfa(code, "127.0.0.1", "JUnit", null));
                verifyNoInteractions(jwtService, refreshTokenService, loginSecurityService);
        }

        @Test
        void vincularOtroFactorInvalidaLasSesionesYEmiteConLaVersionActual() {
                var code = new MfaCodeRequest(reto.reto(), "123456");
                var old = crearPrincipal(3L, "usuarioOk");
                var updated = new UserPrincipal(3L, "usuarioOk", "hash", old.getAuthorities(), true, true, false, 1L);
                when(mfaLoginService.verify(code)).thenReturn(new MfaLoginService.Verified(old, true, null));
                when(customUserDetailsService.loadUserByUsername("usuarioOk")).thenReturn(updated);
                authenticationService.confirmarMfa(code, "127.0.0.1", "JUnit", null);
                var ordered = inOrder(refreshTokenService, jwtService);
                ordered.verify(refreshTokenService).revocarTodasLasSesiones(3L, "VINCULACION_MFA");
                ordered.verify(jwtService).generarAccessToken(updated);
                ordered.verify(refreshTokenService).crearSesion(3L, "127.0.0.1", "JUnit");
        }

        @Test
        void rechazaRenovacionSiCambioLaVersionDuranteLaRotacion() {
                var request = new RefreshTokenRequest();
                request.setRefreshToken("anterior");
                when(refreshTokenService.rotarRefreshToken("anterior", "127.0.0.1", "JUnit"))
                        .thenReturn(new RefreshTokenRotation(3L, "nuevo.login", "renovado", -1L));
                when(customUserDetailsService.loadUserByUsername("nuevo.login")).thenReturn(crearPrincipal(3L, "nuevo.login"));
                assertThrows(InvalidTokenException.class, () -> authenticationService.renovarToken(request, "127.0.0.1", "JUnit"));
                verifyNoInteractions(jwtService);
        }

        @Test
        void usuarioDesactivadoLanzaUserDisabledException() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "clave123", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuarioinactivo"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new DisabledException("User is disabled"));
                AuthenticationContext contexto = new AuthenticationContext(
                                5L, "usuarioinactivo", "hash",
                                false, null, false, false, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuarioinactivo"))
                                .thenReturn(Optional.of(contexto));

                UserDisabledException ex = assertThrows(
                                UserDisabledException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertEquals("El usuario se encuentra desactivado.", ex.getMessage());
                verify(auditService).registrar(
                                eq(5L), eq("LOGIN_DENEGADO"), eq("DENEGADO"),
                                contains("desactivada"), eq("127.0.0.1"), eq("JUnit"),
                                eq("POST"), eq("/api/auth/login"));
        }

        @Test
        void usuarioConPasswordTemporalExpiradoLanzaAccountAccessRestrictedException() {
                LoginRequest solicitud = crearSolicitudConDocumento("12345678", "claveTemp", "DNI");
                when(documentLoginProcedureRepository.resolverLogin("DNI", "12345678"))
                                .thenReturn(Optional.of("usuariotemporal"));
                when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                                .thenThrow(new DisabledException("User is disabled"));
                AuthenticationContext contexto = new AuthenticationContext(
                                6L, "usuariotemporal", "hash",
                                true, null, true, false, List.of("ROLE_ASESOR"));
                when(authenticationContextRepository.obtenerPorLogin("usuariotemporal"))
                                .thenReturn(Optional.of(contexto));

                AccountAccessRestrictedException ex = assertThrows(
                                AccountAccessRestrictedException.class,
                                () -> authenticationService.autenticar(solicitud, "127.0.0.1", "JUnit"));

                assertTrue(ex.getMessage().contains("temporal ha expirado"));
        }

        private LoginRequest crearSolicitud(String usuario, String contrasena) {
                LoginRequest req = new LoginRequest();
                req.setUsuario(usuario);
                req.setContrasena(contrasena);
                return req;
        }

        private LoginRequest crearSolicitudConDocumento(
                        String numeroDocumento,
                        String contrasena,
                        String tipoDocumento) {
                LoginRequest req = new LoginRequest();
                req.setUsuario(numeroDocumento);
                req.setContrasena(contrasena);
                req.setTipoDocumento(tipoDocumento);
                return req;
        }

        private UserPrincipal crearPrincipal(Long id, String login) {
                return new UserPrincipal(
                                id, login, "hash",
                                List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRADOR")),
                                true, true, false);
        }

        private Authentication autenticacionExitosa(UserPrincipal principal) {
                Authentication auth = mock(Authentication.class);
                when(auth.getPrincipal()).thenReturn(principal);
                return auth;
        }
}
