package monolithe.core_service.client;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class HttpSupabaseStorageClient implements SupabaseStorageClient {

    private final RestTemplate restTemplate;
    private final JsonMapper jsonMapper;

    @Value("${supabase.storage.url}")
    private String storageBaseUrl;

    @Value("${supabase.storage.service-role-key}")
    private String serviceRoleKey;

    @Override
    public JsonNode subirArchivo(String bucket, String path, MultipartFile archivo) {
        String url = storageBaseUrl + "/object/" + bucket + "/" + path;
        HttpHeaders headers = buildAuthHeaders();
        String ct = archivo.getContentType() != null ? archivo.getContentType() : "application/octet-stream";
        headers.setContentType(MediaType.valueOf(ct));

        try {
            HttpEntity<byte[]> entity = new HttpEntity<>(archivo.getBytes(), headers);
            ResponseEntity<String> res = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            return jsonMapper.readTree(res.getBody());
        } catch (HttpClientErrorException | JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Error al subir la evidencia al almacenamiento privado.");
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo leer el archivo de evidencia.");
        }
    }

    @Override
    public void eliminarArchivo(String bucket, String path) {
        String url = storageBaseUrl + "/object/" + bucket + "/" + path;
        HttpHeaders headers = buildAuthHeaders();
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            restTemplate.exchange(url, HttpMethod.DELETE, entity, String.class);
        } catch (HttpClientErrorException ex) {
            // Registro silencioso — el archivo puede ya no existir.
        }
    }

    @Override
    public String generarUrlFirmada(String bucket, String path, int segundosExpiry) {
        String url = storageBaseUrl + "/object/sign/" + bucket + "/" + path;
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
                throw new ResponseStatusException(
                        HttpStatus.BAD_GATEWAY,
                        "Formato de URL firmada inesperado.");
            }

            return storageBaseUrl.replaceAll("/+$", "") + rutaFirmada;
        } catch (HttpClientErrorException | JacksonException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo generar el acceso temporal.");
        }
    }

    private HttpHeaders buildAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        return headers;
    }
}
