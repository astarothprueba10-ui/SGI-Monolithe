package monolithe.core_service.service;

import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ValidacionNumerosProyectoTest {
    private final ValidacionProyectoService service = new ValidacionProyectoService(new UbigeoService());

    @Test
    void areaValidaConDosDecimales() {
        assertDoesNotThrow(() -> service.validar(request("99999999.99")));
        assertDoesNotThrow(() -> service.validar(request("0.01")));
        assertDoesNotThrow(() -> service.validar(request(null)));
    }

    @Test
    void areaRechazadaConMasDeDiezCifras() {
        for (String valor : new String[] {"10000000000", "999999999.99", "1E10"}) {
            var ex = assertThrows(ReglaNegocioException.class, () -> service.validar(request(valor)));
            assertTrue(ex.getMessage().contains("10 dígitos"));
        }
    }

    private ProyectoRequest request(String area) {
        return new ProyectoRequest("PLANIFICADO", "Proyecto de prueba", null, null, null,
                null, null, null, "Perú", area == null ? null : new BigDecimal(area), null, null, true);
    }
}
