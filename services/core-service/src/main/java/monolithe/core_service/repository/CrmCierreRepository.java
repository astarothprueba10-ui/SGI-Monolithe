package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class CrmCierreRepository {
   private final JdbcTemplate jdbc;

   private static final String SQL_ALCANCE_BUSQUEDA = """
         SELECT CASE
             WHEN NOT COALESCE(
                 public.fn_usuario_tiene_permiso_seguridad(
                     CAST(? AS bigint), 'crm.view'::varchar
                 ), false
             ) THEN NULL::bigint

             WHEN EXISTS (
                 SELECT 1
                 FROM public.seg_usuarios_roles ur
                 JOIN public.seg_roles r ON r.id_rol = ur.id_rol
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
             ) THEN -1::bigint

             ELSE (
                 SELECT CASE
                     WHEN COUNT(DISTINCT a.id_asesor) = 1
                     THEN MIN(a.id_asesor)
                     ELSE NULL::bigint
                 END
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
         END
         """;

   public Long resolverAlcanceBusqueda(Long idActor) {
      return jdbc.queryForObject(
            SQL_ALCANCE_BUSQUEDA,
            Long.class,
            idActor,
            idActor,
            idActor);
   }

   public String buscar(Long actor, String consulta, String etapa, String origen, Long asesor,
         boolean sinAsignar, String categoria, int pagina, int tamano) {
      return jdbc.queryForObject("""
            SELECT public.sp_crm_buscar_v5(
               CAST(? AS bigint),CAST(? AS varchar),CAST(? AS varchar),CAST(? AS varchar),
               CAST(? AS bigint),CAST(? AS boolean),CAST(? AS varchar),
               CAST(? AS integer),CAST(? AS integer))::text
            """, String.class, actor, consulta, etapa, origen, asesor, sinAsignar, categoria, pagina, tamano);
   }

   public String buscarPeriodo(
         Long actor,
         String consulta,
         String etapa,
         String origen,
         Long asesor,
         boolean sinAsignar,
         String categoria,
         int pagina,
         int tamano,
         Long proyecto,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_buscar_v6(
                CAST(? AS bigint),
                CAST(? AS varchar),
                CAST(? AS varchar),
                CAST(? AS varchar),
                CAST(? AS bigint),
                CAST(? AS boolean),
                CAST(? AS varchar),
                CAST(? AS integer),
                CAST(? AS integer),
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            consulta,
            etapa,
            origen,
            asesor,
            sinAsignar,
            categoria,
            pagina,
            tamano,
            proyecto,
            desde,
            hastaExclusivo);
   }

   public String indicadores(Long actor) {
      return jdbc.queryForObject("SELECT public.sp_crm_indicadores_v5(CAST(? AS bigint))::text",
            String.class, actor);
   }

   public String indicadoresPeriodo(
         Long actor,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_indicadores_periodo_v6(
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            desde,
            hastaExclusivo);
   }

   public String evolucionMensual(
         Long actor,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_evolucion_mensual_v6(
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            desde,
            hastaExclusivo);
   }

   public String compradores(Long actor, String consulta, int pagina, int tamano) {
      return jdbc.queryForObject("""
            SELECT public.sp_crm_compradores_v5(
               CAST(? AS bigint), CAST(? AS varchar), CAST(? AS integer), CAST(? AS integer))::text
            """, String.class, actor, consulta, pagina, tamano);
   }

   public String compradoresPeriodo(
         Long actor,
         String consulta,
         int pagina,
         int tamano,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_compradores_periodo_v6(
                CAST(? AS bigint),
                CAST(? AS varchar),
                CAST(? AS integer),
                CAST(? AS integer),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            consulta,
            pagina,
            tamano,
            desde,
            hastaExclusivo);
   }

   public String fuentesPeriodo(
         Long actor,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_fuentes_periodo_v6(
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            desde,
            hastaExclusivo);
   }

   public String asesoresPeriodo(
         Long actor,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_asesores_periodo_v6(
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz)
            )::text
            """,
            String.class,
            actor,
            desde,
            hastaExclusivo);
   }

   public String visitasPeriodo(
         Long actor,
         java.time.OffsetDateTime desde,
         java.time.OffsetDateTime hastaExclusivo,
         Long idProspecto,
         int pagina,
         int tamano) {

      return jdbc.queryForObject("""
            SELECT public.sp_crm_visitas_periodo_v6(
                CAST(? AS bigint),
                CAST(? AS timestamptz),
                CAST(? AS timestamptz),
                CAST(? AS bigint),
                CAST(? AS integer),
                CAST(? AS integer)
            )::text
            """,
            String.class,
            actor,
            desde,
            hastaExclusivo,
            idProspecto,
            pagina,
            tamano);
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
