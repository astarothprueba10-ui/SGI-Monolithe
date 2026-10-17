
package monolithe.auth_service.service;

import monolithe.auth_service.repository.UserRepository;
import monolithe.auth_service.repository.LoginAttemptProcedureRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoginSecurityServiceTest {

    private UserRepository userRepository;
    private LoginAttemptProcedureRepository loginAttemptProcedureRepository;
    private LoginSecurityService loginSecurityService;

    @BeforeEach
    void setUp() {

        userRepository = mock(UserRepository.class);

        loginAttemptProcedureRepository =
                mock(LoginAttemptProcedureRepository.class);

        loginSecurityService = new LoginSecurityService(
                userRepository,
                loginAttemptProcedureRepository
        );

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
    void debeDelegarIntentoFallidoSinBloqueoAlProcedimiento() {

        when(loginAttemptProcedureRepository.registrarIntentoFallido(
                "admin",
                5,
                900L
        )).thenReturn(null);

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido("admin");

        assertNull(idBloqueado);

        verify(loginAttemptProcedureRepository)
                .registrarIntentoFallido(
                        "admin",
                        5,
                        900L
                );

        verifyNoInteractions(userRepository);
    }

    @Test
    void debeRetornarIdCuandoProcedimientoBloqueaUsuario() {

        when(loginAttemptProcedureRepository.registrarIntentoFallido(
                "admin",
                5,
                900L
        )).thenReturn(1L);

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido("admin");

        assertEquals(1L, idBloqueado);

        verify(loginAttemptProcedureRepository)
                .registrarIntentoFallido(
                        "admin",
                        5,
                        900L
                );

        verifyNoInteractions(userRepository);
    }

    @Test
    void debeDelegarDocumentoAlfanumericoSinModificarlo() {

        String documento = "AB123456";

        when(loginAttemptProcedureRepository.registrarIntentoFallido(
                documento,
                5,
                900L
        )).thenReturn(null);

        Long idBloqueado =
                loginSecurityService.registrarIntentoFallido(documento);

        assertNull(idBloqueado);

        verify(loginAttemptProcedureRepository)
                .registrarIntentoFallido(
                        documento,
                        5,
                        900L
                );

        verifyNoInteractions(userRepository);
    }

    @Test
    void debeReiniciarSeguridadDespuesDeLoginExitoso() {

        loginSecurityService.registrarAccesoExitoso(1L);

        verify(userRepository)
                .registrarAccesoExitoso(1L);

        verifyNoMoreInteractions(userRepository);

        verifyNoInteractions(loginAttemptProcedureRepository);
    }

    @Test
    void debeCalcularDuracionDeBloqueoEnMinutos() {

        long minutos =
                loginSecurityService.getLockDurationMinutes();

        assertEquals(15L, minutos);
    }

    @Test
    void debeCalcularMinutosRestantesUsandoUtcYRedondearHaciaArriba() {

        LocalDateTime ahoraUtc =
                LocalDateTime.now(ZoneOffset.UTC);

        long minutosCortos =
                loginSecurityService.calcularMinutosRestantes(
                        ahoraUtc.plusSeconds(30)
                );

        assertEquals(1L, minutosCortos);

        long minutosLargos =
                loginSecurityService.calcularMinutosRestantes(
                        ahoraUtc.plusMinutes(14).plusSeconds(10)
                );

        assertEquals(15L, minutosLargos);

        long minutosNulo =
                loginSecurityService.calcularMinutosRestantes(null);

        assertEquals(15L, minutosNulo);

        long minutosVencidos =
                loginSecurityService.calcularMinutosRestantes(
                        ahoraUtc.minusSeconds(10)
                );

        assertEquals(1L, minutosVencidos);
    }
}
