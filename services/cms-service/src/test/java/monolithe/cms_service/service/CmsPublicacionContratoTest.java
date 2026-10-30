package monolithe.cms_service.service;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.EstadoBorrador;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.entity.TipoObjetivoBorrador;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class CmsPublicacionContratoTest {
    private final Pagina pagina = pagina();
    private final List<Seccion> secciones = List.of(
            seccion(14L, "HERO_PRINCIPAL", true),
            seccion(23L, "HERO_SLIDE_2_PROMO", false),
            seccion(31L, "HERO_SLIDE_3_PROMO", false));

    @Test void permiteLosTresTextosDelHeroPrincipal() {
        CmsBorrador b = borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto")));
        var plan = evaluar(b);
        assertEquals(1L, plan.revisionNueva());
        assertEquals(3, plan.cambios().getFirst().textos().size());
        assertEquals("Inicio", plan.cambios().getFirst().textos().get("titulo"));
    }

    @Test void permiteSubtituloPromocionalSinHacerVisibleUnaSeccionOculta() {
        CmsBorrador b = borrador(List.of(Map.of("id_seccion", 23, "subtitulo", "Promoción editorial")));
        var plan = evaluar(b);
        assertFalse(plan.cambios().getFirst().visibleActualmente());
        assertEquals(Map.of("subtitulo", "Promoción editorial"), plan.cambios().getFirst().textos());
    }

    @Test void permiteSoloImagenValidadaDeUnaSeccionSinModificarTextos() {
        CmsBorrador borrador = borrador(List.of(Map.of("id_seccion", 23L)));
        var plan = CmsPublicacionContrato.evaluar(
                borrador, pagina, secciones, 5L, 0L, 0L, 7L, Set.of(23L));
        assertEquals(1, plan.cambios().size());
        assertTrue(plan.cambios().getFirst().textos().isEmpty());
        assertEquals("HERO_SLIDE_2_PROMO", plan.cambios().getFirst().codigo());
    }

    @Test void nuncaPublicaMarcadorVacioSinImagenDelMismoSlide() {
        CmsBorrador borrador = borrador(List.of(Map.of("id_seccion", 23L)));
        assertThrows(IllegalArgumentException.class, () -> evaluar(borrador));
        assertThrows(IllegalArgumentException.class, () -> CmsPublicacionContrato.evaluar(
                borrador, pagina, secciones, 5L, 0L, 0L, 7L, Set.of(14L)));
    }

    @Test void rechazaTitulosYDescripcionesDeSlidesComerciales() {
        for (String campo : List.of("titulo", "contenido")) {
            CmsBorrador b = borrador(List.of(Map.of("id_seccion", 23, campo, "Cambio comercial")));
            assertThrows(IllegalArgumentException.class, () -> evaluar(b));
        }
    }

    @Test void rechazaCamposDesconocidosOHtml() {
        assertThrows(IllegalArgumentException.class, () -> evaluar(borrador(List.of(
                Map.of("id_seccion", 14, "titulo", "X", "precio", 0)))));
        assertThrows(IllegalArgumentException.class, () -> evaluar(borrador(List.of(
                Map.of("id_seccion", 14, "titulo", "<script>")))));
    }

    @Test void rechazaSeccionesDuplicadasYAjenaALaPagina() {
        assertThrows(IllegalArgumentException.class, () -> evaluar(borrador(List.of(
                Map.of("id_seccion", 14, "titulo", "X"),
                Map.of("id_seccion", 14L, "subtitulo", "Y")))));
        assertThrows(IllegalArgumentException.class, () -> evaluar(borrador(List.of(
                Map.of("id_seccion", 999, "titulo", "X")))));
    }

    @Test void rechazaSeccionesInactivasYCodigosInventados() {
        var catalogo = List.of(seccion(14L, "HERO_NO_AUTORIZADO", true));
        CmsBorrador b = borrador(List.of(Map.of("id_seccion", 14, "titulo", "X")));
        assertThrows(IllegalArgumentException.class, () -> CmsPublicacionContrato.evaluar(
                b, pagina, catalogo, 5L, 0L, 0L, 7L));
        Seccion inactiva = seccion(14L, "HERO_PRINCIPAL", true);
        inactiva.setActivo(false);
        assertThrows(IllegalArgumentException.class, () -> CmsPublicacionContrato.evaluar(
                b, pagina, List.of(inactiva), 5L, 0L, 0L, 7L));
    }

    @Test void evitaPublicarCambiosConRevisionEditorialObsoleta() {
        assertThrows(ConflictException.class, () -> CmsPublicacionContrato.evaluar(
                borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto"))),
                pagina, secciones, 4L, 0L, 0L, 7L));
    }

    @Test void evitaPublicarSobreRevisionPublicadaNueva() {
        assertThrows(ConflictException.class, () -> CmsPublicacionContrato.evaluar(
                borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto"))),
                pagina, secciones, 5L, 1L, 1L, 7L));
        assertThrows(ConflictException.class, () -> CmsPublicacionContrato.evaluar(
                borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto"))),
                pagina, secciones, 5L, 0L, 1L, 7L));
    }

    @Test void ocultaBorradorDeOtroPropietario() {
        assertThrows(ResourceNotFoundException.class, () -> CmsPublicacionContrato.evaluar(
                borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto"))),
                pagina, secciones, 5L, 0L, 0L, 8L));
    }

    @Test void rechazaBorradoresDescartadosODeVisibilidad() {
        CmsBorrador b = borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto")));
        b.setEstado(EstadoBorrador.DESCARTADO);
        assertThrows(ConflictException.class, () -> evaluar(b));
        b.setEstado(EstadoBorrador.EN_EDICION);
        b.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        assertThrows(ConflictException.class, () -> evaluar(b));
    }

    @Test void validaExclusivamenteLaPaginaInicioYNoAsumeIdsDeSeccion() {
        CmsBorrador b = borrador(List.of(textos(14, "Inicio", "Etiqueta", "Texto")));
        pagina.setCodigo("OTRA_PAGINA");
        assertThrows(IllegalArgumentException.class, () -> evaluar(b));
    }

    @Test void laEvaluacionNoModificaContenidoPendiente() {
        Map<String, Object> entrada = new LinkedHashMap<>(Map.of("id_seccion", 14, "titulo", "X"));
        CmsBorrador b = borrador(List.of(entrada));
        evaluar(b);
        assertEquals(Map.of("id_seccion", 14, "titulo", "X"), entrada);
        assertThrows(UnsupportedOperationException.class, () -> evaluar(b).cambios().getFirst()
                .textos().put("titulo", "Alterado"));
    }

    private CmsPublicacionContrato.Plan evaluar(CmsBorrador b) {
        return CmsPublicacionContrato.evaluar(b, pagina, secciones, 5L, 0L, 0L, 7L);
    }

    private static Map<String,Object> textos(long id, String titulo, String subtitulo, String contenido) {
        return Map.of("id_seccion", id, "titulo", titulo, "subtitulo", subtitulo, "contenido", contenido);
    }

    private static CmsBorrador borrador(List<Map<String,Object>> cambios) {
        CmsBorrador b = new CmsBorrador();
        b.setIdBorrador(4L);
        b.setIdUsuarioRegistro(7L);
        b.setIdPagina(91L);
        b.setTipoObjetivo(TipoObjetivoBorrador.PAGINA);
        b.setEstado(EstadoBorrador.EN_EDICION);
        b.setRevisionEdicion(5L);
        b.setRevisionBase(0L);
        b.setContenidoPendiente(Map.of("secciones", cambios));
        return b;
    }

    private static Pagina pagina() {
        Pagina p = new Pagina();
        p.setIdPagina(91L);
        p.setCodigo("INICIO");
        p.setActivo(true);
        return p;
    }

    private static Seccion seccion(Long id, String codigo, boolean visible) {
        Seccion s = new Seccion();
        s.setIdSeccion(id);
        s.setIdPagina(91L);
        s.setCodigo(codigo);
        s.setActivo(true);
        s.setVisible(visible);
        return s;
    }
}
