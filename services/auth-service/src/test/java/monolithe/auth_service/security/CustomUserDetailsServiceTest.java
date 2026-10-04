package monolithe.auth_service.security;

import monolithe.auth_service.dto.AuthenticationContext;
import monolithe.auth_service.repository.AuthenticationContextRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomUserDetailsServiceTest {

    private AuthenticationContextRepository authenticationContextRepository;
    private CustomUserDetailsService userDetailsService;

    @BeforeEach
    void setUp() {
        authenticationContextRepository =
                mock(AuthenticationContextRepository.class);
        userDetailsService =
                new CustomUserDetailsService(authenticationContextRepository);
    }

    @Test
    void debeCargarRolYPermisosActivosComoAuthorities() {

        AuthenticationContext contexto = new AuthenticationContext(
                1L,
                "admin",
                "hash-password",
                false,
                null,
                true,
                true,
                List.of("ROLE_ADMINISTRADOR", "SEGURIDAD_AUDITORIA_VER"));

        when(authenticationContextRepository.obtenerPorLogin("admin"))
                .thenReturn(Optional.of(contexto));

        UserPrincipal principal =
                (UserPrincipal) userDetailsService.loadUserByUsername("admin");

        List<String> authorities = principal.getAuthorities()
                .stream()
                .map(a -> a.getAuthority())
                .toList();

        assertTrue(authorities.contains("ROLE_ADMINISTRADOR"));
        assertTrue(authorities.contains("SEGURIDAD_AUDITORIA_VER"));
        assertTrue(principal.isEnabled());
        assertTrue(principal.isAccountNonLocked());
    }

    @Test
    void noDebeHabilitarUsuarioSiPermiteAccesoEsFalso() {

        AuthenticationContext contexto = new AuthenticationContext(
                1L,
                "admin",
                "hash-password",
                false,
                null,
                true,
                false,
                List.of());

        when(authenticationContextRepository.obtenerPorLogin("admin"))
                .thenReturn(Optional.of(contexto));

        UserPrincipal principal =
                (UserPrincipal) userDetailsService.loadUserByUsername("admin");

        assertFalse(principal.isEnabled());
    }

    @Test
    void debeLanzarExcepcionSiUsuarioNoExiste() {

        when(authenticationContextRepository.obtenerPorLogin("desconocido"))
                .thenReturn(Optional.empty());

        assertThrows(
                UsernameNotFoundException.class,
                () -> userDetailsService.loadUserByUsername("desconocido"));
    }

    @Test
    void noDebeHabilitarUsuarioSiEstadoNoActivo() {

        AuthenticationContext contexto = new AuthenticationContext(
                2L,
                "inactivo",
                "hash-password",
                false,
                null,
                false,
                true,
                List.of());

        when(authenticationContextRepository.obtenerPorLogin("inactivo"))
                .thenReturn(Optional.of(contexto));

        UserPrincipal principal =
                (UserPrincipal) userDetailsService.loadUserByUsername("inactivo");

        assertFalse(principal.isEnabled());
    }
}