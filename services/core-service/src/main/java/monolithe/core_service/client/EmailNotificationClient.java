package monolithe.core_service.client;

public interface EmailNotificationClient {

    void enviarConfirmacionCambioCorreo(
            String destinatario,
            String urlConfirmacion,
            long minutosExpiracion,
            String jwtToken);
}
