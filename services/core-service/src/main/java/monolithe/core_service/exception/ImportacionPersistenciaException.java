package monolithe.core_service.exception;

public class ImportacionPersistenciaException extends RuntimeException {
    private final String contexto;
    public ImportacionPersistenciaException(String contexto, Throwable cause) {
        super("Falló el registro de la importación", cause);
        this.contexto = contexto;
    }
    public String getContexto() { return contexto; }
}
