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

    public String listarAsignaciones(Long actor, Long prospecto) {
        return jdbcTemplate.queryForObject("""
                SELECT CASE
                    WHEN COALESCE(
                        public.fn_usuario_tiene_permiso_seguridad(
                            CAST(? AS bigint), 'crm.view'
                        ), false
                    )
                    THEN COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id_asignacion', a.id_asignacion_prospecto,
                                'id_asesor', a.id_asesor,
                                'asesor_nombre', COALESCE(
                                    NULLIF(TRIM(CONCAT_WS(' ',
                                        p.nombres,
                                        p.apellido_paterno,
                                        p.apellido_materno
                                    )), ''),
                                    'Asesor #' || a.id_asesor
                                ),
                                'fecha_asignacion', a.fecha_asignacion,
                                'fecha_fin', a.fecha_fin,
                                'motivo_asignacion', a.motivo_asignacion,
                                'motivo_cierre', a.motivo_cierre,
                                'vigente', a.fecha_fin IS NULL
                            )
                            ORDER BY a.fecha_asignacion DESC
                        )
                        FROM public.com_asignaciones_prospecto a
                        LEFT JOIN public.com_asesores ca
                            ON ca.id_asesor = a.id_asesor
                        LEFT JOIN public.core_personas p
                            ON p.id_persona = ca.id_persona
                        WHERE a.id_prospecto = CAST(? AS bigint)
                    ), '[]'::jsonb)::text
                    ELSE NULL
                END
                """, String.class, actor, prospecto);
    }
}
