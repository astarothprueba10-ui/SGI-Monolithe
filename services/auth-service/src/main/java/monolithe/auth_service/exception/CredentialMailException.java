package monolithe.auth_service.exception;

import org.springframework.mail.MailException;

/** Error de entrega con un mensaje seguro que no contiene credenciales. */
public class CredentialMailException extends MailException {
    /** Conserva el diagnóstico técnico para su clasificación interna. */
    public CredentialMailException(String message, Throwable cause) {
        super(message, cause);
    }
}
