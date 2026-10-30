package monolithe.cms_service.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CmsPublicacionHistorialEntityTest {

    private static Map<String, Object> snapshot(String titulo) {
        return Map.of(
                "pagina", Map.of("codigo", "INICIO", "titulo", titulo),
                "secciones", List.of(Map.of("codigo", "HERO_PRINCIPAL", "titulo", titulo)));
    }

    @Test
    void construyePrimeraVersionSinPublicar() {
        CmsPublicacionHistorial historial = CmsPublicacionHistorial.nueva(
                1L, 4L, 10L, 0L, snapshot("Anterior"), snapshot("Nuevo"));
        assertEquals(1L, historial.getIdPagina());
        assertEquals(4L, historial.getIdBorrador());
        assertEquals(10L, historial.getIdUsuarioPublicacion());
        assertEquals(0L, historial.getRevisionAnterior());
        assertEquals(1L, historial.getRevisionNueva());
        assertEquals(Short.valueOf((short) 1), historial.getVersionFormato());
        assertNull(historial.getIdHistorial());
        assertNull(historial.getFechaPublicacion());
    }

    @Test
    void siguienteVersionIncrementaExactamenteUno() {
        CmsPublicacionHistorial historial = CmsPublicacionHistorial.nueva(
                1L, 5L, 10L, 19L, snapshot("A"), snapshot("B"));
        assertEquals(20L, historial.getRevisionNueva());
    }

    @Test
    void rechazaIdentidadesNulasOCero() {
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(null, 4L, 10L, 0L, snapshot("A"), snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 0L, 10L, 0L, snapshot("A"), snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, -1L, 0L, snapshot("A"), snapshot("B")));
    }

    @Test
    void rechazaRevisionInvalidaYDesbordamiento() {
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, -1L, snapshot("A"), snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, null, snapshot("A"), snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, Long.MAX_VALUE, snapshot("A"), snapshot("B")));
    }

    @Test
    void rechazaSnapshotsIncompletos() {
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, 0L, null, snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, 0L, Map.of("pagina", Map.of()), snapshot("B")));
        assertThrows(IllegalArgumentException.class,
                () -> CmsPublicacionHistorial.nueva(1L, 4L, 10L, 0L, snapshot("A"),
                        Map.of("pagina", "valor-no-objeto", "secciones", List.of())));
    }

    @Test
    void conservaDosSnapshotsIndependientes() {
        CmsPublicacionHistorial historial = CmsPublicacionHistorial.nueva(
                1L, 4L, 10L, 0L, snapshot("Previo"), snapshot("Publicado"));
        assertNotEquals(historial.getSnapshotAnterior(), historial.getSnapshotNuevo());
        assertEquals("Previo", ((Map<?, ?>) historial.getSnapshotAnterior().get("pagina")).get("titulo"));
        assertEquals("Publicado", ((Map<?, ?>) historial.getSnapshotNuevo().get("pagina")).get("titulo"));
    }

    @Test
    void usaTablaCorrectaYEntidadInmutable() {
        assertNotNull(CmsPublicacionHistorial.class.getAnnotation(Entity.class));
        assertEquals("cms_publicacion_historial", CmsPublicacionHistorial.class.getAnnotation(Table.class).name());
        assertNotNull(CmsPublicacionHistorial.class.getAnnotation(Immutable.class));
    }

    @Test
    void mapeaSnapshotsJsonbDeHibernate() throws Exception {
        comprobarJsonb("snapshotAnterior", "snapshot_anterior");
        comprobarJsonb("snapshotNuevo", "snapshot_nuevo");
    }

    @Test
    void mapeaIdentidadYFechaAsignadaPorBaseDeDatos() throws Exception {
        Field id = CmsPublicacionHistorial.class.getDeclaredField("idHistorial");
        assertEquals(GenerationType.IDENTITY, id.getAnnotation(GeneratedValue.class).strategy());
        Column fecha = CmsPublicacionHistorial.class.getDeclaredField("fechaPublicacion")
                .getAnnotation(Column.class);
        assertEquals("fecha_publicacion", fecha.name());
        assertFalse(fecha.insertable());
        assertFalse(fecha.updatable());
    }

    private static void comprobarJsonb(String atributo, String columna) throws Exception {
        Field campo = CmsPublicacionHistorial.class.getDeclaredField(atributo);
        assertEquals(SqlTypes.JSON, campo.getAnnotation(JdbcTypeCode.class).value());
        Column anotacion = campo.getAnnotation(Column.class);
        assertEquals(columna, anotacion.name());
        assertEquals("jsonb", anotacion.columnDefinition());
        assertFalse(anotacion.updatable());
    }
}
