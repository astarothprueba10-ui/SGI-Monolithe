package monolithe.auth_service.repository;

import lombok.extern.slf4j.Slf4j;
import monolithe.auth_service.dto.AuthenticationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
@Slf4j
public class AuthenticationContextRepository {

    private final SimpleJdbcCall jdbcCall;

    public AuthenticationContextRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcCall = new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName("sp_obtener_contexto_autenticacion")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter("p_login", Types.VARCHAR),
                        new SqlOutParameter("p_id_usuario", Types.BIGINT),
                        new SqlOutParameter("p_usuario_login", Types.VARCHAR),
                        new SqlOutParameter("p_password_hash", Types.VARCHAR),
                        new SqlOutParameter("p_requiere_cambio_password", Types.BOOLEAN),
                        new SqlOutParameter("p_bloqueado_hasta", Types.TIMESTAMP),
                        new SqlOutParameter("p_estado_activo", Types.BOOLEAN),
                        new SqlOutParameter("p_permite_acceso", Types.BOOLEAN),
                        new SqlOutParameter("p_authorities", Types.ARRAY));
    }

    public Optional<AuthenticationContext> obtenerPorLogin(String login) {
        try {
            Map<String, Object> resultado = jdbcCall.execute(login);

            Long idUsuario = (Long) resultado.get("p_id_usuario");
            if (idUsuario == null) {
                return Optional.empty();
            }

            String usuarioLogin = (String) resultado.get("p_usuario_login");
            String passwordHash = (String) resultado.get("p_password_hash");
            Boolean requiereCambio = (Boolean) resultado.get("p_requiere_cambio_password");
            Timestamp bloqueadoHastaTs = (Timestamp) resultado.get("p_bloqueado_hasta");
            Boolean estadoActivo = (Boolean) resultado.get("p_estado_activo");
            Boolean permiteAcceso = (Boolean) resultado.get("p_permite_acceso");
            Object rawAuthorities = resultado.get("p_authorities");

            LocalDateTime bloqueadoHasta = bloqueadoHastaTs != null
                    ? bloqueadoHastaTs.toLocalDateTime()
                    : null;

            return Optional.of(new AuthenticationContext(
                    idUsuario,
                    usuarioLogin,
                    passwordHash,
                    Boolean.TRUE.equals(requiereCambio),
                    bloqueadoHasta,
                    Boolean.TRUE.equals(estadoActivo),
                    Boolean.TRUE.equals(permiteAcceso),
                    toStringList(rawAuthorities)));
        } catch (Exception e) {
            log.error(
                    "ERROR AUTH CONTEXT ejecutando sp_obtener_contexto_autenticacion para login={}: {}",
                    login,
                    e.getMessage(),
                    e
            );
            throw e;
        }
    }

    private List<String> toStringList(Object rawArray) {
        if (rawArray == null) {
            return Collections.emptyList();
        }
        try {
            Object[] elements = (Object[]) ((Array) rawArray).getArray();
            List<String> result = new ArrayList<>(elements.length);
            for (Object element : elements) {
                if (element != null) {
                    result.add(element.toString());
                }
            }
            return Collections.unmodifiableList(result);
        } catch (SQLException e) {
            log.warn("No se pudo convertir el array de authorities: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
