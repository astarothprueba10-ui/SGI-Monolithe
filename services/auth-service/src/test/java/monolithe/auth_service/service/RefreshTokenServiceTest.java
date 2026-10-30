package monolithe.auth_service.service;

import monolithe.auth_service.entity.Session;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.entity.Estado;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.repository.SessionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.RefreshTokenRotation;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

        private SessionRepository sessionRepository;
        private UserRepository userRepository;
        private JdbcTemplate jdbcTemplate;
        private RefreshTokenService refreshTokenService;

        @BeforeEach
        void setUp() {

                sessionRepository = mock(SessionRepository.class);
                userRepository = mock(UserRepository.class);
                jdbcTemplate = mock(JdbcTemplate.class);

                refreshTokenService = new RefreshTokenService(
                                sessionRepository,
                                userRepository,
                                jdbcTemplate);

                ReflectionTestUtils.setField(
                                refreshTokenService,
                                "refreshTokenExpiration",
                                604800L);
        }

        @Test
        void debeCrearRefreshTokenSeguroYGuardarSoloSuHash() {

                User usuario = crearUsuarioActivo();

                when(userRepository.getReferenceById(1L))
                                .thenReturn(usuario);

                String refreshToken = refreshTokenService.crearSesion(
                                1L,
                                "127.0.0.1",
                                "JUnit");

                assertNotNull(refreshToken);
                assertFalse(refreshToken.isBlank());

                var captor = org.mockito.ArgumentCaptor
                                .forClass(Session.class);

                verify(sessionRepository).save(captor.capture());

                Session sesionGuardada = captor.getValue();

                assertNotNull(sesionGuardada.getRefreshTokenHash());

                assertEquals(
                                64,
                                sesionGuardada.getRefreshTokenHash().length());

                assertNotEquals(
                                refreshToken,
                                sesionGuardada.getRefreshTokenHash());

                assertEquals(
                                usuario,
                                sesionGuardada.getUsuario());

                assertNotNull(
                                sesionGuardada.getFechaExpiracion());
        }

        @Test
        void debeRotarRefreshTokenYRevocarSesionAnterior() {

                User usuario = crearUsuarioActivo();

                String refreshTokenActual = "refresh-token-valido";

                Session sesionActual = new Session();
                sesionActual.setUsuario(usuario);
                sesionActual.setFechaExpiracion(
                                LocalDateTime.now().plusDays(1));

                when(sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                refreshTokenService.calcularSha256(
                                                                refreshTokenActual)))
                                .thenReturn(Optional.of(sesionActual));

                when(jdbcTemplate.queryForObject(
                                eq("SELECT public.fn_seguridad_acceso_laboral_permitido(?)"),
                                eq(Boolean.class),
                                eq(10L)))
                                .thenReturn(Boolean.TRUE);

                RefreshTokenRotation rotacion = refreshTokenService.rotarRefreshToken(
                                refreshTokenActual,
                                "127.0.0.1",
                                "JUnit");

                assertNotNull(rotacion);
                assertEquals(
                                1L,
                                rotacion.idUsuario());

                assertEquals(
                                "admin",
                                rotacion.usuarioLogin());

                assertNotNull(
                                rotacion.refreshToken());

                assertNotEquals(
                                refreshTokenActual,
                                rotacion.refreshToken());

                assertNotNull(
                                sesionActual.getFechaRevocacion());

                assertEquals(
                                "ROTACION_REFRESH_TOKEN",
                                sesionActual.getMotivoRevocacion());

                verify(sessionRepository, times(2))
                                .save(any(Session.class));
        }

        @Test
        void debeRechazarRefreshTokenExpirado() {

                User usuario = crearUsuarioActivo();

                String refreshTokenActual = "refresh-token-expirado";

                Session sesion = new Session();
                sesion.setUsuario(usuario);
                sesion.setFechaExpiracion(
                                LocalDateTime.now().minusMinutes(1));

                when(sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                refreshTokenService.calcularSha256(
                                                                refreshTokenActual)))
                                .thenReturn(Optional.of(sesion));

                assertThrows(
                                InvalidTokenException.class,
                                () -> refreshTokenService.rotarRefreshToken(
                                                refreshTokenActual,
                                                "127.0.0.1",
                                                "JUnit"));

                verify(sessionRepository, never())
                                .save(any(Session.class));
        }

        @Test
        void debeRechazarRefreshTokenInexistenteORevocado() {

                when(sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                anyString()))
                                .thenReturn(Optional.empty());

                assertThrows(
                                InvalidTokenException.class,
                                () -> refreshTokenService.rotarRefreshToken(
                                                "token-invalido",
                                                "127.0.0.1",
                                                "JUnit"));

                verify(sessionRepository, never())
                                .save(any(Session.class));
        }

        @Test
        void debeRechazarRefreshTokenSiPermiteAccesoEsFalso() {

                User usuario = crearUsuarioActivo();
                usuario.getEstadoUsuario().setPermiteAcceso(false);

                String refreshTokenActual = "refresh-token-valido";

                Session sesionActual = new Session();
                sesionActual.setUsuario(usuario);
                sesionActual.setFechaExpiracion(
                                LocalDateTime.now().plusDays(1));

                when(sessionRepository
                                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                                                refreshTokenService.calcularSha256(
                                                                refreshTokenActual)))
                                .thenReturn(Optional.of(sesionActual));

                assertThrows(
                                IllegalArgumentException.class,
                                () -> refreshTokenService.rotarRefreshToken(
                                                refreshTokenActual,
                                                "127.0.0.1",
                                                "JUnit"));

                verify(sessionRepository, never())
                                .save(any(Session.class));
        }

        @Test
        void debeRechazarRotacionSiEstadoNoTieneCodigoActivo() {
                User usuario = crearUsuarioActivo();
                usuario.getEstadoUsuario().setCodigo("SUSPENDIDO");

                String token = "refresh-token-inactivo";
                Session sesion = new Session();
                sesion.setUsuario(usuario);
                sesion.setFechaExpiracion(LocalDateTime.now().plusDays(1));

                when(sessionRepository.findByRefreshTokenHashAndFechaRevocacionIsNull(
                                refreshTokenService.calcularSha256(token)))
                                .thenReturn(Optional.of(sesion));

                assertThrows(IllegalArgumentException.class,
                                () -> refreshTokenService.rotarRefreshToken(token, "127.0.0.1", "JUnit"));
                verify(sessionRepository, never()).save(any(Session.class));
        }

        @Test
        void debeRechazarRotacionSiTrabajadorCesadoOEnVerificacion() {
                User usuario = crearUsuarioActivo();

                String token = "refresh-token-laboral";
                Session sesion = new Session();
                sesion.setUsuario(usuario);
                sesion.setFechaExpiracion(LocalDateTime.now().plusDays(1));

                when(sessionRepository.findByRefreshTokenHashAndFechaRevocacionIsNull(
                                refreshTokenService.calcularSha256(token)))
                                .thenReturn(Optional.of(sesion));
                when(jdbcTemplate.queryForObject(
                                eq("SELECT public.fn_seguridad_acceso_laboral_permitido(?)"),
                                eq(Boolean.class),
                                eq(10L)))
                                .thenReturn(Boolean.FALSE);

                assertThrows(IllegalArgumentException.class,
                                () -> refreshTokenService.rotarRefreshToken(token, "127.0.0.1", "JUnit"));
                verify(sessionRepository, never()).save(any(Session.class));
        }

        @Test
        void debeRechazarRotacionSiErrorDeBaseDeDatosEnAccesoLaboral() {
                User usuario = crearUsuarioActivo();

                String token = "refresh-token-db-error";
                Session sesion = new Session();
                sesion.setUsuario(usuario);
                sesion.setFechaExpiracion(LocalDateTime.now().plusDays(1));

                when(sessionRepository.findByRefreshTokenHashAndFechaRevocacionIsNull(
                                refreshTokenService.calcularSha256(token)))
                                .thenReturn(Optional.of(sesion));
                when(jdbcTemplate.queryForObject(
                                eq("SELECT public.fn_seguridad_acceso_laboral_permitido(?)"),
                                eq(Boolean.class),
                                eq(10L)))
                                .thenThrow(new RuntimeException("DB down"));

                assertThrows(IllegalArgumentException.class,
                                () -> refreshTokenService.rotarRefreshToken(token, "127.0.0.1", "JUnit"));
                verify(sessionRepository, never()).save(any(Session.class));
        }

        @Test
        void debeIncrementarVersionAlCerrarTodasLasSesiones() {
                Session sesion = new Session();

                when(sessionRepository
                                .findByUsuarioIdUsuarioAndFechaRevocacionIsNull(1L))
                                .thenReturn(java.util.List.of(sesion));

                when(userRepository.incrementarVersionSesiones(1L))
                                .thenReturn(1);

                refreshTokenService.revocarTodasLasSesiones(
                                1L, "LOGOUT_TODAS_SESIONES");

                assertNotNull(sesion.getFechaRevocacion());
                assertEquals(
                                "LOGOUT_TODAS_SESIONES",
                                sesion.getMotivoRevocacion());

                verify(sessionRepository).saveAll(anyList());
                verify(userRepository).incrementarVersionSesiones(1L);
        }

        @Test
        void debeRechazarCierreGlobalSiNoActualizaVersion() {
                when(sessionRepository
                                .findByUsuarioIdUsuarioAndFechaRevocacionIsNull(1L))
                                .thenReturn(java.util.List.of());

                when(userRepository.incrementarVersionSesiones(1L))
                                .thenReturn(0);

                assertThrows(
                                IllegalStateException.class,
                                () -> refreshTokenService.revocarTodasLasSesiones(
                                                1L, "LOGOUT_TODAS_SESIONES"));

                verify(userRepository).incrementarVersionSesiones(1L);
        }

        private User crearUsuarioActivo() {

                Estado estado = new Estado();
                estado.setCodigo("ACTIVO");
                estado.setActivo(true);
                estado.setPermiteAcceso(true);

                User usuario = new User();

                usuario.setIdUsuario(1L);
                usuario.setIdPersona(10L);
                usuario.setUsuarioLogin("admin");
                usuario.setEstadoUsuario(estado);
                usuario.setBloqueadoHasta(null);

                return usuario;
        }
}