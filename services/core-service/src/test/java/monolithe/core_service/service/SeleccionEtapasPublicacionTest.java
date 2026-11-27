package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class SeleccionEtapasPublicacionTest {
    private final List<Etapa> etapas = List.of(
        new Etapa("ALM-C01", "Preventa", Disponibilidad.PROMOCION, TipoDescuento.PORCENTAJE, BigDecimal.valueOf(5)),
        new Etapa("ALM-C02", "Etapa 2", Disponibilidad.ANTICIPADA, TipoDescuento.NINGUNO, BigDecimal.ZERO),
        new Etapa("ALM-C04", "Cerrada", Disponibilidad.BLOQUEADA, TipoDescuento.NINGUNO, BigDecimal.ZERO));

    @Test void sinSeleccionNoLiberaInventario() {
        var seleccion = SeleccionEtapasPublicacion.validar(List.of(), etapas);
        assertTrue(seleccion.isEmpty());
        assertFalse(SeleccionEtapasPublicacion.liberarInventario("ALM-C01", "NO_DISPONIBLE", seleccion));
    }

    @Test void habilitarEtapaSeleccionadaNoLiberaLasDemas() {
        var seleccion = SeleccionEtapasPublicacion.validar(List.of("ALM-C01"), etapas);
        assertTrue(SeleccionEtapasPublicacion.liberarInventario("ALM-C01", "NO_DISPONIBLE", seleccion));
        assertFalse(SeleccionEtapasPublicacion.liberarInventario("ALM-C02", "NO_DISPONIBLE", seleccion));
        assertFalse(SeleccionEtapasPublicacion.liberarInventario("ALM-C01", "DISPONIBLE", seleccion));
        assertFalse(SeleccionEtapasPublicacion.liberarInventario(null, "NO_DISPONIBLE", seleccion));
    }

    @Test void rechazaCodigosDesconocidosYDuplicados() {
        for (var seleccion : List.of(List.of("DESCONOCIDA"),
                List.of("ALM-C01","ALM-C01"))) {
            assertThrows(ReglaNegocioException.class,
                () -> SeleccionEtapasPublicacion.validar(seleccion, etapas));
        }
        assertThrows(ReglaNegocioException.class,
            () -> SeleccionEtapasPublicacion.validar(null, etapas));
    }

    @Test void permiteSeleccionarEtapaHistoricamenteBloqueadaYProtegeEstados() {
        var seleccion = SeleccionEtapasPublicacion.validar(List.of("ALM-C04"),etapas);
        assertTrue(SeleccionEtapasPublicacion.liberarInventario("ALM-C04","NO_DISPONIBLE",seleccion));
        assertTrue(SeleccionEtapasPublicacion.bloquearInventario("ALM-C01","DISPONIBLE",seleccion));
        assertFalse(SeleccionEtapasPublicacion.bloquearInventario("ALM-C04","DISPONIBLE",seleccion));
        for (var estado : List.of("RESERVADO","VENDIDO","BLOQUEADO")) {
            assertFalse(SeleccionEtapasPublicacion.bloquearInventario("ALM-C01",estado,seleccion));
            assertFalse(SeleccionEtapasPublicacion.liberarInventario("ALM-C04",estado,seleccion));
        }
    }

    @Test void ordenCanonicoParaConfirmacion() {
        var a = SeleccionEtapasPublicacion.validar(List.of("ALM-C02","ALM-C01"), etapas);
        var b = SeleccionEtapasPublicacion.validar(List.of("ALM-C01","ALM-C02"), etapas);
        assertEquals(List.copyOf(a), List.copyOf(b));
    }
}
