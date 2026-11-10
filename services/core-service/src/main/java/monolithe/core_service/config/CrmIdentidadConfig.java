package monolithe.core_service.config;

import monolithe.core_service.client.ConsultaDniClient;
import monolithe.core_service.client.DecolectaDniClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.json.JsonMapper;
import java.io.IOException;
import java.net.HttpURLConnection;

/** Cliente acotado de identidad que conserva los clientes HTTP existentes. */
@Configuration
public class CrmIdentidadConfig {
    /** Registra únicamente el proveedor de identidad con su clave privada. */
    @Bean
    public ConsultaDniClient consultaDniClient(JsonMapper mapper, @Value("${crm.dni.api-token:}") String token) {
        return new DecolectaDniClient(crearCliente(), mapper, token);
    }

    private RestTemplate crearCliente() {
        var factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(3000);
        factory.setReadTimeout(5000);
        return new RestTemplate(factory);
    }
}
