package monolithe.auth_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Error de autogestión MFA sin exponer claves, retos ni correos. */
public final class MfaFlowException extends ResponseStatusException {
    public MfaFlowException(HttpStatus status, String mensaje) {
        super(status, mensaje);
    }
}
