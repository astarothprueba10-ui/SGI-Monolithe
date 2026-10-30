
package monolithe.cms_service.security;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtSessionVersionValidatorTest {

    private final JdbcTemplate jdbcTemplate =
            mock(JdbcTemplate.class);

    private final JwtSessionVersionValidator validator =
            new JwtSessionVersionValidator(jdbcTemplate);

    private Jwt crearJwt(boolean incluirVersion) {
        var builder = Jwt.withTokenValue("token-test")
                .header("alg", "RS256")
                .subject("1")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900));

        if (incluirVersion) {
            builder.claim("session_version", 0L);
        }

        return builder.build();
    }

    @Test
    void debeAceptarVersionVigente() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT public.fn_seguridad_token_vigente(?, ?)"),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenReturn(true);

        assertFalse(validator.validate(crearJwt(true)).hasErrors());
    }

    @Test
    void debeRechazarJwtSinVersionDeSesion() {
        assertTrue(validator.validate(crearJwt(false)).hasErrors());

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void debeRechazarVersionRevocada() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT public.fn_seguridad_token_vigente(?, ?)"),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenReturn(false);

        assertTrue(validator.validate(crearJwt(true)).hasErrors());
    }

    @Test
    void debeRechazarJwtSiFallaLaBaseDeDatos() {
        when(jdbcTemplate.queryForObject(
                eq("SELECT public.fn_seguridad_token_vigente(?, ?)"),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenThrow(new RuntimeException("DB no disponible"));

        assertTrue(validator.validate(crearJwt(true)).hasErrors());
    }
}
