package monolithe.core_service.exception;

/** Indica que la consulta externa no puede entregar una identidad confiable. */
public class ConsultaIdentidadNoDisponibleException extends RuntimeException {
    /** Evita propagar respuestas externas que puedan contener información sensible. */
    public ConsultaIdentidadNoDisponibleException() {
        super("La consulta de identidad no está disponible.");
    }
}
