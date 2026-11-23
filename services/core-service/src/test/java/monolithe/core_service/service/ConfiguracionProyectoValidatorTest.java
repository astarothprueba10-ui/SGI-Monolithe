package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.*;
import monolithe.core_service.dto.ConfiguracionProyectoResponse.*;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ConfiguracionProyectoValidatorTest {
    private Etapa etapa(Disponibilidad modo, TipoDescuento tipo, String valor) {
        return new Etapa("E1", "Preventa", modo, tipo, new BigDecimal(valor));
    }
    private final List<Manzana> manzanas = List.of(new Manzana(1L, "A", "Manzana A"));
    private final List<Lote> lotes = List.of(new Lote(2L, 1L, "A-01"));

    @Test
    void aceptaPromocionYAsignaciones() {
        var datos = new Datos(List.of(etapa(Disponibilidad.PROMOCION, TipoDescuento.PORCENTAJE, "10")),
                List.of(new Asignacion(1L, "E1")), List.of(new Asignacion(2L, "E1")));
        assertDoesNotThrow(() -> ConfiguracionProyectoValidator.validar(datos, manzanas, lotes));
    }
    @Test
    void rechazaAsignacionDeOtroProyecto() {
        var datos = new Datos(List.of(etapa(Disponibilidad.REGULAR, TipoDescuento.NINGUNO, "0")),
                List.of(new Asignacion(99L, "E1")), List.of());
        assertThrows(ReglaNegocioException.class, () -> ConfiguracionProyectoValidator.validar(datos, manzanas, lotes));
    }
    @Test
    void rechazaDescuentoEnEtapaBloqueada() {
        var datos = new Datos(List.of(etapa(Disponibilidad.BLOQUEADA, TipoDescuento.MONTO_FIJO, "100")),
                List.of(), List.of());
        assertThrows(ReglaNegocioException.class, () -> ConfiguracionProyectoValidator.validar(datos, manzanas, lotes));
    }
    @Test
    void rechazaDescuentoTotalYEtapasDuplicadas() {
        var total = etapa(Disponibilidad.PROMOCION, TipoDescuento.PORCENTAJE, "100");
        var normal = etapa(Disponibilidad.REGULAR, TipoDescuento.NINGUNO, "0");
        for (var lista : List.of(List.of(total), List.of(normal, normal))) {
            var datos = new Datos(lista, List.of(), List.of());
            assertThrows(ReglaNegocioException.class, () -> ConfiguracionProyectoValidator.validar(datos, manzanas, lotes));
        }
    }
}
