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

    // Reutiliza las consultas vigentes en Supabase; no crea tablas ni duplica SQL de negocio.
    private static final String SQL_PROSPECTOS = """
            SELECT COALESCE(
                jsonb_agg(to_jsonb(p) ORDER BY p.id_prospecto DESC),
                '[]'::jsonb
            )::text
            FROM public.sp_listar_prospectos() p
            """;

    private static final String SQL_ASESORES = """
            SELECT COALESCE(
                jsonb_agg(to_jsonb(a) ORDER BY a.id_asesor),
                '[]'::jsonb
            )::text
            FROM public.sp_listar_asesores() a
            """;

    private final JdbcTemplate jdbcTemplate;

    public boolean tienePermisoVista(Long idActor) {
        return Boolean.TRUE.equals(
                jdbcTemplate.queryForObject(SQL_PERMISO, Boolean.class, idActor));
    }

    public String listarProspectos() {
        return jdbcTemplate.queryForObject(SQL_PROSPECTOS, String.class);
    }

    public String listarAsesores() {
        return jdbcTemplate.queryForObject(SQL_ASESORES, String.class);
    }
}
