package monolithe.auth_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class LoginResponse {

    private Long idUsuario;
    private String usuario;
    private List<String> autoridades;

    private boolean requiereCambioPassword;
    
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;

    private String mensaje;

    
}