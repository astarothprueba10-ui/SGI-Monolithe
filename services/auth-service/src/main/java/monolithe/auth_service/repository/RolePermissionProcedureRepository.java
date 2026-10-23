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
    private final SimpleJdbcCall actualizarRol;
    private final SimpleJdbcCall desactivarRol;
    private final SimpleJdbcCall reactivarRol;

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

        actualizarRol = crearCallRol(jdbc, "sp_actualizar_datos_rol_seguridad");
        desactivarRol = crearCallEstado(jdbc, "sp_desactivar_rol_seguridad");
        reactivarRol = crearCallEstado(jdbc, "sp_reactivar_rol_seguridad");
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

    /** Invoca el procedimiento transaccional que modifica los datos descriptivos del rol. */
    public SecurityOperationResult actualizarRol(Long actor, String codigo, String nombre, String descripcion) {
        Map<String, Object> out = actualizarRol.execute(new MapSqlParameterSource()
                .addValue("p_id_actor", actor)
                .addValue("p_codigo_rol", codigo)
                .addValue("p_nombre", nombre)
                .addValue("p_descripcion", descripcion));
        return resultado(out);
    }

    /** Invoca el procedimiento transaccional para desactivar un rol. */
    public SecurityOperationResult desactivarRol(Long actor, String codigo) {
        return ejecutarEstado(desactivarRol, actor, codigo);
    }

    /** Invoca el procedimiento transaccional para reactivar un rol. */
    public SecurityOperationResult reactivarRol(Long actor, String codigo) {
        return ejecutarEstado(reactivarRol, actor, codigo);
    }

    private SimpleJdbcCall crearCallEstado(JdbcTemplate jdbc, String procedimiento) {
        return new SimpleJdbcCall(jdbc).withSchemaName("public").withProcedureName(procedimiento)
                .withoutProcedureColumnMetaDataAccess().declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlParameter("p_codigo_rol", Types.VARCHAR),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));
    }

    private SimpleJdbcCall crearCallRol(JdbcTemplate jdbc, String procedimiento) {
        return new SimpleJdbcCall(jdbc).withSchemaName("public").withProcedureName(procedimiento)
                .withoutProcedureColumnMetaDataAccess().declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlParameter("p_codigo_rol", Types.VARCHAR),
                        new SqlParameter("p_nombre", Types.VARCHAR),
                        new SqlParameter("p_descripcion", Types.VARCHAR),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));
    }

    private SecurityOperationResult ejecutarEstado(SimpleJdbcCall llamada, Long actor, String codigo) {
        Map<String, Object> out = llamada.execute(new MapSqlParameterSource()
                .addValue("p_id_actor", actor)
                .addValue("p_codigo_rol", codigo));
        return resultado(out);
    }

    private SecurityOperationResult resultado(Map<String, Object> out) {
        return new SecurityOperationResult(
                (String) out.get("p_estado"),
                (String) out.get("p_mensaje"));
    }
}
