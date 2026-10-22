package monolithe.core_service.dto;

public record SolicitudCambioCorreoResponse(
        String mensaje,
        long minutosExpiracion
) {
}
