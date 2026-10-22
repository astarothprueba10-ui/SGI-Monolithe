package monolithe.core_service.service;

import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class ValidacionNumerosProyectoTest {
    private final ValidacionProyectoService service = new ValidacionProyectoService(new UbigeoService());

    @ParameterizedTest
    @CsvSource({"9999999999,,", "99999999.99,-90.0000000,-180.0000000",
            "0.01,-12.1234567,-123.1234567", ",0.0000001,0.0000000"})
    void admiteHastaDiezCifrasSinContarSignoNiSeparador(String area, String latitud, String longitud) {
        assertDoesNotThrow(() -> service.validar(request(area, latitud, longitud)));
    }

    @ParameterizedTest
    @CsvSource({"10000000000,,", "999999999.99,,", ",1.1234567890,", ",,10.123456789",
            "1E10,,", "0.0000000001,,"})
    void rechazaMasDeDiezCifrasEnCualquierCampo(String area, String latitud, String longitud) {
        var error = assertThrows(ReglaNegocioException.class, () -> service.validar(request(area, latitud, longitud)));
        assertTrue(error.getMessage().contains("10 dígitos"));
    }

    private ProyectoRequest request(String area, String latitud, String longitud) {
        return new ProyectoRequest("PLANIFICADO", "PROJ-001", "Proyecto de prueba", null, null, null,
                null, null, null, "Perú", decimal(latitud), decimal(longitud), decimal(area), null, null, true);
    }

    private BigDecimal decimal(String value) {
        return value == null ? null : new BigDecimal(value);
    }
}
