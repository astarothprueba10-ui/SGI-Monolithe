
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

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class CrmAnulacionStorageService {

    private static final String BUCKET = "anulaciones-legales-private";
    private static final long MAX_BYTES = 10485760L;

    private final CrmVentaService ventaService;
    private final RestClient restClient;
    private final JsonMapper jsonMapper;
    private final String supabaseUrl;
    private final String secretKey;

    public CrmAnulacionStorageService(
            CrmVentaService ventaService,
            JsonMapper jsonMapper,
            @Value("${SUPABASE_URL:}") String supabaseUrl,
            @Value("${SUPABASE_SECRET_KEY:}") String secretKey) {

        this.ventaService = ventaService;
        this.jsonMapper = jsonMapper;
        this.restClient = RestClient.create();
        this.supabaseUrl = supabaseUrl;
        this.secretKey = secretKey;
    }

    public CrmContratoStorageService.EnlaceCargaPdf prepararCarga(
            Long actor,
            Long idSolicitud) {

        if (idSolicitud == null || idSolicitud <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificador de solicitud inválido.");
        }

        JsonNode autorizacion = ventaService.autorizarCargaEvidenciaLegal(
                actor, idSolicitud);

        String prefijo = "expedientes/" + idSolicitud + "/";

        if (!autorizacion.path("autorizado").asBoolean(false)
                || autorizacion.path("idSolicitud").asLong(0L) != idSolicitud
                || !BUCKET.equals(
                        autorizacion.path("bucket").asString(""))
                || !prefijo.equals(
                        autorizacion.path("prefijo").asString(""))
                || !"application/pdf".equals(
                        autorizacion.path("tipoMime").asString(""))
                || autorizacion.path("maxBytes").asLong(0L) != MAX_BYTES) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Carga de evidencia legal no autorizada.");
        }

        if (supabaseUrl == null || supabaseUrl.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Storage no está configurado.");
        }

        String base = supabaseUrl.trim().replaceAll("/+$", "");

        URI servidor;

        try {
            servidor = URI.create(base);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "URL de Storage inválida.", ex);
        }

        if (!"https".equalsIgnoreCase(servidor.getScheme())
                || servidor.getHost() == null
                || !servidor.getHost().endsWith(".supabase.co")
                || servidor.getUserInfo() != null
                || servidor.getPort() != -1
                || servidor.getRawQuery() != null
                || servidor.getRawFragment() != null
                || (servidor.getRawPath() != null
                        && !servidor.getRawPath().isEmpty())) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Servidor de Storage no autorizado.");
        }

        String claveArchivo = prefijo + UUID.randomUUID() + ".pdf";

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
                    "No se pudo generar el enlace privado.",
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

            String consulta = enlace.getRawQuery();

            if (enlace.isAbsolute()
                    || !ruta.equals(enlace.getRawPath())
                    || consulta == null
                    || !consulta.matches(
                            "token=[A-Za-z0-9._~%+-]+")
                    || enlace.getRawFragment() != null) {

                throw new IllegalStateException(
                        "Enlace firmado inválido.");
            }

            return new CrmContratoStorageService.EnlaceCargaPdf(
                    BUCKET,
                    claveArchivo,
                    storageBase + rutaFirmada,
                    "application/pdf",
                    MAX_BYTES,
                    7200);

        } catch (JacksonException
                | IllegalArgumentException
                | IllegalStateException ex) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Storage devolvió una respuesta inválida.",
                    ex);
        }
    }

    public JsonNode registrarEvidenciaLegalVerificada(
            Long actor,
            Long idSolicitud,
            String tipoDocumento,
            String claveArchivo,
            String nombreOriginal) {

        JsonNode autorizacion = ventaService.autorizarCargaEvidenciaLegal(
                actor, idSolicitud);

        String prefijo = "expedientes/" + idSolicitud + "/";

        String patron = "^"
                + java.util.regex.Pattern.quote(prefijo)
                + "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
                + "[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$";

        if (!autorizacion.path("autorizado").asBoolean(false)
                || !BUCKET.equals(
                        autorizacion.path("bucket").asString(""))
                || claveArchivo == null
                || !claveArchivo.matches(patron)) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Evidencia legal no autorizada.");
        }

        if (supabaseUrl == null || supabaseUrl.isBlank()
                || secretKey == null || secretKey.isBlank()) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Storage no está configurado.");
        }

        String base = supabaseUrl.trim().replaceAll("/+$", "");

        URI servidor;

        try {
            servidor = URI.create(base);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "URL de Storage inválida.", ex);
        }

        if (!"https".equalsIgnoreCase(servidor.getScheme())
                || servidor.getHost() == null
                || !servidor.getHost().endsWith(".supabase.co")
                || servidor.getUserInfo() != null
                || servidor.getPort() != -1
                || servidor.getRawQuery() != null
                || servidor.getRawFragment() != null
                || (servidor.getRawPath() != null
                        && !servidor.getRawPath().isEmpty())) {

            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Servidor de Storage no autorizado.");
        }

        String storageBase = base + "/storage/v1";
        String ruta = "/object/sign/" + BUCKET + "/"
                + claveArchivo;

        byte[] documento;

        try {
            String respuesta = restClient.post()
                    .uri(storageBase + ruta)
                    .header("apikey", secretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", 120))
                    .retrieve()
                    .body(String.class);

            if (respuesta == null || respuesta.isBlank()) {
                throw new IllegalStateException(
                        "Respuesta vacía de Storage.");
            }

            JsonNode json = jsonMapper.readTree(respuesta);

            String rutaFirmada = json.path("signedURL").asString("");

            URI enlace = URI.create(rutaFirmada);

            if (enlace.isAbsolute()
                    || !ruta.equals(enlace.getRawPath())
                    || enlace.getRawQuery() == null
                    || !enlace.getRawQuery().matches(
                            "token=[A-Za-z0-9._~%+-]+")
                    || enlace.getRawFragment() != null) {

                throw new IllegalStateException(
                        "Enlace de lectura inválido.");
            }

            documento = restClient.get()
                    .uri(storageBase + rutaFirmada)
                    .retrieve()
                    .body(byte[].class);

        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "No se pudo descargar el PDF legal.", ex);

        } catch (JacksonException
                | IllegalArgumentException
                | IllegalStateException ex) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Storage devolvió una respuesta inválida.", ex);
        }

        if (documento == null
                || documento.length < 5
                || documento.length > MAX_BYTES
                || documento[0] != '%'
                || documento[1] != 'P'
                || documento[2] != 'D'
                || documento[3] != 'F'
                || documento[4] != '-') {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El archivo no tiene una cabecera PDF válida o supera 10 MB.");
        }

        String hashSha256;

        try {
            byte[] digest = MessageDigest
                    .getInstance("SHA-256")
                    .digest(documento);

            hashSha256 = HexFormat.of().formatHex(digest);

        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(
                    "SHA-256 no disponible.", ex);
        }

        return ventaService.registrarEvidenciaLegal(
                actor,
                idSolicitud,
                tipoDocumento,
                claveArchivo,
                nombreOriginal,
                hashSha256);
    }

    public EnlaceLecturaEvidenciaLegal prepararLectura(
            Long actor, Long idSolicitud, Long idEvidencia) {

        JsonNode permiso = ventaService.autorizarLecturaEvidenciaLegal(
                actor, idSolicitud, idEvidencia);

        String clave = permiso.path("claveArchivo").asString("");
        String hashEsperado = permiso.path("hashSha256").asString("");
        long tamanioEsperado = permiso.path("tamanoBytes").asLong(0L);

        String patron = "^expedientes/" + idSolicitud
                + "/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-"
                + "[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$";

        if (!permiso.path("autorizado").asBoolean(false)
                || permiso.path("idSolicitud").asLong(0L) != idSolicitud
                || permiso.path("idEvidencia").asLong(0L) != idEvidencia
                || !BUCKET.equals(permiso.path("bucket").asString(""))
                || !clave.matches(patron)
                || !hashEsperado.matches("[0-9a-f]{64}")
                || tamanioEsperado <= 0
                || tamanioEsperado > MAX_BYTES) {

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Lectura de evidencia legal no autorizada.");
        }

        if (supabaseUrl == null || supabaseUrl.isBlank()
                || secretKey == null || secretKey.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Storage no está configurado.");
        }

        String base = supabaseUrl.trim().replaceAll("/+$", "");
        URI servidor;

        try {
            servidor = URI.create(base);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "URL de Storage inválida.", ex);
        }

        if (!"https".equalsIgnoreCase(servidor.getScheme())
                || servidor.getHost() == null
                || !servidor.getHost().endsWith(".supabase.co")
                || servidor.getUserInfo() != null
                || servidor.getPort() != -1
                || servidor.getRawQuery() != null
                || servidor.getRawFragment() != null
                || (servidor.getRawPath() != null
                        && !servidor.getRawPath().isEmpty())) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Servidor de Storage no autorizado.");
        }

        String storageBase = base + "/storage/v1";
        String ruta = "/object/sign/" + BUCKET + "/" + clave;

        String rutaFirmada;
        byte[] documento;

        try {
            String respuesta = restClient.post()
                    .uri(storageBase + ruta)
                    .header("apikey", secretKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", 120))
                    .retrieve()
                    .body(String.class);

            if (respuesta == null || respuesta.isBlank()) {
                throw new IllegalStateException("Respuesta vacía.");
            }

            JsonNode json = jsonMapper.readTree(respuesta);
            rutaFirmada = json.path("signedURL").asString("");

            URI enlace = URI.create(rutaFirmada);

            if (enlace.isAbsolute()
                    || !ruta.equals(enlace.getRawPath())
                    || enlace.getRawFragment() != null
                    || enlace.getRawQuery() == null
                    || !enlace.getRawQuery().matches(
                            "token=[A-Za-z0-9._~%+-]+")) {
                throw new IllegalStateException(
                        "Enlace privado inválido.");
            }

            documento = restClient.get()
                    .uri(storageBase + rutaFirmada)
                    .retrieve()
                    .body(byte[].class);

        } catch (RestClientException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "No se pudo leer el PDF privado.", ex);

        } catch (JacksonException | IllegalArgumentException
                | IllegalStateException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Storage devolvió una respuesta inválida.", ex);
        }

        if (documento == null
                || documento.length != tamanioEsperado
                || documento.length < 5
                || documento[0] != '%'
                || documento[1] != 'P'
                || documento[2] != 'D'
                || documento[3] != 'F'
                || documento[4] != '-') {

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El PDF legal no coincide con el documento registrado.");
        }

        try {
            byte[] hashActual = MessageDigest
                    .getInstance("SHA-256")
                    .digest(documento);

            byte[] hashRegistrado = HexFormat.of()
                    .parseHex(hashEsperado);

            if (!MessageDigest.isEqual(hashActual, hashRegistrado)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "La integridad del PDF legal no coincide.");
            }

        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(
                    "SHA-256 no disponible.", ex);
        }

        return new EnlaceLecturaEvidenciaLegal(
                idSolicitud,
                idEvidencia,
                permiso.path("nombreOriginal").asString(""),
                storageBase + rutaFirmada,
                120);
    }

    public record EnlaceLecturaEvidenciaLegal(
            Long idSolicitud,
            Long idEvidencia,
            String nombreOriginal,
            String urlLectura,
            int expiresInSeconds) {
    }
}
