package monolithe.auth_service.dto;

/** Resultado interno del login. El dispositivo se comunica por Set-Cookie. */
public record LoginFlow(MfaChallenge challenge, LoginResponse session, String deviceToken) {

    public static LoginFlow pending(MfaChallenge challenge) {
        return new LoginFlow(challenge, null, null);
    }

    public static LoginFlow completed(LoginResponse session, String deviceToken) {
        return new LoginFlow(null, session, deviceToken);
    }

    @Override
    public String toString() {
        return "LoginFlow[datos omitidos]";
    }
}
