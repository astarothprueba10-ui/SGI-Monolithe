package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.PublicacionComercialResponse.Fila;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import monolithe.core_service.dto.GestionComercialDto.Evento;

@Repository
@RequiredArgsConstructor
public class PublicacionComercialRepository {
    private final JdbcTemplate jdbc;

    // Una vista previa incompleta puede clasificar como libre un lote comprometido.
    // Protección transitoria mientras se valida la lectura autorizada bajo RLS.
    public boolean puedeVerificarIntegridadPublicacion() {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT NOT (
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
            )
            """, Boolean.class));
    }

    public int versionPublicada(Long proyecto) {
        return jdbc.queryForObject("""
            SELECT coalesce(max(version),0) FROM public.inm_politicas_comerciales_publicadas WHERE id_proyecto=?
            """, Integer.class, proyecto);
    }

    public void bloquearProyecto(Long proyecto) {
        jdbc.query("SELECT pg_advisory_xact_lock(hashtextextended('inm_publicacion:' || CAST(? AS text),0))",
                (rs,n) -> true, proyecto);
        jdbc.queryForList("SELECT id_lote FROM public.inm_lotes WHERE id_proyecto=? ORDER BY id_lote FOR UPDATE",
                Long.class, proyecto);
    }

    public boolean proyectoHabilitado(Long proyecto) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM public.inm_proyectos WHERE id_proyecto=? AND activo)
            """, Boolean.class, proyecto));
    }

    public List<Long> protegidos(Long proyecto) {
        return jdbc.queryForList("""
            SELECT l.id_lote FROM public.inm_lotes l JOIN public.cfg_estados_lote el USING(id_estado_lote)
            WHERE l.id_proyecto=? AND (el.codigo IN ('RESERVADO','VENDIDO')
              OR EXISTS(SELECT 1 FROM public.ven_reservas r JOIN public.cfg_estados_reserva er USING(id_estado_reserva)
                WHERE r.id_lote=l.id_lote AND er.codigo IN ('PENDIENTE','VIGENTE'))
              OR EXISTS(SELECT 1 FROM public.ven_ventas v JOIN public.cfg_estados_venta ev USING(id_estado_venta)
                WHERE v.id_lote=l.id_lote AND ev.codigo <> 'ANULADA'))
            """, Long.class, proyecto);
    }

    public BigDecimal precioActual(Long id) {
        return jdbc.query("""
            SELECT p.precio FROM public.inm_lotes_precios p JOIN public.cfg_monedas m USING(id_moneda)
            WHERE p.id_lote=? AND m.codigo='PEN' AND m.activo AND p.activo
              AND p.fecha_desde<=now() AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
            ORDER BY p.fecha_desde DESC,p.id_lote_precio DESC LIMIT 1
            """, (r,n)->r.getBigDecimal(1), id).stream().findFirst().orElse(null);
    }

    public record EventoEstado(long id,String json) {}
    public record Regla(Long id,String etapa,String situacion,Long precio,boolean precioValido) {}

    public Optional<EventoEstado> ultimoEstado(Long proyecto,int version) {
        return jdbc.query("""
            SELECT id_evento, (nuevo->'estado')::text AS estado
            FROM public.inm_gestion_comercial_eventos
            WHERE id_proyecto=? AND version_publicada=? AND tipo IN ('INICIAL','DISPONIBILIDAD','TARIFAS')
            ORDER BY id_evento DESC LIMIT 1
            """,(r,n)->new EventoEstado(r.getLong("id_evento"),r.getString("estado")),proyecto,version).stream().findFirst();
    }

    public List<Evento> historial(Long proyecto) {
        return jdbc.query("""
            SELECT id_evento,tipo,id_usuario,fecha::text,anterior::text,nuevo::text
            FROM public.inm_gestion_comercial_eventos WHERE id_proyecto=? ORDER BY id_evento DESC LIMIT 50
            """,(r,n)->new Evento(r.getLong(1),r.getString(2),r.getLong(3),r.getString(4),r.getString(5),r.getString(6)),proyecto);
    }

    public void evento(Long proyecto,int version,Long actor,String tipo,String anterior,String nuevo) {
        jdbc.update("""
            INSERT INTO public.inm_gestion_comercial_eventos(id_proyecto,version_publicada,id_usuario,tipo,anterior,nuevo)
            VALUES (?,?,?,?,CAST(? AS jsonb),CAST(? AS jsonb))
            """,proyecto,version,actor,tipo,anterior,nuevo);
    }

    public List<String> etapasHistoricas(Long proyecto,int version) {
        return jdbc.queryForList("""
            SELECT DISTINCT codigo_etapa FROM public.inm_politicas_comerciales_lotes
            WHERE id_proyecto=? AND version=? AND situacion='HABILITADA' AND codigo_etapa IS NOT NULL ORDER BY codigo_etapa
            """,String.class,proyecto,version);
    }

    public List<Regla> reglas(Long proyecto,int version) {
        return jdbc.query("""
            SELECT pl.id_lote,pl.codigo_etapa,pl.situacion,pl.id_lote_precio,
              coalesce(p.activo AND m.activo AND m.codigo='PEN' AND p.id_lote=pl.id_lote
                AND p.precio=pl.precio_final AND p.precio>0 AND p.fecha_desde<=now()
                AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
                AND (pl.vigente_hasta IS NULL OR pl.vigente_hasta >= (now() AT TIME ZONE 'America/Lima')::date),false) precio_valido
            FROM public.inm_politicas_comerciales_lotes pl
            LEFT JOIN public.inm_lotes_precios p ON p.id_lote_precio=pl.id_lote_precio
            LEFT JOIN public.cfg_monedas m ON m.id_moneda=p.id_moneda
            WHERE pl.id_proyecto=? AND pl.version=? ORDER BY pl.id_lote
            """,(r,n)->new Regla(r.getLong(1),r.getString(2),r.getString(3),r.getObject(4,Long.class),r.getBoolean(5)),proyecto,version);
    }

    public String foto(Long proyecto,int version) {
        return jdbc.queryForObject("""
            SELECT coalesce(jsonb_agg(to_jsonb(pl)||jsonb_build_object('estadoInventario',el.codigo) ORDER BY pl.id_lote),'[]'::jsonb)::text
            FROM public.inm_politicas_comerciales_lotes pl JOIN public.inm_lotes l USING(id_lote)
            JOIN public.cfg_estados_lote el USING(id_estado_lote)
            WHERE pl.id_proyecto=? AND pl.version=?
            """,String.class,proyecto,version);
    }

    public void cambiarSituacion(Long proyecto,int version,Long id,String situacion) {
        if (jdbc.update("""
            UPDATE public.inm_politicas_comerciales_lotes SET situacion=?
            WHERE id_proyecto=? AND version=? AND id_lote=? AND situacion IN ('HABILITADA','BLOQUEADA')
            """,situacion,proyecto,version,id)!=1) throw new monolithe.core_service.exception.ConflictoNegocioException("La regla del lote cambió.");
    }

    public void actualizarPrecioRegla(Long proyecto,int version,Fila f,Long precio,String situacion) {
        if (jdbc.update("""
            UPDATE public.inm_politicas_comerciales_lotes SET id_lote_precio=?,precio_lista=?,descuento=?,precio_final=?,vigente_hasta=?,situacion=?
            WHERE id_proyecto=? AND version=? AND id_lote=? AND codigo_etapa=? AND situacion IN ('HABILITADA','BLOQUEADA')
            """,precio,f.base().add(f.ajuste()),f.descuento(),f.precioFinal(),f.vigenteHasta(),situacion,
            proyecto,version,f.idLote(),f.codigoEtapa())!=1)
            throw new monolithe.core_service.exception.ConflictoNegocioException("La regla comercial del lote cambió.");
    }

    public void publicar(Long proyecto, int version, Long actor) {
        jdbc.update("""
            INSERT INTO public.inm_politicas_comerciales_publicadas(id_proyecto,version,id_usuario) VALUES(?,?,?)
            """, proyecto, version, actor);
    }

    public Long registrarPrecio(Fila f, int version) {
        // Una revisión de liberación puede conservar exactamente los mismos precios.
        // Reutilizar el registro vigente evita duplicar el historial sin cambios monetarios.
        var existentes = jdbc.query("""
            SELECT p.id_lote_precio FROM public.inm_lotes_precios p
            JOIN public.inm_lotes l ON l.id_lote=p.id_lote
            JOIN public.cfg_monedas m ON m.id_moneda=p.id_moneda
            WHERE p.id_lote=? AND m.codigo='PEN' AND m.activo AND p.activo
              AND p.fecha_desde<=now() AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now())
              AND p.precio=? AND p.precio_base=? AND p.monto_ajuste=?
              AND p.area_m2_aplicada=l.area_m2
            ORDER BY p.fecha_desde DESC,p.id_lote_precio DESC LIMIT 1
            """, (rs,n) -> rs.getLong(1),
            f.idLote(), f.precioFinal(), f.base(), f.ajuste());
        if (!existentes.isEmpty()) return existentes.getFirst();
        jdbc.update("""
            UPDATE public.inm_lotes_precios p SET activo=false, fecha_hasta=GREATEST(now(),fecha_desde)
            FROM public.cfg_monedas m WHERE p.id_lote=? AND p.id_moneda=m.id_moneda AND m.codigo='PEN' AND p.activo
            """, f.idLote());
        return jdbc.queryForObject("""
            INSERT INTO public.inm_lotes_precios(id_lote,id_moneda,area_m2_aplicada,precio_base,monto_ajuste,
              precio,fecha_desde,observaciones,activo)
            SELECT l.id_lote,m.id_moneda,l.area_m2,?,?,?,now(),?,true
            FROM public.inm_lotes l CROSS JOIN public.cfg_monedas m WHERE l.id_lote=? AND m.codigo='PEN' AND m.activo
            RETURNING id_lote_precio
            """, Long.class, f.base(), f.ajuste(), f.precioFinal(), "Politica comercial v"+version, f.idLote());
    }

    public void registrarFila(Long proyecto, int version, Fila f, Long precio) {
        jdbc.update("""
            INSERT INTO public.inm_politicas_comerciales_lotes(id_proyecto,version,id_lote,codigo_etapa,
              situacion,id_lote_precio,precio_lista,descuento,precio_final,vigente_hasta)
            VALUES(?,?,?,?,?,?,?,?,?,?)
            """, proyecto,version,f.idLote(),f.codigoEtapa(),f.situacion(),precio,
            precio==null ? null : f.base().add(f.ajuste()),precio==null ? null : f.descuento(),precio==null ? null : f.precioFinal(),f.vigenteHasta());
    }

    public void bloquearInventario(Long id, Long actor, int version) {
        int filas = jdbc.update("""
            WITH cambio AS (
              UPDATE public.inm_lotes l SET id_estado_lote=(SELECT id_estado_lote FROM public.cfg_estados_lote
                WHERE codigo='NO_DISPONIBLE' AND activo), fecha_actualizacion=now()
              WHERE l.id_lote=? AND l.id_estado_lote=(SELECT id_estado_lote FROM public.cfg_estados_lote WHERE codigo='DISPONIBLE')
              RETURNING l.id_lote,l.id_estado_lote
            )
            INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario)
            SELECT c.id_lote,e.id_estado_lote,c.id_estado_lote,?,now(),? FROM cambio c CROSS JOIN public.cfg_estados_lote e
            WHERE e.codigo='DISPONIBLE'
            """, id,"Cierre por etapa comercial v"+version,actor);
        if (filas!=1) throw new IllegalStateException("El estado del lote cambió durante la publicación.");
    }

    public void habilitarInventario(Long id, Long actor, int version) {
        int filas = jdbc.update("""
            WITH cambio AS (
              UPDATE public.inm_lotes l SET id_estado_lote=(SELECT id_estado_lote FROM public.cfg_estados_lote
                WHERE codigo='DISPONIBLE' AND activo), fecha_actualizacion=now()
              WHERE l.id_lote=? AND l.id_estado_lote=(SELECT id_estado_lote FROM public.cfg_estados_lote WHERE codigo='NO_DISPONIBLE')
              RETURNING l.id_lote,l.id_estado_lote
            )
            INSERT INTO public.inm_lotes_historial_estado(id_lote,id_estado_anterior,id_estado_nuevo,motivo,fecha_cambio,id_usuario)
            SELECT c.id_lote,e.id_estado_lote,c.id_estado_lote,?,now(),? FROM cambio c CROSS JOIN public.cfg_estados_lote e
            WHERE e.codigo='NO_DISPONIBLE'
            """, id,"Habilitacion por politica comercial v"+version,actor);
        if (filas!=1) throw new IllegalStateException("El estado del lote cambió durante la publicación.");
    }
}
