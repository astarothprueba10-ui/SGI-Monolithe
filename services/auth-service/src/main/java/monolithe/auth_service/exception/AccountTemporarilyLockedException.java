package monolithe.auth_service.exception;

public class AccountTemporarilyLockedException extends RuntimeException {

    private final long minutosRestantes;

    public AccountTemporarilyLockedException(long minutosRestantes) {
        super(String.format(
                "Usuario bloqueado temporalmente por %d minutos debido a múltiples intentos fallidos.",
                minutosRestantes));
        this.minutosRestantes = minutosRestantes;
    }

    public long getMinutosRestantes() {
        return minutosRestantes;
    }
}
