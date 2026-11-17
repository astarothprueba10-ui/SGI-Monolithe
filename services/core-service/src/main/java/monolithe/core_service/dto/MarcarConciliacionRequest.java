package monolithe.core_service.dto;
import jakarta.validation.constraints.*;
/** Seguimiento humano; REVISADA no modifica ni resuelve automáticamente pagos. */
public record MarcarConciliacionRequest(
    @NotBlank @Size(max=55) String codigoIncidencia,
    @NotBlank String estado,
    @NotBlank @Size(min=10,max=500) String comentario
) {}
