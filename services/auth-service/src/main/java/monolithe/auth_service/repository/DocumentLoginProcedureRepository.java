package monolithe.auth_service.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.Optional;

/**
 * PostgreSQL 17 define sp_resolver_login_documento como PROCEDURE (IN, IN, OUT).
 *
 * JDBC SimpleJdbcCall emite {call ...} y el driver PostgreSQL interpreta ese
 * escape como SELECT de una función por defecto. Para no depender de la
 * opción global escapeSyntaxCallMode, se invoca CALL de forma explícita.
 */
@Repository
public class DocumentLoginProcedureRepository {
    private final JdbcTemplate db;

    public DocumentLoginProcedureRepository(JdbcTemplate db) {
        this.db = db;
    }

    public Optional<String> resolverLogin(String tipoDocumento, String numeroDocumento) {
        return db.query(
            """
            CALL public.sp_resolver_login_documento(
                CAST(? AS varchar),
                CAST(? AS varchar),
                NULL::varchar
            )
            """,
            ps -> {
                ps.setString(1, tipoDocumento);
                ps.setString(2, numeroDocumento);
            },
            rs -> {
                if (!rs.next()) {
                    return Optional.<String>empty();
                }
                String usuario = rs.getString("p_usuario_login");
                return usuario == null || usuario.isBlank()
                    ? Optional.<String>empty()
                    : Optional.of(usuario);
            }
        );
    }
}
