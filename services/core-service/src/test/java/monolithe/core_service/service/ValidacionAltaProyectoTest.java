package monolithe.core_service.service;

import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Instant;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class ValidacionAltaProyectoTest {
    private static final LocalDate HOY = LocalDate.of(2026, 11, 6);
    private static final String DESCRIPCION = "Proyecto inmobiliario con áreas verdes";

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "12345678901234567890", "abcdefghijklmn", "a b c d e 1234567890"})
    void rechazaDescripcionAusenteOCorta(String descripcion) {
        assertThrows(ReglaNegocioException.class, () -> ValidacionAltaProyecto.validar(descripcion, HOY, HOY, HOY));
    }

    @ParameterizedTest
    @ValueSource(strings = {"abcdefghijklmno", "ÁéíóúñÁéíóúñÁéí", "Proyecto con 123 lotes y áreas verdes", "Descripcio\u0301n de un proyecto"})
    void aceptaQuinceLetrasOTildesNormalizadas(String descripcion) {
        assertDoesNotThrow(() -> ValidacionAltaProyecto.validar(descripcion, HOY, HOY, HOY));
    }

    @Test
    void aceptaHoyFuturoYFechasOpcionales() {
        assertDoesNotThrow(() -> ValidacionAltaProyecto.validar(DESCRIPCION, HOY, HOY, HOY));
        assertDoesNotThrow(() -> ValidacionAltaProyecto.validar(DESCRIPCION, HOY.plusDays(1), HOY.plusDays(2), HOY));
        assertDoesNotThrow(() -> ValidacionAltaProyecto.validar(DESCRIPCION, null, null, HOY));
    }

    @Test
    void rechazaInicioYFinAnterioresAlRegistro() {
        assertThrows(ReglaNegocioException.class, () -> ValidacionAltaProyecto.validar(DESCRIPCION, HOY.minusDays(1), null, HOY));
        assertThrows(ReglaNegocioException.class, () -> ValidacionAltaProyecto.validar(DESCRIPCION, null, HOY.minusDays(1), HOY));
    }

    @ParameterizedTest
    @CsvSource({"2026-11-07T04:59:59Z,2026-11-06", "2026-11-07T05:00:00Z,2026-11-07"})
    void resuelveElDiaDePeruAlCruzarMedianocheUtc(String instante, String esperado) {
        assertEquals(LocalDate.parse(esperado), ValidacionAltaProyecto.fechaRegistro(Instant.parse(instante)));
    }
}
