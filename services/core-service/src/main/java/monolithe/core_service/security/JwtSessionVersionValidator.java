package monolithe.core_service.security;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public class JwtSessionVersionValidator implements OAuth2TokenValidator<Jwt> {

    private static final String SQL_TOKEN_VIGENTE =
            "SELECT public.fn_seguridad_token_vigente(?, ?)";

    private static final OAuth2Error ERROR_TOKEN_INVALIDO =
            new OAuth2Error(
                    OAuth2ErrorCodes.INVALID_TOKEN,
                    "El token no está vigente o la sesión ha sido invalidada.",
                    null);

    private final JdbcTemplate jdbcTemplate;

    public JwtSessionVersionValidator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        Long idUsuario = extraerIdUsuario(jwt);
        Long sessionVersion = extraerSessionVersion(jwt);

        if (idUsuario == null || sessionVersion == null) {
            return OAuth2TokenValidatorResult.failure(ERROR_TOKEN_INVALIDO);
        }

        if (!consultarVigencia(idUsuario, sessionVersion)) {
            return OAuth2TokenValidatorResult.failure(ERROR_TOKEN_INVALIDO);
        }

        return OAuth2TokenValidatorResult.success();
    }

    private Long extraerIdUsuario(Jwt jwt) {
        String sub = jwt.getSubject();
        if (sub == null || sub.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(sub.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long extraerSessionVersion(Jwt jwt) {
        Object claim = jwt.getClaim("session_version");
        if (claim == null) {
            return 0L;
        }
        if (claim instanceof Number num) {
            return num.longValue();
        }
        if (claim instanceof String str) {
            try {
                return Long.parseLong(str.trim());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private boolean consultarVigencia(Long idUsuario, Long sessionVersion) {
        try {
            Boolean vigente = jdbcTemplate.queryForObject(
                    SQL_TOKEN_VIGENTE,
                    Boolean.class,
                    idUsuario,
                    sessionVersion);
            return Boolean.TRUE.equals(vigente);
        } catch (Exception e) {
            return false;
        }
    }
}
