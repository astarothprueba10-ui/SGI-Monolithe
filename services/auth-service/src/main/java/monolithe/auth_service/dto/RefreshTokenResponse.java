package monolithe.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RefreshTokenResponse {

    private Long idUsuario;
    private String usuario;
    private java.util.List<String> autoridades;
    private boolean requiereCambioPassword;
    private boolean accesoBackoffice;
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private String mensaje;
}