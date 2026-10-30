package monolithe.cms_service.entity;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class CmsBorradorEntityTest {

    @Test
    void nuevoBorradorInicializaEstadoYRevisiones() {
        CmsBorrador borrador = new CmsBorrador();

        assertEquals(EstadoBorrador.EN_EDICION, borrador.getEstado());
        assertEquals(0L, borrador.getRevisionBase());
        assertEquals(1L, borrador.getRevisionEdicion());
        assertNotNull(borrador.getIdGrupoEdicion());
        assertEquals(Map.of(), borrador.getContenidoPendiente());
    }

    @Test
    void permiteAgruparBorradoresSinCambiarDatosOficiales() {
        UUID grupo = UUID.randomUUID();
        CmsBorrador borrador = new CmsBorrador();
        borrador.setIdGrupoEdicion(grupo);
        borrador.setTipoObjetivo(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO);
        borrador.setIdProyecto(2L);
        borrador.setIdUsuarioRegistro(10L);
        borrador.setContenidoPendiente(Map.of("visiblePublico", false));

        assertEquals(grupo, borrador.getIdGrupoEdicion());
        assertEquals(TipoObjetivoBorrador.VISIBILIDAD_PROYECTO, borrador.getTipoObjetivo());
        assertEquals(2L, borrador.getIdProyecto());
        assertEquals(false, borrador.getContenidoPendiente().get("visiblePublico"));
    }

    @Test
    void elContenidoPendienteUtilizaMapeoJsonB() throws NoSuchFieldException {
        Field campo = CmsBorrador.class.getDeclaredField("contenidoPendiente");
        JdbcTypeCode tipo = campo.getAnnotation(JdbcTypeCode.class);
        assertNotNull(tipo);
        assertEquals(SqlTypes.JSON, tipo.value());
    }

    @Test
    void creaFechasSinPublicarElBorrador() {
        CmsBorrador borrador = new CmsBorrador();
        borrador.antesDeCrear();
        assertNotNull(borrador.getFechaCreacion());
        assertNotNull(borrador.getFechaActualizacion());
        assertNull(borrador.getFechaPublicacion());
        assertNull(borrador.getIdUsuarioPublicacion());
        assertEquals(EstadoBorrador.EN_EDICION, borrador.getEstado());
    }
}
