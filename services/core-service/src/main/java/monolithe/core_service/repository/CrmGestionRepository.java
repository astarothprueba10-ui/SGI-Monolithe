package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;

@Repository
@RequiredArgsConstructor
public class CrmGestionRepository {

    private final JdbcTemplate jdbcTemplate;

    public String cambiarEtapa(Long actor, Long prospecto, String codigo, String observacion) {
        return jdbcTemplate.queryForObject("""
                SELECT public.sp_crm_cambiar_etapa_v3(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS varchar), CAST(? AS text)
                )::text
                """, String.class, actor, prospecto, codigo, observacion);
    }

    public String asignarAsesor(Long actor, Long prospecto, Long asesor, String motivo) {
        return jdbcTemplate.queryForObject("""
                SELECT public.sp_crm_asignar_asesor_v3(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS bigint), CAST(? AS varchar)
                )::text
                """, String.class, actor, prospecto, asesor, motivo);
    }

    public String registrarSeguimiento(Long actor, Long prospecto, String tipo, String asunto,
            String detalle, String resultado, Boolean requiere, OffsetDateTime proxima) {
        return jdbcTemplate.queryForObject("""
                SELECT public.sp_crm_registrar_seguimiento_v3(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS varchar),
                    CAST(? AS varchar), CAST(? AS text), CAST(? AS varchar),
                    CAST(? AS boolean), CAST(? AS timestamptz)
                )::text
                """, String.class, actor, prospecto, tipo, asunto, detalle, resultado, requiere, proxima);
    }

    public String listarSeguimientos(Long actor, Long prospecto, Integer limite) {
        return jdbcTemplate.queryForObject("""
                SELECT public.sp_crm_listar_seguimientos_v3(
                    CAST(? AS bigint), CAST(? AS bigint), CAST(? AS integer)
                )::text
                """, String.class, actor, prospecto, limite);
    }
}
