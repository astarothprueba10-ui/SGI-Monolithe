package monolithe.cms_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository @RequiredArgsConstructor
public class CaptacionRepository {
    private final JdbcTemplate jdbc;
    public void bloquear(UUID solicitud) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended(?::text, 0))",
                rs -> { }, solicitud.toString());
    }
    public Long consultaAnterior(UUID solicitud) {
        List<Long> ids = jdbc.query("SELECT id_consulta_web FROM public.crm_captaciones "
                + "WHERE id_solicitud = ?::uuid AND entrada = 'WEB' LIMIT 1",
                (rs, row) -> rs.getLong(1), solicitud.toString());
        return ids.isEmpty() ? null : ids.get(0);
    }
    public String registrar(UUID solicitud, Long actor, Long consulta, String datos) {
        return jdbc.queryForObject("SELECT public.sp_registrar_captacion_crm_v2"
                + "(?::uuid, ?::bigint, ?::bigint, ?::jsonb)::text", String.class,
                solicitud.toString(), actor, consulta, datos);
    }
    public void autorizar(Long actor, String permiso) {
        Boolean permitido = jdbc.queryForObject("SELECT coalesce(public.fn_usuario_tiene_permiso_seguridad(?, ?), false) "
                + "AND EXISTS (SELECT 1 FROM public.seg_usuarios u JOIN public.cfg_estados_usuario e "
                + "ON e.id_estado_usuario = u.id_estado_usuario WHERE u.id_usuario = ? "
                + "AND e.activo AND e.codigo = 'ACTIVO' AND NOT (u.requiere_cambio_password "
                + "AND u.password_temporal_expira_en IS NOT NULL AND u.password_temporal_expira_en <= now()))", Boolean.class, actor, permiso, actor);
        if (!Boolean.TRUE.equals(permitido)) throw new org.springframework.security.access.AccessDeniedException("Acceso denegado");
    }
    public List<Map<String, Object>> prospectos(Long antes) {
        return jdbc.queryForList("SELECT id_prospecto, codigo, id_persona, nombre_completo, telefono, email, "
                + "id_origen, origen_codigo, origen_nombre, id_estado, estado_codigo, estado_nombre, interes, "
                + "puntuacion, id_asesor, asesor_nombre, fecha_registro, ultimo_contacto, observaciones "
                + "FROM public.sp_listar_prospectos() WHERE (?::bigint IS NULL OR id_prospecto < ?) "
                + "ORDER BY id_prospecto DESC LIMIT 200", antes, antes);
    }
    public List<Map<String, Object>> proyectos(Long despues) {
        return jdbc.queryForList("SELECT id_proyecto AS \"idProyecto\", nombre FROM public.inm_proyectos "
                + "WHERE activo AND id_proyecto > ? ORDER BY id_proyecto LIMIT 200", despues);
    }
}
