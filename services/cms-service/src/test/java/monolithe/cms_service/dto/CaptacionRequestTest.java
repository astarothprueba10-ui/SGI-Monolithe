package monolithe.cms_service.dto;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class CaptacionRequestTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private ConsultaWebRequest valido() {
        var r = new ConsultaWebRequest(); r.setIdSolicitud(UUID.randomUUID());
        r.setNombres(" Ana "); r.setApellidoPaterno(" Pérez "); r.setCorreo("ANA@EJEMPLO.COM");
        r.setTelefono("+51 (987) 654-321"); r.setIdProyecto(1L);
        r.setMotivoContacto("Comprar lote"); r.setAceptaPrivacidad(true); return r;
    }
    @Test void admiteDocumentoYMensajeAusentesYNormalizaCorreo() {
        var r = valido(); assertTrue(validator.validate(r).isEmpty());
        assertEquals("ana@ejemplo.com", r.getCorreo()); assertEquals("Ana Pérez", r.getNombre());
    }
    @Test void exigeCorreoTelefonoProyectoConsentimientoYSolicitud() {
        var r = valido(); r.setCorreo(""); r.setTelefono(""); r.setIdProyecto(null);
        r.setAceptaPrivacidad(false); r.setIdSolicitud(null);
        assertTrue(validator.validate(r).size() >= 5);
    }
    @Test void rechazaTelefonoDocumentoYNombreIncompatibles() {
        var r = valido(); r.setTelefono("+0000000"); r.setTipoDocumento("DNI"); r.setNumeroDocumento("123");
        assertFalse(validator.validate(r).isEmpty());
        r.setTelefono("987654321"); r.setNumeroDocumento("12345678");
        assertTrue(validator.validate(r).isEmpty());
        r.setNombres("A".repeat(120)); r.setApellidoPaterno("B".repeat(80));
        assertFalse(validator.validate(r).isEmpty());
    }
    @Test void capturaInternaSinMotivoNiDocumentoYConApellidosCompletos() {
        var r = new CaptacionInternaRequest(); r.setIdSolicitud(UUID.randomUUID());
        r.setNombres("Ana"); r.setApellidoPaterno("De la Cruz Flores"); r.setCorreo("ana@ejemplo.com");
        r.setTelefono("987654321"); r.setIdProyecto(1L); r.setOrigenCodigo("REFERIDO");
        assertTrue(validator.validate(r).isEmpty());
        assertEquals("Registro interno de lead", r.getMotivoContacto());
        assertEquals("Ana De la Cruz Flores", r.getNombre()); assertNull(r.getApellidoMaterno());
    }
}
