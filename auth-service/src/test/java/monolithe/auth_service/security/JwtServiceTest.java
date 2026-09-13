package monolithe.auth_service.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class JwtServiceTest {

    private JwtEncoder jwtEncoder;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {

        jwtEncoder = mock(JwtEncoder.class);

        jwtService = new JwtService(jwtEncoder);

        ReflectionTestUtils.setField(
                jwtService,
                "issuer",
                "monolithe-auth-service");

        ReflectionTestUtils.setField(
                jwtService,
                "accessTokenExpiration",
                900L);
    }

    @Test
    void debeGenerarJwtConAuthoritiesYDatosDelUsuario() {

        UserPrincipal principal = crearPrincipal(false);

        Jwt jwtGenerado = mock(Jwt.class);

        when(jwtGenerado.getTokenValue())
                .thenReturn("jwt-prueba");

        when(jwtEncoder.encode(any(JwtEncoderParameters.class)))
                .thenReturn(jwtGenerado);

        String token = jwtService.generarAccessToken(principal);

        assertEquals(
                "jwt-prueba",
                token);

        ArgumentCaptor<JwtEncoderParameters> captor = ArgumentCaptor.forClass(
                JwtEncoderParameters.class);

        verify(jwtEncoder)
                .encode(captor.capture());

        var claims = captor.getValue().getClaims();

        assertEquals(
                "1",
                claims.getSubject());

        assertEquals(
                "monolithe-auth-service",
                claims.getClaimAsString("iss"));

        assertEquals(
                "admin",
                claims.getClaim("username"));

        List<String> authorities = claims.getClaim("authorities");

        assertNotNull(authorities);

        assertTrue(
                authorities.contains(
                        "ROLE_ADMINISTRADOR"));

        assertTrue(
                authorities.contains(
                        "SEGURIDAD_AUDITORIA_VER"));

        assertEquals(
                false,
                claims.getClaim(
                        "password_change_required"));

        assertNotNull(
                claims.getId());

        assertNotNull(
                claims.getIssuedAt());

        assertNotNull(
                claims.getExpiresAt());
    }

    @Test
    void debeIncluirCambioPasswordObligatorioEnJwt() {

        UserPrincipal principal = crearPrincipal(true);

        Jwt jwtGenerado = mock(Jwt.class);

        when(jwtGenerado.getTokenValue())
                .thenReturn("jwt-cambio-password");

        when(jwtEncoder.encode(any(JwtEncoderParameters.class)))
                .thenReturn(jwtGenerado);

        jwtService.generarAccessToken(principal);

        ArgumentCaptor<JwtEncoderParameters> captor = ArgumentCaptor.forClass(
                JwtEncoderParameters.class);

        verify(jwtEncoder)
                .encode(captor.capture());

        Boolean requiereCambio = captor.getValue()
                .getClaims()
                .getClaim(
                        "password_change_required");

        assertTrue(
                Boolean.TRUE.equals(requiereCambio));
    }

    private UserPrincipal crearPrincipal(
            boolean requiereCambioPassword) {

        return new UserPrincipal(
                1L,
                "admin",
                "hash-password",
                List.of(
                        new SimpleGrantedAuthority(
                                "ROLE_ADMINISTRADOR"),
                        new SimpleGrantedAuthority(
                                "SEGURIDAD_AUDITORIA_VER")),
                true,
                true,
                requiereCambioPassword);
    }
}