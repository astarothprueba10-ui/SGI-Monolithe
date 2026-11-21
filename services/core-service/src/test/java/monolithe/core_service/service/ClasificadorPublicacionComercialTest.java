package monolithe.core_service.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ClasificadorPublicacionComercialTest {
    @Test
    void loteLegadoSinEtapaQuedaBloqueadoNoSeAutorizaVenta() {
        assertEquals("BLOQUEADA", ClasificadorPublicacionComercial.situacion("SIN_ASIGNACION"));
        String mensaje = ClasificadorPublicacionComercial.detalle("SIN_ASIGNACION", "Etapa no asignada");
        assertTrue(mensaje.contains("bloqueado"));
        assertTrue(mensaje.contains("estado de inventario"));
        assertTrue(mensaje.contains("precio histórico"));
    }

    @Test
    void etapaBloqueadaPermaneceCerrada() {
        assertEquals("BLOQUEADA", ClasificadorPublicacionComercial.situacion("BLOQUEADA"));
    }

    @Test
    void erroresRealesDeTarifasYCalculosSiguenBloqueandoTodaLaPublicacion() {
        for (String codigo : new String[] {"SIN_TARIFA", "AJUSTE_AMBIGUO",
                "MONEDA_DESCUENTO", "PRECIO_INVALIDO"}) {
            assertEquals("ERROR", ClasificadorPublicacionComercial.situacion(codigo), codigo);
        }
    }
}
