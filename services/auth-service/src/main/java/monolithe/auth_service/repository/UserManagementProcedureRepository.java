package monolithe.auth_service.repository;

import monolithe.auth_service.repository.projection.CreatedUserResult;
import monolithe.auth_service.repository.projection.SecurityOperationResult;
import monolithe.auth_service.repository.projection.ActivatedUserResult;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlOutParameter;
import org.springframework.jdbc.core.SqlParameter;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.simple.SimpleJdbcCall;
import org.springframework.stereotype.Repository;

import java.sql.Types;
import java.util.Map;
import java.time.OffsetDateTime;

@Repository
public class UserManagementProcedureRepository {

        private final SimpleJdbcCall callCrearUsuario;
        private final SimpleJdbcCall callActivarUsuario;
        private final SimpleJdbcCall callDesactivarUsuario;
        private final SimpleJdbcCall callAsignarRol;
        private final SimpleJdbcCall callRevocarRol;
        private final SimpleJdbcCall callAsociarCorreo;
        private final SimpleJdbcCall callActualizarLogin;

        public UserManagementProcedureRepository(
                        JdbcTemplate jdbcTemplate) {

                this.callCrearUsuario = new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName(
                                                "sp_crear_usuario_seguridad")
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter(
                                                                "p_id_actor",
                                                                Types.BIGINT),

                                                new SqlParameter(
                                                                "p_id_persona",
                                                                Types.BIGINT),

                                                new SqlParameter(
                                                                "p_usuario_login",
                                                                Types.VARCHAR),

                                                new SqlParameter(
                                                                "p_password_hash",
                                                                Types.VARCHAR),

                                                new SqlOutParameter(
                                                                "p_id_usuario",
                                                                Types.BIGINT),

                                                new SqlOutParameter(
                                                                "p_estado",
                                                                Types.VARCHAR),

                                                new SqlOutParameter(
                                                                "p_mensaje",
                                                                Types.VARCHAR));

                this.callActivarUsuario = new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName(
                                                "sp_activar_usuario_seguridad")
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter("p_id_actor", Types.BIGINT),

                                                new SqlParameter("p_id_usuario", Types.BIGINT),

                                                new SqlParameter("p_password_hash", Types.VARCHAR),

                                                new SqlParameter("p_password_temporal_expira_en",
                                                                Types.TIMESTAMP_WITH_TIMEZONE),

                                                new SqlOutParameter("p_usuario_login", Types.VARCHAR),

                                                new SqlOutParameter("p_correo", Types.VARCHAR),

                                                new SqlOutParameter("p_estado", Types.VARCHAR),

