
package monolithe.core_service.repository;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class TrabajadorProcedureRepository {

        private final JdbcTemplate jdbcTemplate;
        private final JsonMapper jsonMapper;

        public record ResultadoProcedimiento(
                        JsonNode resultado,
                        String estado,
                        String mensaje) {
        }

        public ResultadoProcedimiento registrarTrabajador(
                        Long idActor,
                        String datosJson) {
                String sql = """
                                CALL public.sp_rrhh_registrar_trabajador(
                                    ?, CAST(? AS jsonb), NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                datosJson);
        }

        public ResultadoProcedimiento listarTrabajadores(
                        Long idActor) {
                String sql = """
                                CALL public.sp_rrhh_listar_trabajadores(
                                    ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor);
        }

        public ResultadoProcedimiento obtenerTrabajador(
                        Long idActor,
                        Long idTrabajador) {
                String sql = """
                                CALL public.sp_rrhh_obtener_trabajador(
                                    ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador);
        }

        public ResultadoProcedimiento obtenerCatalogos(
                        Long idActor) {
                String sql = """
                                CALL public.sp_rrhh_obtener_catalogos(
                                    ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor);
        }

        public ResultadoProcedimiento identificarPersona(
                        Long idActor,
                        int idTipoDocumento,
                        String numeroDocumento) {

                String sql = """
                                CALL public.sp_rrhh_identificar_persona(
                                    ?, ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTipoDocumento,
                                numeroDocumento);
        }

        private ResultadoProcedimiento mapearResultado(
                        String json,
                        String estado,
                        String mensaje) {
                try {
                        JsonNode resultado = json != null
                                        ? jsonMapper.readTree(json)
                                        : null;

                        return new ResultadoProcedimiento(
                                        resultado,
                                        estado,
                                        mensaje);

                } catch (JacksonException ex) {
                        throw new IllegalStateException(
                                        "No se pudo interpretar la respuesta "
                                                        + "del procedimiento de RRHH.",
                                        ex);
                }
        }
}
