package monolithe.cms_service.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ReferenciaConsultaTest {
    @Test void conservaUnicidadCuandoCreceElIdentificador() {
        assertEquals("MON-000001", ReferenciaConsulta.formatear(1L));
        assertEquals("MON-999999", ReferenciaConsulta.formatear(999999L));
        assertEquals("MON-1000000", ReferenciaConsulta.formatear(1000000L));
        assertEquals("MON-9223372036854775807", ReferenciaConsulta.formatear(Long.MAX_VALUE));
    }
    @Test void exigeUnaConsultaGuardada() {
        assertThrows(IllegalArgumentException.class, () -> ReferenciaConsulta.formatear(null));
        assertThrows(IllegalArgumentException.class, () -> ReferenciaConsulta.formatear(0L));
    }
}
