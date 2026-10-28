package monolithe.auth_service.exception;

/** Error de negocio que revierte la edición administrativa completa. */
public class UserUpdateException extends RuntimeException {
    private final String estado;

    /** Conserva el estado de negocio y su explicación pública. */
    public UserUpdateException(String estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    /** Estado que determina la respuesta HTTP de la edición. */
    public String getEstado() {
        return estado;
    }
}
