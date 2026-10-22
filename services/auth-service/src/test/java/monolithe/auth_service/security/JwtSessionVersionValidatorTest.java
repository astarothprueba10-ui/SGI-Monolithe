package monolithe.auth_service.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class JwtSessionVersionValidatorTest {

    private static final String SQL_VIGENTE =
            "SELECT public.fn_seguridad_token_vigente(?, ?)";

    private JdbcTemplate jdbcTemplate;
    private JwtSessionVersionValidator validator;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        validator = new JwtSessionVersionValidator(jdbcTemplate);
    }

    @Test
    void debeValidarJwtValidoConVersion0() {
        Jwt jwt = crearJwt("1", 0L);

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenReturn(Boolean.TRUE);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertFalse(resultado.hasErrors());
    }

    @Test
    void debeInterpretarJwtAntiguoSinSessionVersionComoVersion0() {
        Jwt jwt = crearJwtSinSessionVersion("1");

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenReturn(Boolean.TRUE);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertFalse(resultado.hasErrors());
    }

    @Test
    void debeRechazarJwtConVersionObsoleta() {
        Jwt jwt = crearJwt("1", 0L);

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenReturn(Boolean.FALSE);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        assertEquals(
                "invalid_token",
                resultado.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void debeRechazarJwtCuandoUsuarioEstaInactivo() {
        Jwt jwt = crearJwt("2", 0L);

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(2L),
                eq(0L)))
                .thenReturn(Boolean.FALSE);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        assertEquals(
                "invalid_token",
                resultado.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void debeRechazarJwtCuandoTrabajadorEnVerificacionOCesado() {
        Jwt jwt = crearJwt("3", 0L);

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(3L),
                eq(0L)))
                .thenReturn(Boolean.FALSE);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        assertEquals(
                "invalid_token",
                resultado.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void debeRechazarJwtCuandoOcurreErrorDeBaseDeDatosFailClosed() {
        Jwt jwt = crearJwt("1", 0L);

        when(jdbcTemplate.queryForObject(
                eq(SQL_VIGENTE),
                eq(Boolean.class),
                eq(1L),
                eq(0L)))
                .thenThrow(new DataAccessResourceFailureException("Conexión perdida"));

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        assertEquals(
                "invalid_token",
                resultado.getErrors().iterator().next().getErrorCode());
    }

    @Test
    void debeRechazarJwtCuandoSubjectEsInvalido() {
        Jwt jwt = crearJwt("invalido", 0L);

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        verify(jdbcTemplate, never()).queryForObject(any(), eq(Boolean.class), any(), any());
    }

    @Test
    void debeRechazarJwtCuandoSessionVersionEsInvalida() {
        Jwt jwt = crearJwtConClaimInvalido("1", "abc");

        OAuth2TokenValidatorResult resultado = validator.validate(jwt);

        assertTrue(resultado.hasErrors());
        verify(jdbcTemplate, never()).queryForObject(any(), eq(Boolean.class), any(), any());
    }

    private Jwt crearJwt(String sub, Long sessionVersion) {
        return Jwt.withTokenValue("token-prueba")
                .header("alg", "RS256")
                .subject(sub)
                .claim("session_version", sessionVersion)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    private Jwt crearJwtSinSessionVersion(String sub) {
        return Jwt.withTokenValue("token-prueba-migracion")
                .header("alg", "RS256")
                .subject(sub)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    private Jwt crearJwtConClaimInvalido(String sub, Object valorInvalido) {
        return Jwt.withTokenValue("token-prueba-invalido")
                .header("alg", "RS256")
                .subject(sub)
                .claim("session_version", valorInvalido)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }
}
