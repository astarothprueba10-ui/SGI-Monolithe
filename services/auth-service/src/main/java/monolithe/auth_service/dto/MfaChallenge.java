package monolithe.auth_service.dto;

/** Paso posterior a la contraseña. No contiene credenciales de sesión. */
public record MfaChallenge(String reto, Paso paso, int venceEn) {
    /** Factor o prueba de activación que corresponde a la cuenta. */
    public enum Paso { ACTIVACION, CODIGO }

    @Override
    public String toString() {
        return "MfaChallenge[paso=" + paso + "]";
    }
}
