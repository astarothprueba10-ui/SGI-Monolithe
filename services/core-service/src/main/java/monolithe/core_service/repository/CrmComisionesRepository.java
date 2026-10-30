package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CrmComisionesRepository {

    private final JdbcTemplate jdbcTemplate;

    // Se conservan comisiones de ex trabajadores: la obligacion economica historica no
    // desaparece al cesar o revocar el rol. Solo se excluyen perfiles comerciales de prueba
    // que nunca tuvieron vinculo de trabajador, cuenta y rol ASESOR.
    private static final String CONDICION_ORIGEN_LABORAL = """
            EXISTS (
              SELECT 1
              FROM public.rrhh_trabajadores tr
              JOIN public.seg_usuarios u ON u.id_persona = tr.id_persona
              JOIN public.seg_usuarios_roles ur ON ur.id_usuario = u.id_usuario
              JOIN public.seg_roles r ON r.id_rol = ur.id_rol
              WHERE tr.id_persona = a.id_persona
                AND r.codigo = 'ASESOR'
            )
            """;

    private static final String SQL_LISTAR = """
            SELECT COALESCE(
              jsonb_agg(to_jsonb(liq) ORDER BY liq.id_comision DESC),
              '[]'::jsonb
            )::text
            FROM public.sp_listar_liquidaciones_asesores() liq
            JOIN public.com_comisiones c ON c.id_comision = liq.id_comision
            JOIN public.com_ventas_asesores va ON va.id_venta_asesor = c.id_venta_asesor
            JOIN public.com_asesores a ON a.id_asesor = va.id_asesor
            WHERE """ + CONDICION_ORIGEN_LABORAL;

    private static final String SQL_BLOQUEAR_PENDIENTE = """
            SELECT c.id_comision
            FROM public.com_comisiones c
            JOIN public.cfg_estados_comision ec ON ec.id_estado_comision = c.id_estado_comision
            JOIN public.com_ventas_asesores va ON va.id_venta_asesor = c.id_venta_asesor
            JOIN public.com_asesores a ON a.id_asesor = va.id_asesor
            WHERE c.id_comision = ?
              AND ec.codigo = 'PENDIENTE'
              AND """ + CONDICION_ORIGEN_LABORAL + "\nFOR UPDATE OF c";

    public boolean tienePermiso(Long actor, String permiso) {
        Boolean autorizado = jdbcTemplate.queryForObject(
                "SELECT public.fn_usuario_tiene_permiso_seguridad(?, ?::varchar)",
                Boolean.class, actor, permiso);
        return Boolean.TRUE.equals(autorizado);
    }

    public String listarOperativas() {
        return jdbcTemplate.queryForObject(SQL_LISTAR, String.class);
    }

    public boolean bloquearPendienteElegible(Long idComision) {
        return !jdbcTemplate.queryForList(SQL_BLOQUEAR_PENDIENTE, Long.class, idComision).isEmpty();
    }

    public String aprobarDevengo(Long idComision, Long actor) {
        return jdbcTemplate.queryForObject(
                "SELECT public.sp_aprobar_devengo_comision(?, ?)::text",
                String.class, idComision, actor);
    }
}
