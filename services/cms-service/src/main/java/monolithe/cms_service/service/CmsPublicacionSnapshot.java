package monolithe.cms_service.service;

import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Estado publicado completo de una página y sus secciones, no el JSON del borrador.
 * Incluye secciones ocultas/inactivas para poder auditar también lo que no se muestra.
 * No accede a imágenes privadas ni modifica las entidades.
 */
final class CmsPublicacionSnapshot {

    private CmsPublicacionSnapshot() { }

    static Map<String, Object> capturar(Pagina pagina, List<Seccion> secciones) {
        Map<String, Object> estado = new LinkedHashMap<>();
        Map<String, Object> datosPagina = new LinkedHashMap<>();
        datosPagina.put("id_pagina", pagina.getIdPagina());
        datosPagina.put("codigo", pagina.getCodigo());
        datosPagina.put("slug", pagina.getSlug());
        datosPagina.put("titulo", pagina.getTitulo());
        datosPagina.put("descripcion", pagina.getDescripcion());
        datosPagina.put("titulo_seo", pagina.getTituloSeo());
        datosPagina.put("descripcion_seo", pagina.getDescripcionSeo());
        datosPagina.put("id_estado_publicacion", pagina.getIdEstadoPublicacion());
        datosPagina.put("orden", pagina.getOrden());
        datosPagina.put("mostrar_menu", pagina.getMostrarMenu());
        datosPagina.put("activo", pagina.getActivo());
        datosPagina.put("fecha_publicacion", fecha(pagina.getFechaPublicacion()));
        estado.put("pagina", datosPagina);

        List<Map<String, Object>> datosSecciones = new ArrayList<>();
        for (Seccion seccion : secciones) {
            Map<String, Object> datos = new LinkedHashMap<>();
            datos.put("id_seccion", seccion.getIdSeccion());
            datos.put("id_pagina", seccion.getIdPagina());
            datos.put("id_tipo_seccion", seccion.getIdTipoSeccion());
            datos.put("codigo", seccion.getCodigo());
            datos.put("titulo", seccion.getTitulo());
            datos.put("subtitulo", seccion.getSubtitulo());
            datos.put("contenido", seccion.getContenido());
            // Copia para evitar referencias directas al JSON administrado por Hibernate.
            datos.put("configuracion", copiarJson(seccion.getConfiguracion()));
            datos.put("orden", seccion.getOrden());
            datos.put("visible", seccion.getVisible());
            datos.put("activo", seccion.getActivo());
            datos.put("fecha_desde", fecha(seccion.getFechaDesde()));
            datos.put("fecha_hasta", fecha(seccion.getFechaHasta()));
            datosSecciones.add(datos);
        }
        estado.put("secciones", datosSecciones);
        return estado;
    }

    private static String fecha(OffsetDateTime fecha) {
        return fecha == null ? null : fecha.toString();
    }

    private static Object copiarJson(Object valor) {
        if (valor instanceof Map<?, ?> mapa) {
            Map<String, Object> copia = new LinkedHashMap<>();
            mapa.forEach((clave, contenido) -> copia.put((String) clave, copiarJson(contenido)));
            return copia;
        }
        if (valor instanceof List<?> lista) {
            return lista.stream().map(CmsPublicacionSnapshot::copiarJson).toList();
        }
        return valor;
    }
}
