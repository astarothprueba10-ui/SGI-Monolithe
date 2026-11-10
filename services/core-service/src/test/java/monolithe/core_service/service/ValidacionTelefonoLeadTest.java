package monolithe.core_service.service;

import monolithe.core_service.exception.ReglaNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvFileSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import static org.junit.jupiter.api.Assertions.*;

class ValidacionTelefonoLeadTest {
    @ParameterizedTest
    @CsvFileSource(resources = "/fixtures/telefonos-moviles.csv", numLinesToSkip = 1)
    void aceptaLosEjemplosMovilesDeCadaPaisDelSelector(String pais, String telefono) {
        assertDoesNotThrow(() -> ValidacionTelefonoLead.validar(telefono), pais + ": " + telefono);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "98765432", "9876543210", "812345678", "+51812345678", "+519876543210",
            "+34912345678", "+120155501230", "+57321123456", "+593812345678", "98765a321", "987 654 321", "+00000000000"})
    void rechazaLongitudesPrefijosYCaracteresInvalidos(String telefono) {
        assertThrows(ReglaNegocioException.class, () -> ValidacionTelefonoLead.validar(telefono));
    }

    @Test
    void conservaLosDosFormatosPeruanosQueYaUsabaLaApi() {
        assertDoesNotThrow(() -> ValidacionTelefonoLead.validar("987654321"));
        assertDoesNotThrow(() -> ValidacionTelefonoLead.validar("+51987654321"));
    }
}
