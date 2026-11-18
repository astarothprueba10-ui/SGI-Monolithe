package monolithe.auth_service.repository;

import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.dto.AuthenticationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Procedimiento PostgreSQL real con 1 parámetro IN y 8 OUT.
 * Evita SimpleJdbcCall, que el driver puede reinterpretar como SELECT a función.
 */
@Repository
@Slf4j
public class AuthenticationContextRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthenticationContextRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Optional<AuthenticationContext> obtenerPorLogin(String login) {
        try {
            return jdbcTemplate.query("""
                    CALL public.sp_obtener_contexto_autenticacion(
                        CAST(? AS varchar),
                        NULL::bigint,
                        NULL::varchar,
                        NULL::varchar,
                        NULL::boolean,
                        NULL::timestamp,
                        NULL::boolean,
                        NULL::boolean,
                        NULL::text[]
                    )
                    """,
                ps -> ps.setString(1, login),
                rs -> {
                    if (!rs.next()) {
                        return Optional.<AuthenticationContext>empty();
                    }

                    Long idUsuario = rs.getObject("p_id_usuario", Long.class);
                    if (idUsuario == null) {
                        return Optional.<AuthenticationContext>empty();
                    }

                    Timestamp bloqueadoHastaTs = rs.getTimestamp("p_bloqueado_hasta");
                    LocalDateTime bloqueadoHasta = bloqueadoHastaTs != null
                        ? bloqueadoHastaTs.toLocalDateTime()
                        : null;

                    return Optional.of(new AuthenticationContext(
                        idUsuario,
                        rs.getString("p_usuario_login"),
                        rs.getString("p_password_hash"),
                        Boolean.TRUE.equals(rs.getObject("p_requiere_cambio_password", Boolean.class)),
                        bloqueadoHasta,
                        Boolean.TRUE.equals(rs.getObject("p_estado_activo", Boolean.class)),
                        Boolean.TRUE.equals(rs.getObject("p_permite_acceso", Boolean.class)),
                        toStringList(rs.getArray("p_authorities"))
                    ));
                });
        } catch (RuntimeException e) {
            log.error("Error al obtener el contexto de autenticación. Tipo de error: {}",
                e.getClass().getSimpleName());
            throw e;
        }
    }

    private List<String> toStringList(Array rawArray) {
        if (rawArray == null) {
            return Collections.emptyList();
        }
        try {
            Object[] elements = (Object[]) rawArray.getArray();
            List<String> result = new ArrayList<>(elements.length);
            for (Object element : elements) {
                if (element != null) {
                    result.add(element.toString());
                }
            }
            return Collections.unmodifiableList(result);
        } catch (SQLException e) {
            log.warn("No se pudo convertir el array de authorities: {}",
                e.getClass().getSimpleName());
            return Collections.emptyList();
        }
    }
}
