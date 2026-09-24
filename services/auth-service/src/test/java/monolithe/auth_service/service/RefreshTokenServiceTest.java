package monolithe.auth_service.service;

import monolithe.auth_service.entity.Session;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.entity.Estado;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.repository.SessionRepository;
import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.security.RefreshTokenRotation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RefreshTokenServiceTest {

    private SessionRepository sessionRepository;
    private UserRepository userRepository;
    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {

        sessionRepository = mock(SessionRepository.class);
        userRepository = mock(UserRepository.class);

        refreshTokenService = new RefreshTokenService(
                sessionRepository,
                userRepository
        );

        ReflectionTestUtils.setField(
                refreshTokenService,
                "refreshTokenExpiration",
                604800L
        );
    }

    @Test
    void debeCrearRefreshTokenSeguroYGuardarSoloSuHash() {

        User usuario = crearUsuarioActivo();

        when(userRepository.findById(1L))
                .thenReturn(Optional.of(usuario));

        String refreshToken = refreshTokenService.crearSesion(
                1L,
                "127.0.0.1",
                "JUnit"
        );

        assertNotNull(refreshToken);
        assertFalse(refreshToken.isBlank());

        var captor = org.mockito.ArgumentCaptor
                .forClass(Session.class);

        verify(sessionRepository).save(captor.capture());

        Session sesionGuardada = captor.getValue();

        assertNotNull(sesionGuardada.getRefreshTokenHash());

        assertEquals(
                64,
                sesionGuardada.getRefreshTokenHash().length()
        );

        assertNotEquals(
                refreshToken,
                sesionGuardada.getRefreshTokenHash()
        );

        assertEquals(
                usuario,
                sesionGuardada.getUsuario()
        );

        assertNotNull(
                sesionGuardada.getFechaExpiracion()
        );
    }

    @Test
    void debeRotarRefreshTokenYRevocarSesionAnterior() {

        User usuario = crearUsuarioActivo();

        String refreshTokenActual = "refresh-token-valido";

        Session sesionActual = new Session();
        sesionActual.setUsuario(usuario);
        sesionActual.setFechaExpiracion(
                LocalDateTime.now().plusDays(1)
        );

        when(sessionRepository
                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                        refreshTokenService.calcularSha256(
                                refreshTokenActual
                        )
                ))
                .thenReturn(Optional.of(sesionActual));

        RefreshTokenRotation rotacion =
                refreshTokenService.rotarRefreshToken(
                        refreshTokenActual,
                        "127.0.0.1",
                        "JUnit"
                );

        assertNotNull(rotacion);
        assertEquals(
                1L,
                rotacion.idUsuario()
        );

        assertEquals(
                "admin",
                rotacion.usuarioLogin()
        );

        assertNotNull(
                rotacion.refreshToken()
        );

        assertNotEquals(
                refreshTokenActual,
                rotacion.refreshToken()
        );

        assertNotNull(
                sesionActual.getFechaRevocacion()
        );

        assertEquals(
                "ROTACION_REFRESH_TOKEN",
                sesionActual.getMotivoRevocacion()
        );

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
                LocalDateTime.now().minusMinutes(1)
        );

        when(sessionRepository
                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                        refreshTokenService.calcularSha256(
                                refreshTokenActual
                        )
                ))
                .thenReturn(Optional.of(sesion));

        assertThrows(
                InvalidTokenException.class,
                () -> refreshTokenService.rotarRefreshToken(
                        refreshTokenActual,
                        "127.0.0.1",
                        "JUnit"
                )
        );

        verify(sessionRepository, never())
                .save(any(Session.class));
    }

    @Test
    void debeRechazarRefreshTokenInexistenteORevocado() {

        when(sessionRepository
                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                        anyString()
                ))
                .thenReturn(Optional.empty());

        assertThrows(
                InvalidTokenException.class,
                () -> refreshTokenService.rotarRefreshToken(
                        "token-invalido",
                        "127.0.0.1",
                        "JUnit"
                )
        );

        verify(sessionRepository, never())
                .save(any(Session.class));
    }

    @Test
    void debeRechazarRefreshTokenSiEstadoEsDeOtraEntidad() {

        User usuario = crearUsuarioActivo();
        usuario.getEstadoUsuario().setEntidad("VENTA");

        String refreshTokenActual = "refresh-token-valido";

        Session sesionActual = new Session();
        sesionActual.setUsuario(usuario);
        sesionActual.setFechaExpiracion(
                LocalDateTime.now().plusDays(1)
        );

        when(sessionRepository
                .findByRefreshTokenHashAndFechaRevocacionIsNull(
                        refreshTokenService.calcularSha256(
                                refreshTokenActual
                        )
                ))
                .thenReturn(Optional.of(sesionActual));

        assertThrows(
                IllegalArgumentException.class,
                () -> refreshTokenService.rotarRefreshToken(
                        refreshTokenActual,
                        "127.0.0.1",
                        "JUnit"
                )
        );

        verify(sessionRepository, never())
                .save(any(Session.class));
    }

    private User crearUsuarioActivo() {

        Estado estado = new Estado();
        estado.setEntidad("USUARIO");
        estado.setActivo(true);
        estado.setPermiteAcceso(true);

        User usuario = new User();

        usuario.setIdUsuario(1L);
        usuario.setUsuarioLogin("admin");
        usuario.setEstadoUsuario(estado);
        usuario.setBloqueadoHasta(null);

        return usuario;
    }
}