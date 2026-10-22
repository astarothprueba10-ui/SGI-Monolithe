package monolithe.auth_service.service;

public class UserCreationException extends RuntimeException {

    private final String estado;

    public UserCreationException(String estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public String getEstado() {
        return estado;
    }
}
