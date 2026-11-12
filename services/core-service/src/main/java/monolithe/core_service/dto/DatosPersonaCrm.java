package monolithe.core_service.dto;
import monolithe.core_service.validation.NombrePersona;

/** Datos mínimos de identidad utilizados para completar un lead. */
public record DatosPersonaCrm(String nombres, String apellidoPaterno, String apellidoMaterno) {
    /** Conserva la ortografía del proveedor con iniciales uniformes. */
    public DatosPersonaCrm {
        nombres = NombrePersona.normalizar(nombres);
        apellidoPaterno = NombrePersona.normalizar(apellidoPaterno);
        apellidoMaterno = NombrePersona.normalizar(apellidoMaterno);
    }
}
