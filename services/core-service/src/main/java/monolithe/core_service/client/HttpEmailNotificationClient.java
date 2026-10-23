
package monolithe.core_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class HttpEmailNotificationClient implements EmailNotificationClient {

        private final RestClient restClient;
        private final String internalMailKey;

        public HttpEmailNotificationClient(
                        @Value("${services.auth.url:http://localhost:8081}") String authServiceUrl,
                        @Value("${security.internal.mail-key:}") String internalMailKey) {

                this.restClient = RestClient.builder()
                                .baseUrl(authServiceUrl)
                                .build();

                this.internalMailKey = internalMailKey;
        }

        @Override
        public void enviarConfirmacionCambioCorreo(
                        String destinatario,
                        String urlConfirmacion,
                        long minutosExpiracion,
                        String jwtToken) {

                // Impedir solicitudes sin clave de servicio.
                if (internalMailKey == null || internalMailKey.isBlank()) {
                        throw new IllegalStateException(
                                        "La clave interna de correo no está configurada.");
                }

                restClient.post()
                                .uri("/api/auth/internal/mail/confirmacion-cambio-correo")
                                .header(
                                                HttpHeaders.AUTHORIZATION,
                                                "Bearer " + jwtToken)
                                .header(
                                                "X-Internal-Service-Key",
                                                internalMailKey)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(Map.of(
                                                "destinatario", destinatario,
                                                "urlConfirmacion", urlConfirmacion,
                                                "minutosExpiracion", minutosExpiracion))
                                .retrieve()
                                .toBodilessEntity();
        }
}
