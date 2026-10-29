
package monolithe.core_service.service;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class CrmContratoStorageService {

        private static final String BUCKET = "contratos-firmados-private";

        private final CrmVentaService ventaService;
        private final RestClient restClient;
        private final JsonMapper jsonMapper;
        private final String supabaseUrl;
        private final String secretKey;

        public CrmContratoStorageService(
                        CrmVentaService ventaService,
                        JsonMapper jsonMapper,
                        @Value("${SUPABASE_URL:}") String supabaseUrl,
                        @Value("${SUPABASE_SECRET_KEY:}") String secretKey) {

                this.ventaService = ventaService;
                this.restClient = RestClient.create();
                this.jsonMapper = jsonMapper;
                this.supabaseUrl = supabaseUrl;
                this.secretKey = secretKey;
        }

        public EnlaceCargaPdf prepararCarga(
                        Long actor,
                        Long idContrato) {

                JsonNode autorizacion = ventaService.autorizarCargaContrato(
                                actor, idContrato);

                if (!autorizacion.path("autorizado").asBoolean(false)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "Carga documental no autorizada.");
                }

                if (supabaseUrl == null || supabaseUrl.isBlank()
                                || secretKey == null || secretKey.isBlank()) {

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Storage no está configurado en el servidor.");
                }

                String base = supabaseUrl.trim()
                                .replaceAll("/+$", "");

                URI servidor = URI.create(base);

                if (!"https".equalsIgnoreCase(servidor.getScheme())
                                || servidor.getHost() == null
                                || !servidor.getHost().endsWith(".supabase.co")
                                || servidor.getUserInfo() != null
                                || servidor.getRawQuery() != null
                                || servidor.getRawFragment() != null) {

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "La URL de Supabase no es válida.");
                }

                String claveArchivo = "contratos/"
                                + idContrato
                                + "/"
                                + UUID.randomUUID()
                                + ".pdf";

                String ruta = "/object/upload/sign/"
                                + BUCKET + "/" + claveArchivo;

                String storageBase = base + "/storage/v1";

                final String respuesta;

                try {
                        respuesta = restClient.post()
                                        .uri(storageBase + ruta)
                                        .header("apikey", secretKey)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(Map.of())
                                        .retrieve()
                                        .body(String.class);

                } catch (RestClientException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "No fue posible generar el enlace de carga.",
                                        ex);
                }

                try {
                        if (respuesta == null || respuesta.isBlank()) {
                                throw new IllegalStateException(
                                                "Respuesta vacía de Storage.");
                        }

                        JsonNode json = jsonMapper.readTree(respuesta);

                        String rutaFirmada = json.path("url").asString("");
                        URI enlace = URI.create(rutaFirmada);

                        if (enlace.isAbsolute()
                                        || !ruta.equals(enlace.getRawPath())
                                        || enlace.getRawQuery() == null
                                        || !enlace.getRawQuery().startsWith("token=")) {

                                throw new IllegalStateException(
                                                "Enlace firmado no valido.");
                        }

                        return new EnlaceCargaPdf(
                                        BUCKET,
                                        claveArchivo,
                                        storageBase + rutaFirmada,
                                        "application/pdf",
                                        10485760L,
                                        7200);

                } catch (JacksonException | IllegalArgumentException
                                | IllegalStateException ex) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "Storage devolvió una respuesta no válida.",
                                        ex);
                }
        }

        public record EnlaceCargaPdf(
                        String bucket,
                        String claveArchivo,
                        String urlCarga,
                        String tipoMime,
                        long maxBytes,
                        int expiresInSeconds) {
        }

        public EnlaceLecturaPdf prepararLectura(
                        Long actor,
                        Long idContrato,
                        Long idContratoArchivo) {

                // 1. Autorizar la lectura desde Supabase.
                JsonNode autorizacion = ventaService.autorizarLecturaPdfContrato(
                                actor,
                                idContrato,
                                idContratoArchivo);

                if (!autorizacion.path("autorizado").asBoolean(false)) {
                        throw new ResponseStatusException(
                                        HttpStatus.FORBIDDEN,
                                        "No tienes autorización para revisar este contrato.");
                }

                // 2. Obtener la clave validada por el procedimiento.
                String claveArchivo = autorizacion.path("claveArchivo").asString("");

                String bucket = autorizacion.path("bucket").asString("");

                String nombreOriginal = autorizacion.path("nombreOriginal").asString("");

                String patron = "^contratos/" + idContrato
                                + "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
                                + "[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$";

                if (!BUCKET.equals(bucket)
                                || !claveArchivo.matches(patron)) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "La referencia documental no es válida.");
                }

                // 3. Comprobar la configuración del servidor.
                if (supabaseUrl == null || supabaseUrl.isBlank()
                                || secretKey == null || secretKey.isBlank()) {

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Supabase Storage no está configurado.");
                }

                String base = supabaseUrl.trim()
                                .replaceAll("/+$", "");

                URI servidor;

                try {
                        servidor = URI.create(base);
                } catch (IllegalArgumentException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "La URL de Storage no es válida.",
                                        ex);
                }

                if (!"https".equalsIgnoreCase(servidor.getScheme())
                                || servidor.getHost() == null
                                || !servidor.getHost().endsWith(".supabase.co")
                                || servidor.getUserInfo() != null
                                || servidor.getPort() != -1
                                || servidor.getRawQuery() != null
                                || servidor.getRawFragment() != null
                                || !(servidor.getRawPath() == null
                                                || servidor.getRawPath().isEmpty())) {

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "La URL de Storage no es válida.");
                }

                // 4. Solicitar a Supabase una URL de 120 segundos.
                String storageBase = base + "/storage/v1";

                String ruta = "/object/sign/"
                                + BUCKET + "/" + claveArchivo;

                final String respuesta;

                try {
                        respuesta = restClient.post()
                                        .uri(storageBase + ruta)
                                        .header("apikey", secretKey)
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .body(Map.of("expiresIn", 120))
                                        .retrieve()
                                        .body(String.class);

                } catch (RestClientException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "No se pudo generar el enlace privado.",
                                        ex);
                }

                // 5. Validar que la URL devuelta corresponda
                // exactamente al archivo autorizado.
                try {
                        if (respuesta == null || respuesta.isBlank()) {
                                throw new IllegalStateException(
                                                "Respuesta vacía de Storage.");
                        }

                        JsonNode json = jsonMapper.readTree(respuesta);

                        String rutaFirmada = json.path("signedURL").asString("");
                        URI enlace = URI.create(rutaFirmada);

                        String consulta = enlace.getRawQuery();

                        if (enlace.isAbsolute()
                                        || !ruta.equals(enlace.getRawPath())
                                        || consulta == null
                                        || !consulta.matches(
                                                        "token=[A-Za-z0-9._~%+-]+")) {

                                throw new IllegalStateException(
                                                "La URL firmada no es válida.");
                        }

                        return new EnlaceLecturaPdf(
                                        idContrato,
                                        idContratoArchivo,
                                        nombreOriginal,
                                        storageBase + rutaFirmada,
                                        120);

                } catch (JacksonException
                                | IllegalArgumentException
                                | IllegalStateException ex) {

                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "Storage devolvió un enlace no válido.",
                                        ex);
                }
        }

        public record EnlaceLecturaPdf(
                        Long idContrato,
                        Long idContratoArchivo,
                        String nombreOriginal,
                        String urlLectura,
                        int expiresInSeconds) {
        }

        public void eliminarPdfAnterior(
                        Long idContrato,
                        String claveAnterior) {

                if (idContrato == null || idContrato <= 0
                                || claveAnterior == null) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Referencia documental invalida.");
                }

                String patron = "^contratos/" + idContrato
                                + "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
                                + "[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$";

                if (!claveAnterior.matches(patron)) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST,
                                        "Ruta de PDF no autorizada.");
                }

                if (supabaseUrl == null || supabaseUrl.isBlank()
                                || secretKey == null || secretKey.isBlank()) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Storage no esta configurado.");
                }

                String base = supabaseUrl.trim().replaceAll("/+$", "");
                URI servidor;

                try {
                        servidor = URI.create(base);
                } catch (IllegalArgumentException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Configuracion de Storage invalida.");
                }

                if (!"https".equalsIgnoreCase(servidor.getScheme())
                                || servidor.getHost() == null
                                || !servidor.getHost().endsWith(".supabase.co")
                                || servidor.getUserInfo() != null
                                || servidor.getPort() != -1
                                || servidor.getRawQuery() != null
                                || servidor.getRawFragment() != null
                                || !(servidor.getRawPath() == null
                                                || servidor.getRawPath().isEmpty())) {

                        throw new ResponseStatusException(
                                        HttpStatus.SERVICE_UNAVAILABLE,
                                        "Servidor de Storage no autorizado.");
                }

                String destino = base + "/storage/v1/object/"
                                + BUCKET + "/" + claveAnterior;

                try {
                        restClient.delete()
                                        .uri(destino)
                                        .header("apikey", secretKey)
                                        .retrieve()
                                        .toBodilessEntity();

                } catch (org.springframework.web.client.HttpClientErrorException.NotFound ex) {
                        // El archivo ya no existe. La base de datos
                        // comprobara su ausencia antes de cerrar la tarea.

                } catch (RestClientException ex) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_GATEWAY,
                                        "No se pudo eliminar el PDF anterior.",
                                        ex);
                }
        }

}
