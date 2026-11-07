package monolithe.core_service.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.net.URI;

@Component
public class HttpSupabaseStorageClient implements SupabaseStorageClient {
    private final RestTemplate restTemplate;
    private final JsonMapper jsonMapper;
    private final String storageBaseUrl;
    private final String serviceKey;

    public HttpSupabaseStorageClient(
            RestTemplate restTemplate,
            JsonMapper jsonMapper,
            @Value("${supabase.storage.url}") String url,
            @Value("${supabase.storage.service-role-key}") String clave) {
        this.restTemplate = restTemplate;
        this.jsonMapper = jsonMapper;
        this.storageBaseUrl = url == null ? "" : url.trim().replaceAll("/+$", "");
        this.serviceKey = clave == null ? "" : clave.trim();
    }

    @Override
    public JsonNode subirArchivo(String bucket, String path, MultipartFile archivo) {
        String url = validarBaseStorage() + "/object/" + bucket + "/" + path;
        HttpHeaders headers = buildAuthHeaders();
        String ct = archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream";
        headers.setContentType(MediaType.valueOf(ct));

        try {
            HttpEntity<byte[]> entity = new HttpEntity<>(archivo.getBytes(), headers);
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            return jsonMapper.readTree(res.getBody());
        } catch (RestClientException | JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Error al subir la evidencia al almacenamiento privado.", ex);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo leer el archivo de evidencia.", ex);
        }
    }

    @Override
    public void eliminarArchivo(String bucket, String path) {
        String url = validarBaseStorage() + "/object/" + bucket + "/" + path;
        HttpEntity<Void> entity = new HttpEntity<>(buildAuthHeaders());
        try {
            restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
        } catch (HttpClientErrorException ex) {
            // El objeto puede haber sido retirado durante la compensacion.
        }
    }

    @Override
    public String generarUrlFirmada(String bucket, String path, int segundosExpiry) {
        String url = validarBaseStorage() + "/object/sign/" + bucket + "/" + path;
        HttpHeaders headers = buildAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ObjectNode body = jsonMapper.createObjectNode();
        body.put("expiresIn", segundosExpiry);
        HttpEntity<String> entity = new HttpEntity<>(body.toString(), headers);

        try {
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            JsonNode nodo = jsonMapper.readTree(res.getBody());
            JsonNode signedUrl = nodo != null ? nodo.get("signedURL") : null;
            if (signedUrl == null || !signedUrl.isString()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "La URL firmada no fue generada.");
            }
            String rutaFirmada = signedUrl.asString();
            if (!rutaFirmada.startsWith("/object/sign/")) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "Formato de URL firmada inesperado.");
            }
            return validarBaseStorage() + rutaFirmada;
        } catch (RestClientException | JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo generar el acceso temporal.", ex);
        }
    }

    /**
     * Las claves sb_secret_ son API keys opacas, no JWT.
     * Solo los antiguos tokens service_role JWT usan Authorization Bearer.
     */
    private HttpHeaders buildAuthHeaders() {
        validarBaseStorage();
        HttpHeaders headers = new HttpHeaders();
        headers.set("apikey", serviceKey);
        if (!serviceKey.startsWith("sb_secret_")) {
            headers.setBearerAuth(serviceKey);
        }
        return headers;
    }

    private String validarBaseStorage() {
        if (storageBaseUrl.isBlank() || serviceKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Supabase Storage no esta configurado para evidencias.");
        }
        try {
            URI uri = URI.create(storageBaseUrl);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || !uri.getHost().endsWith(".supabase.co")
                    || "placeholder.supabase.co".equals(uri.getHost())
                    || !"/storage/v1".equals(uri.getRawPath())
                    || uri.getPort() != -1
                    || uri.getUserInfo() != null
                    || uri.getRawQuery() != null
                    || uri.getRawFragment() != null) {
                throw new IllegalArgumentException("URL de Storage no autorizada");
            }
            return storageBaseUrl;
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "URL de Supabase Storage invalida.", ex);
        }
    }
}
