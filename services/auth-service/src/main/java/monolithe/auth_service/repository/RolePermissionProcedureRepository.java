package monolithe.auth_service.repository;

import monolithe.auth_service.repository.projection.SecurityOperationResult;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.List;
import java.util.Map;

@Repository
public class RolePermissionProcedureRepository {

    private final SimpleJdbcCall actualizarPermisosRol;
    private final SimpleJdbcCall crearRol;

    public RolePermissionProcedureRepository(JdbcTemplate jdbc) {
        actualizarPermisosRol = new SimpleJdbcCall(jdbc)
                .withSchemaName("public")
                .withProcedureName("sp_actualizar_permisos_rol_seguridad")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlParameter("p_codigo_rol", Types.VARCHAR),
                        new SqlParameter("p_codigos_permisos", Types.ARRAY),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));

        crearRol = new SimpleJdbcCall(jdbc)
                .withSchemaName("public")
                .withProcedureName("sp_crear_rol_seguridad")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlParameter("p_nombre", Types.VARCHAR),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));
    }

    public SecurityOperationResult crearRol(
            Long actor,
            String nombre) {

        Map<String, Object> out = crearRol.execute(
                new MapSqlParameterSource()
                        .addValue("p_id_actor", actor)
                        .addValue("p_nombre", nombre)
        );

        return new SecurityOperationResult(
                (String) out.get("p_estado"),
                (String) out.get("p_mensaje")
        );
    }

    public SecurityOperationResult actualizarPermisos(
            Long actor,
            String codigoRol,
            List<String> codigosPermisos) {

        Object[] permisos = codigosPermisos == null
                ? new Object[0]
                : codigosPermisos.toArray();

        Map<String, Object> out = actualizarPermisosRol.execute(
                new MapSqlParameterSource()
                        .addValue("p_id_actor", actor)
                        .addValue("p_codigo_rol", codigoRol)
                        .addValue(
                                "p_codigos_permisos",
                                new SqlArrayValue("text", permisos)
                        )
        );

        return new SecurityOperationResult(
                (String) out.get("p_estado"),
                (String) out.get("p_mensaje")
        );
    }
}