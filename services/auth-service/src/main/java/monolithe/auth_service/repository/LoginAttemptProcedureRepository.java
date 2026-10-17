
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
public class LoginAttemptProcedureRepository {

        private final SimpleJdbcCall registrarIntentoCall;

        public LoginAttemptProcedureRepository(
                        JdbcTemplate jdbcTemplate) {
                this.registrarIntentoCall = new SimpleJdbcCall(jdbcTemplate)
                                .withSchemaName("public")
                                .withProcedureName(
                                                "sp_registrar_intento_login_fallido")
                                .withoutProcedureColumnMetaDataAccess()
                                .declareParameters(
                                                new SqlParameter(
                                                                "p_login",
                                                                Types.VARCHAR),
                                                new SqlParameter(
                                                                "p_max_intentos",
                                                                Types.INTEGER),
                                                new SqlParameter(
                                                                "p_duracion_bloqueo_segundos",
                                                                Types.BIGINT),
                                                new SqlOutParameter(
                                                                "p_id_usuario",
                                                                Types.BIGINT),
                                                new SqlOutParameter(
                                                                "p_intentos_fallidos",
                                                                Types.INTEGER),
                                                new SqlOutParameter(
                                                                "p_bloqueado_ahora",
                                                                Types.BOOLEAN),
                                                new SqlOutParameter(
                                                                "p_bloqueado_hasta",
                                                                Types.TIMESTAMP));
        }

        public Long registrarIntentoFallido(
                        String login,
                        int maxIntentos,
                        long duracionBloqueoSegundos) {

                Map<String, Object> resultado = registrarIntentoCall.execute(
                                new MapSqlParameterSource()
                                                .addValue("p_login", login)
                                                .addValue(
                                                                "p_max_intentos",
                                                                maxIntentos)
                                                .addValue(
                                                                "p_duracion_bloqueo_segundos",
                                                                duracionBloqueoSegundos));

                boolean bloqueadoAhora = Boolean.TRUE.equals(
                                resultado.get("p_bloqueado_ahora"));

                if (!bloqueadoAhora) {
                        return null;
                }

                Object idUsuario = resultado.get("p_id_usuario");

                return idUsuario instanceof Number numero
                                ? numero.longValue()
                                : null;
        }
}
