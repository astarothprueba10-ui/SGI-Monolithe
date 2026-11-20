package monolithe.auth_service.exception;

import org.springframework.http.HttpStatus;

/** Fallo previsto del segundo factor cuya contabilización debe persistir. */
public class MfaException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    private MfaException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    /** Estado para un reto agotado, sustituido o asociado a credenciales antiguas. */
    public static MfaException expired() {
        return new MfaException(HttpStatus.UNAUTHORIZED, "MFA_RETO_EXPIRADO",
                "La verificación expiró. Ingresa tu documento y contraseña nuevamente.");
    }

    /** Estado para un código erróneo o usado. */
    public static MfaException invalidCode() {
        return new MfaException(HttpStatus.UNPROCESSABLE_ENTITY, "MFA_CODIGO_INVALIDO",
                "Código incorrecto, vencido o ya usado. Revisa el código e inténtalo de nuevo.");
    }

    /** Estado para el bloqueo temporal de intentos por cuenta. */
    public static MfaException locked() {
        return new MfaException(HttpStatus.TOO_MANY_REQUESTS, "MFA_BLOQUEADO",
                "Demasiados intentos de verificación. Espera cinco minutos y vuelve a iniciar sesión.");
    }

    /** Impide completar la autenticación desde un portal sin permiso. */
    public static MfaException wrongPortal() {
        return new MfaException(HttpStatus.FORBIDDEN, "MFA_PORTAL_DENEGADO",
                "Esta cuenta no tiene acceso a este portal.");
    }

    /** Código HTTP para la respuesta de autenticación. */
    public HttpStatus status() {
        return status;
    }

    /** Identificador estable para que el formulario sepa cuándo volver al inicio. */
    public String code() {
        return code;
    }
}
