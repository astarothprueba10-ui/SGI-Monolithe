package monolithe.core_service.service;

import static org.junit.jupiter.api.Assertions.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class PlanoCadArchivoValidatorTest {
    private byte[] dwg() {
        byte[] raw = new byte[1024];
        System.arraycopy("AC1032".getBytes(StandardCharsets.US_ASCII),0,raw,0,6);
        return raw;
    }

    @Test void aceptaDwgAutoCad2018SinInterpretarGeometria() {
        var info=PlanoCadArchivoValidator.verificar("Planta General - LOTIZACIÓN final.dwg",dwg());
        assertEquals("DWG",info.formato());
        assertEquals("application/octet-stream",info.mime());
        assertEquals(64,info.sha256().length());
        assertEquals(info.sha256(),PlanoCadArchivoValidator.verificar("copia.dwg",dwg()).sha256());
    }

    @Test void rechazaExtensionDwgConContenidoFalso() {
        assertThrows(ResponseStatusException.class,
            ()->PlanoCadArchivoValidator.verificar("malo.dwg",new byte[150]));
    }

    @Test void aceptaSvgSimpleYRechazaCodigoActivo() {
        byte[] svg="<svg viewBox=\"0 0 100 100\"><rect width=\"50\" height=\"50\"/></svg>"
            .getBytes(StandardCharsets.UTF_8);
        assertEquals("SVG",PlanoCadArchivoValidator.verificar("plano.svg",svg).formato());
        byte[] malo="<svg><script>alert(1)</script></svg>".getBytes(StandardCharsets.UTF_8);
        assertThrows(ResponseStatusException.class,()->PlanoCadArchivoValidator.verificar("plano.svg",malo));
    }

    @Test void rechazaArchivoVacioRutasYOtrosFormatos() {
        assertThrows(ResponseStatusException.class,()->PlanoCadArchivoValidator.verificar("../x.dwg",dwg()));
        assertThrows(ResponseStatusException.class,()->PlanoCadArchivoValidator.verificar("x.pdf",dwg()));
        assertThrows(ResponseStatusException.class,()->PlanoCadArchivoValidator.verificar("x.dwg",new byte[0]));
    }
}
