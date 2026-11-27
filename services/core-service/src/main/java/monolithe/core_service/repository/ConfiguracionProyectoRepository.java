package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class ConfiguracionProyectoRepository {
    private final JdbcTemplate jdbc;

    public record Version(int numero, String json) {}

    public record LecturaMapa(boolean existe, boolean publicacionVisible, boolean integridad,
            int publicada, Integer versionBorrador, String borrador, String asignaciones, String etapas, String abiertas, long revision) {
        public LecturaMapa(boolean existe,boolean visible,boolean integridad,int publicada,Integer version,String borrador,String asignaciones,String etapas,String abiertas){
            this(existe,visible,integridad,publicada,version,borrador,asignaciones,etapas,abiertas,0L);
        }
    }

    public LecturaMapa lecturaMapa(Long proyecto) {
        return jdbc.queryForObject("""
            WITH proyecto AS (SELECT CAST(? AS bigint) id),
             publicacion AS (SELECT coalesce(max(v.version),0) version FROM public.inm_politicas_comerciales_publicadas v JOIN proyecto p ON p.id=v.id_proyecto)
             SELECT EXISTS(SELECT 1 FROM public.inm_proyectos q WHERE q.id_proyecto=p.id) existe,
               NOT pg_catalog.row_security_active('public.inm_politicas_comerciales_publicadas'::regclass) publicacion_visible,
               CASE WHEN pub.version>0 THEN NOT (
                            pg_catalog.row_security_active('public.inm_proyectos'::regclass)
                            OR pg_catalog.row_security_active('public.inm_gestion_comercial_eventos'::regclass)
                            OR pg_catalog.row_security_active('public.inm_politicas_comerciales_lotes'::regclass)
                            OR pg_catalog.row_security_active('public.inm_lotes'::regclass)
                            OR pg_catalog.row_security_active('public.inm_lotes_precios'::regclass)
                            OR pg_catalog.row_security_active('public.inm_politicas_comerciales_publicadas'::regclass)
                            OR pg_catalog.row_security_active('public.inm_configuracion_comercial_borradores'::regclass)
                            OR pg_catalog.row_security_active('public.inm_ajustes_tipo_lote'::regclass)
                            OR pg_catalog.row_security_active('public.inm_etapas_comerciales'::regclass)
                            OR pg_catalog.row_security_active('public.inm_etapas'::regclass)
                            OR pg_catalog.row_security_active('public.inm_manzanas'::regclass)
                            OR pg_catalog.row_security_active('public.inm_zonas'::regclass)
                            OR pg_catalog.row_security_active('public.cfg_estados_lote'::regclass)
                            OR pg_catalog.row_security_active('public.cfg_monedas'::regclass)
                            OR pg_catalog.row_security_active('public.ven_reservas'::regclass)
                            OR pg_catalog.row_security_active('public.ven_ventas'::regclass)
                            OR pg_catalog.row_security_active('public.cfg_estados_reserva'::regclass)
                            OR pg_catalog.row_security_active('public.cfg_estados_venta'::regclass)
                        ) ELSE true END integridad,
               pub.version publicada, b.version borrador_version,b.configuracion::text borrador,
               a.estado::text asignaciones, e.etapas::text etapas, coalesce(u.id_evento,0) revision,
               CASE WHEN u.id_evento IS NOT NULL THEN (u.estado->'etapasHabilitadas')::text
                 ELSE (SELECT coalesce(jsonb_agg(h.codigo_etapa ORDER BY h.codigo_etapa),'[]'::jsonb)::text
                   FROM (SELECT DISTINCT l.codigo_etapa FROM public.inm_politicas_comerciales_lotes l
                      WHERE l.id_proyecto=p.id AND l.version=pub.version AND l.situacion='HABILITADA' AND l.codigo_etapa IS NOT NULL) h)
               END abiertas
             FROM proyecto p CROSS JOIN publicacion pub
             LEFT JOIN LATERAL (SELECT version,configuracion FROM public.inm_configuracion_comercial_borradores
                WHERE id_proyecto=p.id AND (pub.version=0 OR version=pub.version) ORDER BY version DESC LIMIT 1) b ON true
             LEFT JOIN LATERAL (SELECT nuevo->'estado' estado FROM public.inm_gestion_comercial_eventos
                WHERE id_proyecto=p.id AND version_publicada=pub.version AND pub.version>0 AND tipo IN ('ASIGNACIONES','REPARACION')
                  AND jsonb_typeof(nuevo->'estado'->'manzanas')='array' AND jsonb_typeof(nuevo->'estado'->'lotes')='array'
                ORDER BY id_evento DESC LIMIT 1) a ON true
             LEFT JOIN LATERAL (SELECT nuevo->'estado'->'etapas' etapas FROM public.inm_gestion_comercial_eventos
                WHERE id_proyecto=p.id AND version_publicada=pub.version AND pub.version>0 AND tipo='ETAPAS'
                ORDER BY id_evento DESC LIMIT 1) e ON true
             LEFT JOIN LATERAL (SELECT id_evento,nuevo->'estado' estado FROM public.inm_gestion_comercial_eventos
                WHERE id_proyecto=p.id AND version_publicada=pub.version AND pub.version>0 AND tipo IN ('INICIAL','DISPONIBILIDAD','TARIFAS','ETAPAS','REPARACION','ASIGNACIONES')
                ORDER BY id_evento DESC LIMIT 1) u ON true
            """, (rs,n)->new LecturaMapa(rs.getBoolean("existe"),rs.getBoolean("publicacion_visible"),
                rs.getBoolean("integridad"),rs.getInt("publicada"),rs.getObject("borrador_version",Integer.class),
                rs.getString("borrador"),rs.getString("asignaciones"),rs.getString("etapas"),rs.getString("abiertas"),rs.getLong("revision")),proyecto);
    }

    public Optional<Version> vigente(Long proyecto) {
        return jdbc.query("""
            SELECT version, configuracion::text AS json
            FROM public.inm_configuracion_comercial_borradores
            WHERE id_proyecto = ? ORDER BY version DESC LIMIT 1
            """, (rs, n) -> new Version(rs.getInt("version"), rs.getString("json")), proyecto)
                .stream().findFirst();
    }

    public Optional<Version> porVersion(Long proyecto,int version) {
        return jdbc.query("""
            SELECT version,configuracion::text AS json FROM public.inm_configuracion_comercial_borradores
            WHERE id_proyecto=? AND version=?
            """,(r,n)->new Version(r.getInt(1),r.getString(2)),proyecto,version).stream().findFirst();
    }

    public Optional<String> tarifasVigentes(Long proyecto,int version) {
        return jdbc.query("""
            SELECT (nuevo->'estado'->'tarifas')::text FROM public.inm_gestion_comercial_eventos
            WHERE id_proyecto=? AND version_publicada=? AND tipo IN ('INICIAL','DISPONIBILIDAD','TARIFAS','ETAPAS','REPARACION','ASIGNACIONES')
            ORDER BY id_evento DESC LIMIT 1
            """,(r,n)->r.getString(1),proyecto,version).stream().findFirst();
    }

    public Optional<String> asignacionesVigentes(Long proyecto,int version) {
        return jdbc.query("""
            SELECT (nuevo->'estado')::text FROM public.inm_gestion_comercial_eventos
            WHERE id_proyecto=? AND version_publicada=? AND tipo IN ('ASIGNACIONES','REPARACION')
              AND jsonb_typeof(nuevo->'estado'->'manzanas')='array'
              AND jsonb_typeof(nuevo->'estado'->'lotes')='array'
            ORDER BY id_evento DESC LIMIT 1
            """,(r,n)->r.getString(1),proyecto,version).stream().findFirst();
    }

    public Optional<String> etapasVigentes(Long proyecto,int version) {
        return jdbc.query("""
            SELECT (nuevo->'estado'->'etapas')::text FROM public.inm_gestion_comercial_eventos
            WHERE id_proyecto=? AND version_publicada=? AND tipo='ETAPAS'
            ORDER BY id_evento DESC LIMIT 1
            """,(r,n)->r.getString(1),proyecto,version).stream().findFirst();
    }

    public void bloquearConfiguracion(Long proyecto) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended('inm_publicacion:' || CAST(? AS text),0))",
                (rs,n) -> true, proyecto);
    }

    public int versionPublicada(Long proyecto) {
        Integer version = jdbc.queryForObject("""
            SELECT CASE WHEN pg_catalog.row_security_active('public.inm_politicas_comerciales_publicadas'::regclass)
                THEN NULL ELSE coalesce(max(version),0) END
            FROM public.inm_politicas_comerciales_publicadas WHERE id_proyecto=?
            """, Integer.class, proyecto);
        if (version == null) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
            "No se puede verificar si el proyecto ya fue publicado.");
        return version;
    }

    public boolean importacionRealizada(Long proyecto) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT to_regclass('public.inm_gestion_comercial_eventos') IS NOT NULL",Boolean.class)))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Falta aplicar la migración de gestión comercial (170).");
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_catalog.row_security_active('public.inm_gestion_comercial_eventos'::regclass)",Boolean.class)))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "No se puede verificar la importación inicial.");
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM public.inm_gestion_comercial_eventos WHERE id_proyecto=? AND tipo='IMPORTACION')
            """,Boolean.class,proyecto));
    }

    public void registrarImportacion(Long proyecto,Long actor,String huella,int filas) {
        jdbc.update("""
            INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,tipo,id_usuario,nuevo)
            VALUES (?,'IMPORTACION',?,jsonb_build_object('huella',CAST(? AS text),'filas',CAST(? AS integer)))
            """,proyecto,actor,huella,filas);
    }

    public int contarLotesRegistrados(Long proyecto) {
        Integer total = jdbc.queryForObject("""
            SELECT CASE WHEN pg_catalog.row_security_active('public.inm_lotes'::regclass)
                THEN NULL ELSE count(*)::integer END
            FROM public.inm_lotes WHERE id_proyecto=?
            """, Integer.class, proyecto);
        if (total == null) throw new org.springframework.web.server.ResponseStatusException(
            org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "No se puede verificar el inventario existente.");
        return total;
    }

    public boolean insertar(Long proyecto, int version, String json, Long actor) {
        return jdbc.update("""
            INSERT INTO public.inm_configuracion_comercial_borradores
            (id_proyecto, version, configuracion, id_usuario)
            VALUES (?, ?, CAST(? AS jsonb), ?)
            ON CONFLICT (id_proyecto, version) DO NOTHING
            """, proyecto, version, json, actor) == 1;
    }

    public record CatalogosDetalle(String manzanas,String lotes,String zonas,String monedas) {}
    public CatalogosDetalle catalogosDetalle(Long proyecto){
        return jdbc.queryForObject("""
            WITH p AS (SELECT CAST(? AS bigint) id)
            SELECT
              (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id_manzana,'codigo',m.codigo,'nombre',m.nombre)
                ORDER BY m.codigo,m.id_manzana),'[]'::jsonb)::text FROM public.inm_manzanas m
                JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa WHERE m.id_proyecto=p.id AND m.activo AND e.activo) manzanas,
              (SELECT coalesce(jsonb_agg(jsonb_build_object('id',l.id_lote,'idManzana',l.id_manzana,'codigo',l.codigo,
                'estadoInventario',el.codigo,'codigoZona',z.codigo) ORDER BY l.codigo,l.id_lote),'[]'::jsonb)::text
                FROM public.inm_lotes l JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
                LEFT JOIN public.inm_zonas z ON z.id_zona=l.id_zona AND z.id_proyecto=l.id_proyecto
                JOIN public.inm_manzanas m ON m.id_manzana=l.id_manzana JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
                WHERE l.id_proyecto=p.id AND l.activo AND m.activo AND e.activo) lotes,
              (SELECT coalesce(jsonb_agg(z.codigo ORDER BY z.codigo),'[]'::jsonb)::text
                FROM public.inm_zonas z WHERE z.id_proyecto=p.id AND z.activo) zonas,
              (SELECT coalesce(jsonb_agg(m.codigo ORDER BY m.codigo),'[]'::jsonb)::text
                FROM public.cfg_monedas m WHERE m.activo) monedas
            FROM p
            """,(rs,n)->new CatalogosDetalle(rs.getString("manzanas"),rs.getString("lotes"),rs.getString("zonas"),rs.getString("monedas")),proyecto);
    }

    public List<Etapa> etapas(Long proyecto) {
        return jdbc.query("""
            SELECT codigo, nombre FROM public.inm_etapas_comerciales
            WHERE id_proyecto = ? AND activo ORDER BY numero_orden, codigo
            """, (rs, n) -> new Etapa(rs.getString("codigo"), rs.getString("nombre"),
                Disponibilidad.BLOQUEADA, TipoDescuento.NINGUNO, BigDecimal.ZERO), proyecto);
    }

    public List<String> zonas(Long proyecto) {
        return jdbc.queryForList("SELECT codigo FROM public.inm_zonas WHERE id_proyecto=? AND activo ORDER BY codigo", String.class, proyecto);
    }

    public List<String> monedas() {
        return jdbc.queryForList("SELECT codigo FROM public.cfg_monedas WHERE activo ORDER BY codigo", String.class);
    }

    public List<Manzana> manzanas(Long proyecto) {
        return jdbc.query("""
            SELECT m.id_manzana, m.codigo, m.nombre FROM public.inm_manzanas m
            JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
            WHERE m.id_proyecto = ? AND m.activo AND e.activo ORDER BY m.codigo, m.id_manzana
            """, (rs, n) -> new Manzana(rs.getLong("id_manzana"), rs.getString("codigo"),
                rs.getString("nombre")), proyecto);
    }

    public List<Lote> lotes(Long proyecto) {
        return jdbc.query("""
            SELECT l.id_lote, l.id_manzana, l.codigo, el.codigo AS estado, z.codigo AS zona FROM public.inm_lotes l
            JOIN public.cfg_estados_lote el ON el.id_estado_lote=l.id_estado_lote
            LEFT JOIN public.inm_zonas z ON z.id_zona=l.id_zona AND z.id_proyecto=l.id_proyecto
            JOIN public.inm_manzanas m ON m.id_manzana=l.id_manzana JOIN public.inm_etapas e ON e.id_etapa=m.id_etapa
            WHERE l.id_proyecto = ? AND l.activo AND m.activo AND e.activo ORDER BY l.codigo, l.id_lote
            """, (rs, n) -> new Lote(rs.getLong("id_lote"), rs.getLong("id_manzana"),
                rs.getString("codigo"), rs.getString("estado"), rs.getString("zona")), proyecto);
    }
}
