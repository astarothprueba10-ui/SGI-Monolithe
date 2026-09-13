package monolithe.auth_service.service;

import monolithe.auth_service.entity.User;
import monolithe.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoginSecurityServiceTest {

    private UserRepository userRepository;
    private LoginSecurityService loginSecurityService;

    @BeforeEach
    void setUp() {

        userRepository = mock(UserRepository.class);

        loginSecurityService =
                new LoginSecurityService(userRepository);

        ReflectionTestUtils.setField(
                loginSecurityService,
                "maxFailedAttempts",
                5
        );

        ReflectionTestUtils.setField(
                loginSecurityService,
                "lockDuration",
                900L
        );
    }

    @Test
    void debeIncrementarIntentosFallidosSinBloquearAntesDelLimite() {

        User usuario = crearUsuario();
        usuario.setIntentosFallidos(3);

        when(userRepository.findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido("admin");

        assertNull(idBloqueado);
        assertEquals(4, usuario.getIntentosFallidos());
        assertNull(usuario.getBloqueadoHasta());

        verify(userRepository).save(usuario);
    }

    @Test
    void debeBloquearUsuarioAlAlcanzarMaximoDeIntentos() {

        User usuario = crearUsuario();
        usuario.setIntentosFallidos(4);

        when(userRepository.findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido("admin");

        assertEquals(1L, idBloqueado);
        assertEquals(5, usuario.getIntentosFallidos());

        assertNotNull(usuario.getBloqueadoHasta());
        assertTrue(
                usuario.getBloqueadoHasta()
                        .isAfter(LocalDateTime.now())
        );

        verify(userRepository).save(usuario);
    }

    @Test
    void debeReiniciarIntentosSiBloqueoAnteriorYaExpiro() {

        User usuario = crearUsuario();

        usuario.setIntentosFallidos(5);
        usuario.setBloqueadoHasta(
                LocalDateTime.now().minusMinutes(1)
        );

        when(userRepository.findByUsuarioLogin("admin"))
                .thenReturn(Optional.of(usuario));

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido("admin");

        assertNull(idBloqueado);
        assertEquals(1, usuario.getIntentosFallidos());
        assertNull(usuario.getBloqueadoHasta());

        verify(userRepository).save(usuario);
    }

    @Test
    void debeReiniciarSeguridadDespuesDeLoginExitoso() {

        User usuario = crearUsuario();

        usuario.setIntentosFallidos(4);
        usuario.setBloqueadoHasta(
                LocalDateTime.now().minusSeconds(1)
        );

        when(userRepository.findById(1L))
                .thenReturn(Optional.of(usuario));

        loginSecurityService.registrarAccesoExitoso(1L);

        assertEquals(0, usuario.getIntentosFallidos());
        assertNull(usuario.getBloqueadoHasta());
        assertNotNull(usuario.getUltimoAcceso());

        verify(userRepository).save(usuario);
    }

    private User crearUsuario() {

        User usuario = new User();

        usuario.setIdUsuario(1L);
        usuario.setUsuarioLogin("admin");
        usuario.setIntentosFallidos(0);

        return usuario;
    }
}