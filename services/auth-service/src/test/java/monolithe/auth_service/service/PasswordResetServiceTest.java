package monolithe.auth_service.service;

import monolithe.auth_service.entity.PasswordResetToken;
import monolithe.auth_service.entity.User;
import monolithe.auth_service.exception.InvalidTokenException;
import monolithe.auth_service.repository.PasswordResetTokenRepository;
import monolithe.auth_service.repository.PersonContactRepository;
import monolithe.auth_service.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetServiceTest {

    private PasswordResetTokenRepository passwordResetTokenRepository;
    private UserRepository userRepository;
    private PasswordEncoder passwordEncoder;
    private PasswordPolicyService passwordPolicyService;
    private RefreshTokenService refreshTokenService;
    private PersonContactRepository personContactRepository;
    private EmailService emailService;
    private AuditService auditService;

    private PasswordResetService passwordResetService;

    @BeforeEach
    void setUp() {

        passwordResetTokenRepository =
                mock(PasswordResetTokenRepository.class);

        userRepository =
                mock(UserRepository.class);

        passwordEncoder =
                mock(PasswordEncoder.class);

        passwordPolicyService =
                mock(PasswordPolicyService.class);

        refreshTokenService =
                mock(RefreshTokenService.class);

        personContactRepository =
                mock(PersonContactRepository.class);

        emailService =
                mock(EmailService.class);

        auditService =
                mock(AuditService.class);

        passwordResetService = new PasswordResetService(
                passwordResetTokenRepository,
                userRepository,
                passwordEncoder,
                passwordPolicyService,
                refreshTokenService,
                personContactRepository,
                emailService,
                auditService
        );

        ReflectionTestUtils.setField(
                passwordResetService,
                "passwordResetExpiration",
                900L
        );
    }

    @Test
    void debeCrearTokenSeguroYGuardarSoloSuHash() {

        User usuario = crearUsuario();

        when(userRepository.findById(1L))
                .thenReturn(Optional.of(usuario));

        when(passwordResetTokenRepository
                .findByUsuarioIdUsuarioAndFechaUsoIsNull(1L))
                .thenReturn(List.of());

        String tokenReal =
                passwordResetService.crearTokenRecuperacion(
                        1L,
                        "127.0.0.1",
                        "JUnit"
                );

        assertNotNull(tokenReal);
        assertFalse(tokenReal.isBlank());

        ArgumentCaptor<PasswordResetToken> captor =
                ArgumentCaptor.forClass(
                        PasswordResetToken.class
                );

        verify(passwordResetTokenRepository)
                .save(captor.capture());

        PasswordResetToken tokenGuardado =
                captor.getValue();

        assertNotNull(tokenGuardado.getTokenHash());

        assertEquals(
                64,
                tokenGuardado.getTokenHash().length()
        );

        assertNotEquals(
                tokenReal,
                tokenGuardado.getTokenHash()
        );

        assertEquals(
                usuario,
                tokenGuardado.getUsuario()
        );

        assertNotNull(
                tokenGuardado.getFechaExpiracion()
        );

        assertEquals(
                "127.0.0.1",
                tokenGuardado.getIpSolicitud()
        );

        assertEquals(
                "JUnit",
                tokenGuardado.getUserAgent()
        );
    }

    @Test
    void debeRestablecerContrasenaConTokenValido() {

        User usuario = crearUsuario();

        PasswordResetToken token =
                new PasswordResetToken();

        token.setUsuario(usuario);
        token.setFechaExpiracion(
                LocalDateTime.now().plusMinutes(10)
        );

        String tokenReal = "token-recuperacion-valido";

        when(passwordResetTokenRepository
                .findByTokenHashAndFechaUsoIsNull(
                        passwordResetService.calcularSha256(
                                tokenReal
                        )
                ))
                .thenReturn(Optional.of(token));

        when(passwordEncoder.matches(
                "NuevaClave123*",
                "hash-anterior"
        ))
                .thenReturn(false);

        when(passwordEncoder.encode(
                "NuevaClave123*"
        ))
                .thenReturn("nuevo-hash");

        Long idUsuario =
                passwordResetService.restablecerContrasena(
                        tokenReal,
                        "NuevaClave123*",
                        "NuevaClave123*"
                );

        assertEquals(
                1L,
                idUsuario
        );

        assertEquals(
                "nuevo-hash",
                usuario.getPasswordHash()
        );

        assertFalse(
                Boolean.TRUE.equals(
                        usuario.getRequiereCambioPassword()
                )
        );

        assertEquals(
                0,
                usuario.getIntentosFallidos()
        );

        assertNull(
                usuario.getBloqueadoHasta()
        );

        assertNotNull(
                usuario.getPasswordActualizadoEn()
        );

        assertNotNull(
                token.getFechaUso()
        );

        verify(passwordPolicyService)
                .validar("NuevaClave123*");

        verify(userRepository)
                .save(usuario);

        verify(passwordResetTokenRepository)
                .save(token);

        verify(refreshTokenService)
                .revocarTodasLasSesiones(
                        1L,
                        "RECUPERACION_PASSWORD"
                );
    }

    @Test
    void debeRechazarTokenExpirado() {

        User usuario = crearUsuario();

        PasswordResetToken token =
                new PasswordResetToken();

        token.setUsuario(usuario);
        token.setFechaExpiracion(
                LocalDateTime.now().minusMinutes(1)
        );

        String tokenReal = "token-expirado";

        when(passwordResetTokenRepository
                .findByTokenHashAndFechaUsoIsNull(
                        passwordResetService.calcularSha256(
                                tokenReal
                        )
                ))
                .thenReturn(Optional.of(token));

        assertThrows(
                InvalidTokenException.class,
                () -> passwordResetService
                        .restablecerContrasena(
                                tokenReal,
                                "NuevaClave123*",
                                "NuevaClave123*"
                        )
        );

        verify(userRepository, never())
                .save(any(User.class));

        verify(refreshTokenService, never())
                .revocarTodasLasSesiones(
                        anyLong(),
                        anyString()
                );
    }

    @Test
    void debeRechazarTokenInvalidoOYaUtilizado() {

        when(passwordResetTokenRepository
                .findByTokenHashAndFechaUsoIsNull(
                        anyString()
                ))
                .thenReturn(Optional.empty());

        assertThrows(
                InvalidTokenException.class,
                () -> passwordResetService
                        .restablecerContrasena(
                                "token-invalido",
                                "NuevaClave123*",
                                "NuevaClave123*"
                        )
        );

        verify(userRepository, never())
                .save(any(User.class));

        verify(refreshTokenService, never())
                .revocarTodasLasSesiones(
                        anyLong(),
                        anyString()
                );
    }

    private User crearUsuario() {

        User usuario = new User();

        usuario.setIdUsuario(1L);
        usuario.setUsuarioLogin("admin");
        usuario.setPasswordHash("hash-anterior");
        usuario.setRequiereCambioPassword(true);
        usuario.setIntentosFallidos(4);
        usuario.setBloqueadoHasta(
                LocalDateTime.now().plusMinutes(5)
        );

        return usuario;
    }
}