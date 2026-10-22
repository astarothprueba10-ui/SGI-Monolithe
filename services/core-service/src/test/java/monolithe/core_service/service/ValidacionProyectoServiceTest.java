package monolithe.core_service.service;

import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDate;

import static monolithe.core_service.service.ProyectoTestData.request;
import static org.junit.jupiter.api.Assertions.*;

class ValidacionProyectoServiceTest {
    private final ValidacionProyectoService service = new ValidacionProyectoService(new UbigeoService());

    @ParameterizedTest
    @CsvSource({"2026-01-01,2026-12-31", "2026-01-01,2026-01-01", "2024-02-29,2024-03-01",
            "0001-01-01,9999-12-31"})
    void admiteFechasOrdenadasIgualesYBisiestas(String inicio, String fin) {
        assertDoesNotThrow(() -> service.validar(request("Lambayeque", "Chiclayo", "Eten", "Perú",
                LocalDate.parse(inicio), LocalDate.parse(fin))));
    }

    @Test
    void rechazaFechasInvertidas() {
        assertThrows(ReglaNegocioException.class, () -> service.validar(request(null, null, null, null,
                LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1))));
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 0, 10000})
    void rechazaAniosFueraDelRangoEnAmbasFechas(int year) {
        var fecha = LocalDate.of(year, 1, 1);
        assertThrows(ReglaNegocioException.class, () -> service.validar(request(null, null, null, null, fecha, null)));
        assertThrows(ReglaNegocioException.class, () -> service.validar(request(null, null, null, null, null, fecha)));
    }

    @Test
    void conservaFechasOpcionalesYPaisPorDefecto() {
        assertDoesNotThrow(() -> service.validar(request(null, null, null, null, null, null)));
        assertDoesNotThrow(() -> service.validar(request(null, null, null, "peru", LocalDate.now(), null)));
        assertDoesNotThrow(() -> service.validar(request(null, null, null, "Perú", null, LocalDate.now())));
    }

    @Test
    void rechazaUnPaisDiferenteAunqueLaUbicacionEsteVacia() {
        assertThrows(ReglaNegocioException.class, () -> service.validar(request(null, null, null, "Chile", null, null)));
    }
}
