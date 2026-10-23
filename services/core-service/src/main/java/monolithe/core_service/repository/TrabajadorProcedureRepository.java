
package monolithe.core_service.repository;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;

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

        public ResultadoProcedimiento actualizarTrabajador(
                        Long idActor,
                        Long idTrabajador,
                        String datosJson) {
                String sql = """
                                CALL public.sp_rrhh_actualizar_trabajador(
                                    ?, ?, CAST(? AS jsonb), NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                datosJson);
        }

        public ResultadoProcedimiento solicitarCorreccionDocumento(
                        Long idActor,
                        Long idTrabajador,
                        Integer idTipoDocumento,
                        String numeroDocumento,
                        String motivo) {

                String sql = """
                                CALL public.sp_rrhh_solicitar_correccion_documento(
                                    ?, ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                idTipoDocumento,
                                numeroDocumento,
                                motivo);
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

        public ResultadoProcedimiento solicitarCambioCorreo(
                        Long idActor,
                        Long idTrabajador,
                        String correoNuevo,
                        String tokenHash,
                        OffsetDateTime fechaExpiracion) {
                String sql = """
                                CALL public.sp_rrhh_solicitar_cambio_correo(
                                    ?, ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                correoNuevo,
                                tokenHash,
                                fechaExpiracion);
        }

        public ResultadoProcedimiento confirmarCambioCorreo(String tokenHash) {
                String sql = """
                                CALL public.sp_rrhh_confirmar_cambio_correo(
                                    ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                tokenHash);
        }

        public ResultadoProcedimiento listarSolicitudesCorreccion(Long idActor) {
                String sql = """
                                CALL public.sp_core_listar_solicitudes_correccion(
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

        public ResultadoProcedimiento obtenerDetalleCorreccion(
                        Long idActor,
                        Long idSolicitud) {

                String sql = """
                                CALL public.sp_core_obtener_detalle_correccion(
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
                                idSolicitud);
        }

        public String obtenerRutaEvidenciaCorreccion(
                        Long idActor,
                        Long idSolicitud) {

                String sql = """
                                SELECT evidencia_storage_path
                                FROM public.core_solicitudes_correccion_identidad
                                WHERE id_solicitud = ?
                                  AND estado = 'PENDIENTE'
                                  AND id_usuario_solicitante <> ?
                                  AND evidencia_storage_path IS NOT NULL
                                """;

                return jdbcTemplate.query(
                                sql,
                                (rs, rowNum) -> rs.getString("evidencia_storage_path"),
                                idSolicitud,
                                idActor).stream().findFirst().orElse(null);
        }

        public ResultadoProcedimiento resolverCorreccionIdentidad(
                        Long idActor,
                        Long idSolicitud,
                        String decision,
                        String motivo) {

                String sql = """
                                CALL public.sp_core_resolver_correccion_identidad(
                                    ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idSolicitud,
                                decision,
                                motivo);
        }

        public ResultadoProcedimiento adjuntarEvidenciaCorreccion(
                        Long idActor,
                        Long idSolicitud,
                        String storagePath,
                        String nombreArchivo,
                        String tipoMime) {

                String sql = """
                                CALL public.sp_core_adjuntar_evidencia_correccion(
                                    ?, ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;

                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idSolicitud,
                                storagePath,
                                nombreArchivo,
                                tipoMime);
        }

        public ResultadoProcedimiento programarSuspension(
                        Long idActor,
                        Long idTrabajador,
                        OffsetDateTime fechaInicio,
                        OffsetDateTime fechaFin,
                        String motivo) {
                String sql = """
                                CALL public.sp_rrhh_programar_suspension(
                                    ?, ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                fechaInicio,
                                fechaFin,
                                motivo);
        }

        public ResultadoProcedimiento cesarTrabajador(
                        Long idActor,
                        Long idTrabajador,
                        LocalDate fechaCese,
                        String motivo) {
                String sql = """
                                CALL public.sp_rrhh_cesar_trabajador(
                                    ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                fechaCese,
                                motivo);
        }

        public ResultadoProcedimiento solicitarReincorporacion(
                        Long idActor,
                        Long idTrabajador,
                        LocalDate nuevaFechaIngreso,
                        String motivo) {
                String sql = """
                                CALL public.sp_rrhh_solicitar_reincorporacion(
                                    ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                nuevaFechaIngreso,
                                motivo);
        }

        public ResultadoProcedimiento resolverReincorporacion(
                        Long idActor,
                        Long idSolicitud,
                        String decision,
                        String motivoResolucion) {
                String sql = """
                                CALL public.sp_rrhh_resolver_reincorporacion(
                                    ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                rs.getString("p_estado"),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idSolicitud,
                                decision,
                                motivoResolucion);
        }

        public ResultadoProcedimiento listarReincorporaciones(
                        Long idActor,
                        String estado,
                        Long idTrabajador) {
                String sql = """
                                CALL public.sp_rrhh_listar_reincorporaciones(
                                    ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                extraerColumnaEstado(rs),
                                                rs.getString("p_mensaje")),
                                idActor,
                                estado,
                                idTrabajador);
        }

        public ResultadoProcedimiento listarHistorialLaboral(
                        Long idActor,
                        Long idTrabajador,
                        String tipoEvento,
                        LocalDate fechaDesde,
                        LocalDate fechaHasta) {
                String sql = """
                                CALL public.sp_rrhh_listar_historial_laboral(
                                    ?, ?, ?, ?, ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                extraerColumnaEstado(rs),
                                                rs.getString("p_mensaje")),
                                idActor,
                                idTrabajador,
                                tipoEvento,
                                fechaDesde,
                                fechaHasta);
        }

        public ResultadoProcedimiento obtenerMetricasTrabajadores(Long idActor) {
                String sql = """
                                CALL public.sp_rrhh_obtener_metricas_trabajadores(
                                    ?, NULL, NULL, NULL
                                )
                                """;
                return jdbcTemplate.queryForObject(
                                sql,
                                (rs, rowNum) -> mapearResultado(
                                                rs.getString("p_resultado"),
                                                extraerColumnaEstado(rs),
                                                rs.getString("p_mensaje")),
                                idActor);
        }

        private String extraerColumnaEstado(ResultSet rs) {
                try {
                        return rs.getString("p_estado_respuesta");
                } catch (SQLException e) {
                        try {
                                return rs.getString("p_estado");
                        } catch (SQLException ex) {
                                return null;
                        }
                }
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
