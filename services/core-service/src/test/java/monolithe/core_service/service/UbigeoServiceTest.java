package monolithe.core_service.service;

import monolithe.core_service.dto.UbigeoResponse;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class UbigeoServiceTest {
    private final UbigeoService service = new UbigeoService();

    @Test
    void catalogoContieneTodasLasJerarquiasSinDuplicados() {
        var filas = service.listar();
        assertEquals(1893, filas.size());
        assertEquals(1893, filas.stream().map(UbigeoResponse::codigo).distinct().count());
        assertEquals(25, filas.stream().map(fila -> fila.codigo().substring(0, 2)).distinct().count());
        assertEquals(196, filas.stream().map(fila -> fila.codigo().substring(0, 4)).distinct().count());
        for (var fila : filas) {
            assertTrue(fila.codigo().matches("\\d{6}"));
            assertEquals(fila, service.resolver(fila.departamento(), fila.provincia(), fila.distrito()));
        }
    }

    @Test
    void normalizaTildesMayusculasYEspaciosDeDatosAnteriores() {
        var fila = service.resolver("  LA LIBERTAD ", "sanchez   carrion", "huamachuco");
        assertEquals("130901", fila.codigo());
        assertEquals("Sánchez Carrión", fila.provincia());
        assertEquals("010101", service.resolver("Amazonas", "Chachapoyas", "Chachapoyas").codigo());
    }

    @Test
    void rechazaJerarquiasMezcladasYUbicacionesIncompletas() {
        assertThrows(ReglaNegocioException.class, () -> service.resolver("Lambayeque", "Lima", "Miraflores"));
        assertThrows(ReglaNegocioException.class, () -> service.resolver("Lambayeque", "Chiclayo", ""));
        assertThrows(ReglaNegocioException.class, () -> service.resolver("Lambayeke", "Chiclayo", "Chiclayo"));
    }

    @Test
    void conservaLaUbicacionOpcionalSinExponerUnCatalogoMutable() {
        assertNull(service.resolver(null, " ", "").codigo());
        assertThrows(UnsupportedOperationException.class, () -> service.listar().clear());
    }
}
