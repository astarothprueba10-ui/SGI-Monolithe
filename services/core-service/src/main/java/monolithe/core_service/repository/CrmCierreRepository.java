package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CrmCierreRepository {
    private final JdbcTemplate jdbc;

    public String buscar(Long actor, String consulta, String etapa, String origen, Long asesor,
            boolean sinAsignar, String categoria, int pagina, int tamano) {
        return jdbc.queryForObject("""
          SELECT public.sp_crm_buscar_v5(
             CAST(? AS bigint),CAST(? AS varchar),CAST(? AS varchar),CAST(? AS varchar),
             CAST(? AS bigint),CAST(? AS boolean),CAST(? AS varchar),
             CAST(? AS integer),CAST(? AS integer))::text
          """, String.class, actor, consulta, etapa, origen, asesor, sinAsignar, categoria, pagina, tamano);
    }

    public String indicadores(Long actor) {
        return jdbc.queryForObject("SELECT public.sp_crm_indicadores_v5(CAST(? AS bigint))::text",
                String.class, actor);
    }

    public String compradores(Long actor, String consulta, int pagina, int tamano) {
        return jdbc.queryForObject("""
          SELECT public.sp_crm_compradores_v5(
             CAST(? AS bigint), CAST(? AS varchar), CAST(? AS integer), CAST(? AS integer))::text
          """, String.class, actor, consulta, pagina, tamano);
    }

    public String actualizarFicha(Long actor, Long prospecto, String origen, String observaciones, Long proyecto) {
        return jdbc.queryForObject("""
          SELECT public.sp_crm_actualizar_ficha_v5(
             CAST(? AS bigint), CAST(? AS bigint), CAST(? AS varchar), CAST(? AS text), CAST(? AS bigint))::text
          """, String.class, actor, prospecto, origen, observaciones, proyecto);
    }

    public String desactivar(Long actor, Long prospecto, String motivo) {
        return jdbc.queryForObject("""
          SELECT public.sp_crm_desactivar_prospecto_v5(
             CAST(? AS bigint),CAST(? AS bigint),CAST(? AS varchar))::text
          """, String.class, actor, prospecto, motivo);
    }

    public String exportar(Long actor, String consulta, String etapa, String categoria, int limite) {
        return jdbc.queryForObject("""
          SELECT public.sp_crm_exportar_v5(
             CAST(? AS bigint),CAST(? AS varchar),CAST(? AS varchar),CAST(? AS varchar),CAST(? AS integer))::text
          """, String.class, actor, consulta, etapa, categoria, limite);
    }
}