                                                new SqlOutParameter("p_mensaje", Types.VARCHAR));

                this.callDesactivarUsuario = crearCallOperacionUsuario(
                                jdbcTemplate,
                                "sp_desactivar_usuario_seguridad");

                this.callAsignarRol = crearCallOperacionRol(
                                jdbcTemplate,
                                "sp_asignar_rol_usuario");

                this.callRevocarRol = crearCallOperacionRol(
                                jdbcTemplate,
                                "sp_revocar_rol_usuario");

                this.callAsociarCorreo = new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName("sp_asociar_correo_persona_seguridad")
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter("p_id_actor", Types.BIGINT),
                                                new SqlParameter("p_id_persona", Types.BIGINT),
                                                new SqlParameter("p_correo", Types.VARCHAR),
                                                new SqlOutParameter("p_estado", Types.VARCHAR),
                                                new SqlOutParameter("p_mensaje", Types.VARCHAR));

                this.callActualizarLogin = new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName("sp_actualizar_login_usuario")
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter("p_id_actor", Types.BIGINT),
                                                new SqlParameter("p_id_usuario", Types.BIGINT),
                                                new SqlParameter("p_nuevo_login", Types.VARCHAR),
                                                new SqlOutParameter("p_estado", Types.VARCHAR),
                                                new SqlOutParameter("p_mensaje", Types.VARCHAR));
        }

        private SimpleJdbcCall crearCallOperacionUsuario(
                        JdbcTemplate jdbcTemplate,
                        String procedureName) {

                return new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName(procedureName)
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter(
                                                                "p_id_actor",
                                                                Types.BIGINT),

                                                new SqlParameter(
                                                                "p_id_usuario",
                                                                Types.BIGINT),

                                                new SqlOutParameter(
                                                                "p_estado",
                                                                Types.VARCHAR),

                                                new SqlOutParameter(
                                                                "p_mensaje",
                                                                Types.VARCHAR));
        }

        private SimpleJdbcCall crearCallOperacionRol(
                        JdbcTemplate jdbcTemplate,
                        String procedureName) {

                return new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName(procedureName)
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter(
                                                                "p_id_actor",
                                                                Types.BIGINT),

                                                new SqlParameter(
                                                                "p_id_usuario",
                                                                Types.BIGINT),

                                                new SqlParameter(
                                                                "p_codigo_rol",
                                                                Types.VARCHAR),

                                                new SqlOutParameter(
                                                                "p_estado",
                                                                Types.VARCHAR),

                                                new SqlOutParameter(
                                                                "p_mensaje",
                                                                Types.VARCHAR));
        }

        public SecurityOperationResult asociarCorreoPersona(
                        Long idActor,
                        Long idPersona,
                        String correo) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue("p_id_actor", idActor)
                                .addValue("p_id_persona", idPersona)
                                .addValue("p_correo", correo);

                Map<String, Object> out = callAsociarCorreo.execute(params);

                return new SecurityOperationResult(
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        public SecurityOperationResult actualizarLoginUsuario(
                        Long idActor,
                        Long idUsuario,
                        String nuevoLogin) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue("p_id_actor", idActor)
                                .addValue("p_id_usuario", idUsuario)
                                .addValue("p_nuevo_login", nuevoLogin);

                Map<String, Object> out = callActualizarLogin.execute(params);

                return new SecurityOperationResult(
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        public CreatedUserResult crearUsuario(
                        Long idActor,
                        Long idPersona,
                        String usuarioLogin,
                        String passwordHash) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue(
                                                "p_id_actor",
                                                idActor)
                                .addValue(
                                                "p_id_persona",
                                                idPersona)
                                .addValue(
                                                "p_usuario_login",
                                                usuarioLogin)
                                .addValue(
                                                "p_password_hash",
                                                passwordHash);

                Map<String, Object> out = callCrearUsuario.execute(params);

                return new CreatedUserResult(
                                toLong(
                                                out.get("p_id_usuario")),
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        public ActivatedUserResult activarUsuario(
                        Long idActor,
                        Long idUsuario,
                        String passwordHash,
                        OffsetDateTime passwordTemporalExpiraEn) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue(
                                                "p_id_actor",
                                                idActor)
                                .addValue(
                                                "p_id_usuario",
                                                idUsuario)
                                .addValue(
                                                "p_password_hash",
                                                passwordHash)
                                .addValue(
                                                "p_password_temporal_expira_en",
                                                passwordTemporalExpiraEn);

                Map<String, Object> out = callActivarUsuario.execute(params);

                return new ActivatedUserResult(
                                (String) out.get("p_usuario_login"),
                                (String) out.get("p_correo"),
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        public SecurityOperationResult desactivarUsuario(
                        Long idActor,
                        Long idUsuario) {

                return ejecutarOperacionUsuario(
                                callDesactivarUsuario,
                                idActor,
                                idUsuario);
        }

        public SecurityOperationResult asignarRol(
                        Long idActor,
                        Long idUsuario,
                        String codigoRol) {

                return ejecutarOperacionRol(
                                callAsignarRol,
                                idActor,
                                idUsuario,
                                codigoRol);
        }

        public SecurityOperationResult revocarRol(
                        Long idActor,
                        Long idUsuario,
                        String codigoRol) {

                return ejecutarOperacionRol(
                                callRevocarRol,
                                idActor,
                                idUsuario,
                                codigoRol);
        }

        private SecurityOperationResult ejecutarOperacionUsuario(
                        SimpleJdbcCall call,
                        Long idActor,
                        Long idUsuario) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue(
                                                "p_id_actor",
                                                idActor)
                                .addValue(
                                                "p_id_usuario",
                                                idUsuario);

                Map<String, Object> out = call.execute(params);

                return new SecurityOperationResult(
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        private SecurityOperationResult ejecutarOperacionRol(
                        SimpleJdbcCall call,
                        Long idActor,
                        Long idUsuario,
                        String codigoRol) {

                MapSqlParameterSource params = new MapSqlParameterSource()
                                .addValue(
                                                "p_id_actor",
                                                idActor)
                                .addValue(
                                                "p_id_usuario",
                                                idUsuario)
                                .addValue(
                                                "p_codigo_rol",
                                                codigoRol);

                Map<String, Object> out = call.execute(params);

                return new SecurityOperationResult(
                                (String) out.get("p_estado"),
                                (String) out.get("p_mensaje"));
        }

        private Long toLong(
                        Object rawValue) {

                if (rawValue == null) {
                        return null;
                }

                if (rawValue instanceof Number numero) {
                        return numero.longValue();
                }

                return Long.valueOf(
                                rawValue.toString());
        }
}