package monolithe.auth_service.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.Map;

@Repository
public class UserVisualIdentityRepository {

    private final SimpleJdbcCall obtenerIdentidadCall;

    public UserVisualIdentityRepository(JdbcTemplate jdbcTemplate) {
        this.obtenerIdentidadCall = new SimpleJdbcCall(jdbcTemplate)
                .withSchemaName("public")
                .withProcedureName("sp_obtener_identidad_visual_usuario")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter(
                                "p_id_usuario",
                                Types.BIGINT
                        ),
                        new SqlOutParameter(
                                "p_nombre_mostrar",
                                Types.VARCHAR
                        ),
                        new SqlOutParameter(
                                "p_iniciales",
                                Types.VARCHAR
                        )
                );
    }

    public IdentidadVisual obtenerPorIdUsuario(Long idUsuario) {

        Map<String, Object> resultado = obtenerIdentidadCall.execute(
                new MapSqlParameterSource()
                        .addValue("p_id_usuario", idUsuario)
        );

        return new IdentidadVisual(
                (String) resultado.get("p_nombre_mostrar"),
                (String) resultado.get("p_iniciales")
        );
    }

    public record IdentidadVisual(
            String nombreMostrar,
            String iniciales
    ) {
    }
}