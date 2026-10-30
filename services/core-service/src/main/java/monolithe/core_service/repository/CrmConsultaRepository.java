package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CrmConsultaRepository {

    // Segunda barrera de autorizacion: valida los permisos vigentes en PostgreSQL.
    private static final String SQL_PERMISO = """
            SELECT public.fn_usuario_tiene_permiso_seguridad(?, 'crm.view'::varchar)
            """;

    // Reutiliza las consultas vigentes en Supabase; no crea tablas ni duplica SQL
    // de negocio.

    private static final String SQL_PROSPECTOS = """
            SELECT COALESCE(
                jsonb_agg(to_jsonb(p) ORDER BY p.id_prospecto DESC),
                '[]'::jsonb
            )::text
            FROM public.sp_listar_prospectos() p
            WHERE COALESCE(
                public.fn_usuario_tiene_permiso_seguridad(
                    CAST(? AS bigint), 'crm.view'::varchar
                ), false
            )
            AND (
                EXISTS (
                    SELECT 1
                    FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = CAST(? AS bigint)
                      AND ur.activo = true
                      AND ur.fecha_revocacion IS NULL
                      AND r.activo = true
                      AND r.codigo IN (
                          'ADMINISTRADOR',
                          'GERENCIA',
                          'SUPERVISOR_COMERCIAL',
                          'ADMINISTRACION'
                      )
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.seg_usuarios u
                    JOIN public.seg_usuarios_roles ur
                        ON ur.id_usuario = u.id_usuario
                    JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    JOIN public.com_asesores a
                        ON a.id_persona = u.id_persona
                    JOIN public.cfg_estados_asesor ea
                        ON ea.id_estado_asesor = a.id_estado_asesor
                    WHERE u.id_usuario = CAST(? AS bigint)
                      AND ur.activo = true
                      AND ur.fecha_revocacion IS NULL
                      AND r.activo = true
                      AND r.codigo = 'ASESOR'
                      AND ea.activo = true
                      AND ea.permite_operar = true
                      AND a.fecha_inicio <= CURRENT_DATE
                      AND (
                          a.fecha_fin IS NULL
                          OR a.fecha_fin >= CURRENT_DATE
                      )
                      AND p.id_asesor = a.id_asesor
                )
            )
            """;

    private static final String SQL_ASESORES = """
            SELECT COALESCE(
                jsonb_agg(to_jsonb(a) ORDER BY a.id_asesor),
                '[]'::jsonb
            )::text
            FROM public.sp_listar_asesores() a
            """;

    private static final String SQL_ALCANCE_PROSPECTOS = """
            SELECT
                EXISTS (
                    SELECT 1
                    FROM public.seg_usuarios_roles ur
                    JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    WHERE ur.id_usuario = CAST(? AS bigint)
                      AND ur.activo = true
                      AND ur.fecha_revocacion IS NULL
                      AND r.activo = true
                      AND r.codigo IN (
                          'ADMINISTRADOR',
                          'GERENCIA',
                          'SUPERVISOR_COMERCIAL',
                          'ADMINISTRACION'
                      )
                )
                OR EXISTS (
                    SELECT 1
                    FROM public.seg_usuarios u
                    JOIN public.seg_usuarios_roles ur
                        ON ur.id_usuario = u.id_usuario
                    JOIN public.seg_roles r
                        ON r.id_rol = ur.id_rol
                    JOIN public.com_asesores a
                        ON a.id_persona = u.id_persona
                    JOIN public.cfg_estados_asesor ea
                        ON ea.id_estado_asesor = a.id_estado_asesor
                    WHERE u.id_usuario = CAST(? AS bigint)
                      AND ur.activo = true
                      AND ur.fecha_revocacion IS NULL
                      AND r.activo = true
                      AND r.codigo = 'ASESOR'
                      AND ea.activo = true
                      AND ea.permite_operar = true
                      AND a.fecha_inicio <= CURRENT_DATE
                      AND (
                          a.fecha_fin IS NULL
                          OR a.fecha_fin >= CURRENT_DATE
                      )
                )
            """;

    private final JdbcTemplate jdbcTemplate;

    public boolean tieneAlcanceProspectos(Long idActor) {
        return Boolean.TRUE.equals(
                jdbcTemplate.queryForObject(
                        SQL_ALCANCE_PROSPECTOS,
                        Boolean.class,
                        idActor,
                        idActor));
    }

    public boolean tienePermisoVista(Long idActor) {
        return Boolean.TRUE.equals(
                jdbcTemplate.queryForObject(SQL_PERMISO, Boolean.class, idActor));
    }

    public String listarProspectos(Long idActor) {
        return jdbcTemplate.queryForObject(
                SQL_PROSPECTOS,
                String.class,
                idActor,
                idActor,
                idActor);
    }

    public String listarAsesores() {
        return jdbcTemplate.queryForObject(SQL_ASESORES, String.class);
    }
}
