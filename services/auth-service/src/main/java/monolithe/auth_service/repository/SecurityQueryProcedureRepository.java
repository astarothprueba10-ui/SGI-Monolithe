package monolithe.auth_service.repository;

import monolithe.auth_service.repository.projection.SecurityQueryResult;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.Map;

@Repository
public class SecurityQueryProcedureRepository {

    private final SimpleJdbcCall listarUsuarios, listarRoles, listarPermisosRol, listarPersonas, listarAuditoriaSP;

    public SecurityQueryProcedureRepository(JdbcTemplate jdbc) {
        listarUsuarios = crearCallActor(jdbc, "sp_listar_usuarios_seguridad");
        listarRoles = crearCallActor(jdbc, "sp_listar_roles_seguridad");
        listarPersonas = crearCallActor(jdbc, "sp_listar_personas_sin_usuario");
        listarAuditoriaSP = crearCallActor(jdbc, "sp_listar_auditoria_seguridad");

        listarPermisosRol = new SimpleJdbcCall(jdbc)
                .withSchemaName("public")
                .withProcedureName("sp_listar_permisos_rol_seguridad")
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlParameter("p_codigo_rol", Types.VARCHAR),
                        new SqlOutParameter("p_resultado", Types.OTHER),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));
    }

    public SecurityQueryResult listarUsuarios(Long actor) { return ejecutarActor(listarUsuarios, actor); }
    public SecurityQueryResult listarRoles(Long actor) { return ejecutarActor(listarRoles, actor); }
    public SecurityQueryResult listarPersonasSinUsuario(Long actor) { return ejecutarActor(listarPersonas, actor); }
    public SecurityQueryResult listarAuditoria(Long actor) { return ejecutarActor(listarAuditoriaSP, actor); }

    public SecurityQueryResult listarPermisosRol(Long actor, String codigoRol) {
        Map<String, Object> out = listarPermisosRol.execute(new MapSqlParameterSource()
                .addValue("p_id_actor", actor)
                .addValue("p_codigo_rol", codigoRol));

        return convertir(out);
    }

    private SimpleJdbcCall crearCallActor(JdbcTemplate jdbc, String nombre) {
        return new SimpleJdbcCall(jdbc)
                .withSchemaName("public")
                .withProcedureName(nombre)
                .withoutProcedureColumnMetaDataAccess()
                .declareParameters(
                        new SqlParameter("p_id_actor", Types.BIGINT),
                        new SqlOutParameter("p_resultado", Types.OTHER),
                        new SqlOutParameter("p_estado", Types.VARCHAR),
                        new SqlOutParameter("p_mensaje", Types.VARCHAR));
    }

    private SecurityQueryResult ejecutarActor(SimpleJdbcCall call, Long actor) {
        return convertir(call.execute(new MapSqlParameterSource().addValue("p_id_actor", actor)));
    }

    private SecurityQueryResult convertir(Map<String, Object> out) {
        Object json = out.get("p_resultado");
        return new SecurityQueryResult(
                json == null ? "[]" : json.toString(),
                (String) out.get("p_estado"),
                (String) out.get("p_mensaje"));
    }
}