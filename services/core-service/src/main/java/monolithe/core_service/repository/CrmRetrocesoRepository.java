package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
@RequiredArgsConstructor
public class CrmRetrocesoRepository {

    private final JdbcTemplate jdbcTemplate;

    public String solicitarRetroceso(Long actor, Long prospecto, String estadoDestino,
            String motivoCodigo, String motivoDetallado) {
        String sql = """
                SELECT public.sp_crm_solicitar_retroceso_v1(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS varchar), CAST(? AS text)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class,
                actor, prospecto, estadoDestino, motivoCodigo, motivoDetallado);
    }

    public String resolverRetroceso(Long actor, Long solicitud, boolean aprobar, String observacion) {
        String sql = """
                SELECT public.sp_crm_resolver_retroceso_v1(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS boolean), CAST(? AS text)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class,
                actor, solicitud, aprobar, observacion);
    }

    public String listarSolicitudes(Long actor, OffsetDateTime desde, OffsetDateTime hasta,
            String estado, String busqueda, Integer pagina, Integer tamano, Long asesor) {
        String sql = """
                SELECT public.sp_crm_listar_solicitudes_retroceso_v2(
                    CAST(? AS bigint), CAST(? AS timestamptz), CAST(? AS timestamptz),
                    CAST(? AS varchar), CAST(? AS varchar), CAST(? AS integer), CAST(? AS integer),
                    CAST(? AS bigint)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class,
                actor, desde, hasta, estado, busqueda, pagina, tamano, asesor);
    }

    public String listarSolicitudes(Long actor, OffsetDateTime desde, OffsetDateTime hasta,
            String estado, String busqueda, Integer pagina, Integer tamano) {
        return listarSolicitudes(actor, desde, hasta, estado, busqueda, pagina, tamano, null);
    }

    public String obtenerIndicadores(Long actor, OffsetDateTime desde, OffsetDateTime hasta, Long asesor) {
        String sql = """
                SELECT public.sp_crm_indicadores_retroceso_v2(
                    CAST(? AS bigint), CAST(? AS timestamptz), CAST(? AS timestamptz),
                    CAST(? AS bigint)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class, actor, desde, hasta, asesor);
    }

    public String obtenerIndicadores(Long actor, OffsetDateTime desde, OffsetDateTime hasta) {
        return obtenerIndicadores(actor, desde, hasta, null);
    }

    public String catalogoMotivos(Long actor) {
        String sql = "SELECT public.sp_crm_catalogo_motivos_retroceso_v1(CAST(? AS bigint))::text";
        return jdbcTemplate.queryForObject(sql, String.class, actor);
    }

    public String adjuntarEvidencia(Long actor, Long solicitud, String ruta, String nombre, String mime) {
        String sql = """
                SELECT public.sp_crm_adjuntar_evidencia_retroceso_v1(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS text),
                    CAST(? AS text), CAST(? AS text)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class, actor, solicitud, ruta, nombre, mime);
    }

    public String obtenerRutaEvidencia(Long actor, Long solicitud) {
        String sql = """
                SELECT public.sp_crm_ruta_evidencia_retroceso_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class, actor, solicitud);
    }

    public String miRetrocesoPendiente(Long actor, Long prospecto) {
        String sql = """
                SELECT public.sp_crm_mi_retroceso_pendiente_v1(
                    CAST(? AS bigint), CAST(? AS bigint)
                )::text
                """;
        return jdbcTemplate.queryForObject(sql, String.class, actor, prospecto);
    }
}
