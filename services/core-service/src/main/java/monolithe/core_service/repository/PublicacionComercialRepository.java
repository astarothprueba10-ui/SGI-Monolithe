package monolithe.core_service.repository;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.PublicacionComercialResponse.Fila;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class PublicacionComercialRepository {
    private final JdbcTemplate jdbc;

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
            f.base()==null ? null : f.base().add(f.ajuste()),f.descuento(),f.precioFinal(),f.vigenteHasta());
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
