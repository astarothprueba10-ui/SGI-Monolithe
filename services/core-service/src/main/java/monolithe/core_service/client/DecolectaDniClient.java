package monolithe.core_service.client;

import monolithe.core_service.dto.DatosPersonaCrm;
import monolithe.core_service.exception.ConsultaIdentidadNoDisponibleException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.util.Optional;

/** Integración de DNI de Decolecta con credenciales exclusivas del servidor. */
public class DecolectaDniClient implements ConsultaDniClient {
    private static final String URL = "https://api.decolecta.com/v1/reniec/dni?numero=";
    private final RestTemplate rest;
    private final JsonMapper mapper;
    private final String token;

    /** Recibe un cliente con tiempo máximo y la clave privada configurada en el entorno. */
    public DecolectaDniClient(RestTemplate rest, JsonMapper mapper,
                             String token) {
        this.rest = rest;
        this.mapper = mapper;
        this.token = token == null ? "" : token.trim();
    }

    /** Consulta un DNI completo y transforma las fallas en un resultado recuperable para el CRM. */
    @Override
    public Optional<DatosPersonaCrm> consultar(String numero) {
        if (token.isBlank() || numero == null || !numero.matches("[0-9]{8}"))
            throw new ConsultaIdentidadNoDisponibleException();
        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        try {
            var response = rest.exchange(URL + numero, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank())
                throw new ConsultaIdentidadNoDisponibleException();
            return Optional.of(leerPersona(mapper.readTree(response.getBody()), numero));
        } catch (HttpClientErrorException.NotFound ex) {
            return Optional.empty();
        } catch (RestClientException | JacksonException ex) {
            throw new ConsultaIdentidadNoDisponibleException();
        }
    }

    private DatosPersonaCrm leerPersona(JsonNode data, String numero) {
        String nombres = data.path("first_name").asString("").trim();
        String paterno = data.path("first_last_name").asString("").trim();
        String materno = data.path("second_last_name").asString("").trim();
        if (!numero.equals(data.path("document_number").asString("")) || nombres.isBlank() || paterno.isBlank()
                || nombres.length() > 120 || paterno.length() > 80 || materno.length() > 80)
            throw new ConsultaIdentidadNoDisponibleException();
        return new DatosPersonaCrm(nombres, paterno, materno);
    }
}
