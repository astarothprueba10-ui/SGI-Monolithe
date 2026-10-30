
package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
@RequiredArgsConstructor
public class CrmExpedienteRepository {

    private final JdbcTemplate jdbcTemplate;

    // Autorizacion centralizada en Supabase.
    private static final String SQL_ACCESO_PROSPECTO = """
            SELECT public.fn_crm_puede_consultar_prospecto(
                CAST(? AS bigint),
                CAST(? AS bigint)
            )
            """;

    public boolean puedeConsultarProspecto(Long actor, Long prospecto) {
        return Boolean.TRUE.equals(
                jdbcTemplate.queryForObject(
                        SQL_ACCESO_PROSPECTO,
                        Boolean.class,
                        actor,
                        prospecto
                )
        );
    }

    // Catalogos del CRM.
    public String catalogos(Long actor) {
        return jdbcTemplate.queryForObject(
                """
                SELECT public.sp_crm_catalogos_v4(
                    CAST(? AS bigint)
                )::text
                """,
                String.class,
                actor
        );
    }

    // Detalle individual del prospecto.
    public String detalle(Long actor, Long prospecto) {
        return jdbcTemplate.queryForObject(
                """
                SELECT public.sp_crm_detalle_prospecto_v4(
                    CAST(? AS bigint),
                    CAST(? AS bigint)
                )::text
                """,
                String.class,
                actor,
                prospecto
        );
    }

    // Historial de visitas del prospecto.
    public String visitas(Long actor, Long prospecto, Integer limite) {
        return jdbcTemplate.queryForObject(
                """
                SELECT public.sp_crm_listar_visitas_v4(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS integer)
                )::text
                """,
                String.class,
                actor,
                prospecto,
                limite
        );
    }

    // Programacion de visitas comerciales.
    public String agendar(
            Long actor,
            Long prospecto,
            Long proyecto,
            OffsetDateTime fecha,
            String turno,
            String punto,
            String observacion) {

        return jdbcTemplate.queryForObject(
                """
                SELECT public.sp_crm_agendar_visita_v4(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS timestamptz),
                    CAST(? AS varchar),
                    CAST(? AS varchar),
                    CAST(? AS text)
                )::text
                """,
                String.class,
                actor,
                prospecto,
                proyecto,
                fecha,
                turno,
                punto,
                observacion
        );
    }

    // Actualizacion del estado de una visita.
    public String actualizarEstado(
            Long actor,
            Long visita,
            String estado,
            String observacion) {

        return jdbcTemplate.queryForObject(
                """
                SELECT public.sp_crm_actualizar_visita_v4(
                    CAST(? AS bigint),
                    CAST(? AS bigint),
                    CAST(? AS varchar),
                    CAST(? AS text)
                )::text
                """,
                String.class,
                actor,
                visita,
                estado,
                observacion
        );
    }
}