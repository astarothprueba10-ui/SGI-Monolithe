package monolithe.auth_service.exception;

public class UserDisabledException extends RuntimeException {

    public UserDisabledException() {
        super("El usuario se encuentra inhabilitado.");
    }

    public UserDisabledException(String mensaje) {
        super(mensaje);
    }
}
