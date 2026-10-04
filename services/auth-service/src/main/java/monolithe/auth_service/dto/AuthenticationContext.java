package monolithe.auth_service.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AuthenticationContext(
        Long idUsuario,
        String usuarioLogin,
        String passwordHash,
        boolean requiereCambioPassword,
        LocalDateTime bloqueadoHasta,
        boolean estadoActivo,
        boolean permiteAcceso,
        List<String> authorities) {
}
