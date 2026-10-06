package monolithe.auth_service.exception;

public class AccountAccessRestrictedException extends RuntimeException {

    public AccountAccessRestrictedException(String mensaje) {
        super(mensaje);
    }
}
