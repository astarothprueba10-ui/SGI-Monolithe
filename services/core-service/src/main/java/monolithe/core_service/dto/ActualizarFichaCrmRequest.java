package monolithe.core_service.dto;

/** Campos editables del expediente comercial. Nunca altera identidad ni correo verificado. */
public record ActualizarFichaCrmRequest(
        String origenCodigo,
        String observaciones,
        Long idProyectoInteres
) {}
