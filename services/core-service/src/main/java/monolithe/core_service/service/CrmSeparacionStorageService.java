package monolithe.core_service.service;

import java.net.URI;
import java.util.Map;
import java.util.Set;
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
import monolithe.core_service.dto.EnlaceCargaVoucherResponse;
import monolithe.core_service.dto.EnlaceLecturaVoucherResponse;
import monolithe.core_service.dto.PrepararCargaVoucherSeparacionRequest;

@Service
public class CrmSeparacionStorageService {

    private static final String BUCKET = "vouchers-separacion-private";
    private static final long MAX_BYTES = 5242880L;
    private static final int EXPIRY_SECONDS = 300;
    private static final Set<String> MIMES_PERMITIDOS = Set.of(
            "application/pdf", "image/jpeg", "image/png", "image/webp");

    private final CrmVentaService ventaService;
    private final RestClient restClient;
    private final JsonMapper jsonMapper;
    private final String storageBaseUrl;
    private final String serviceRoleKey;

    public CrmSeparacionStorageService(
            CrmVentaService ventaService,
            JsonMapper jsonMapper,
            @Value("${supabase.storage.url:${SUPABASE_URL:}}") String storageUrl,
            @Value("${supabase.storage.service-role-key:${SUPABASE_SECRET_KEY:}}") String key) {
        this.ventaService = ventaService;
        this.restClient = RestClient.create();
        this.jsonMapper = jsonMapper;
        this.storageBaseUrl = storageUrl != null ? storageUrl.trim().replaceAll("/+$", "") : "";
        this.serviceRoleKey = key != null ? key.trim() : "";
    }

    public EnlaceCargaVoucherResponse prepararCarga(
            Long actor, PrepararCargaVoucherSeparacionRequest req) {
        validarSolicitudCarga(actor, req);
        ventaService.validarSeparacionPreviaCarga(actor, req.idProspecto(), req.idLote());
        String ext = resolverExtension(req.tipoMime());
        String clave = "separaciones/p-" + req.idProspecto() + "/l-" + req.idLote()
                + "/" + UUID.randomUUID() + "." + ext;
        String base = validarYResolverBase();
        String ruta = "/object/upload/sign/" + BUCKET + "/" + clave;
        String respuesta = solicitarUrlCargaStorage(base + ruta);
        return extraerEnlaceCarga(respuesta, clave, base, ruta, req.tipoMime());
    }

    private void validarSolicitudCarga(Long actor, PrepararCargaVoucherSeparacionRequest req) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion invalida.");
        }
        if (req == null || req.tipoMime() == null || !MIMES_PERMITIDOS.contains(req.tipoMime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato de archivo no permitido.");
        }
    }

    private String solicitarUrlCargaStorage(String endpoint) {
        try {
            return restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of())
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No fue posible generar enlace de carga de voucher.", ex);
        }
    }

    private EnlaceCargaVoucherResponse extraerEnlaceCarga(
            String raw, String clave, String base, String ruta, String mime) {
        try {
            JsonNode json = jsonMapper.readTree(raw);
            String rutaFirmada = json.path("url").asString("");
            URI enlace = URI.create(rutaFirmada);
            if (enlace.isAbsolute() || !ruta.equals(enlace.getRawPath())
                    || enlace.getRawQuery() == null || !enlace.getRawQuery().startsWith("token=")) {
                throw new IllegalStateException("Enlace firmado invalido.");
            }
            return new EnlaceCargaVoucherResponse(
                    BUCKET, clave, base + rutaFirmada, mime, MAX_BYTES, EXPIRY_SECONDS);
        } catch (JacksonException | IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Storage devolvio una respuesta invalida.", ex);
        }
    }

    public EnlaceLecturaVoucherResponse prepararLectura(Long actor, Long idVoucher) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion invalida.");
        }
        JsonNode info = ventaService.obtenerRutaVoucher(actor, idVoucher);
        String clave = info.path("clave_archivo").asString("");
        String bucket = info.path("bucket").asString("");
        String nombre = info.path("nombre_archivo").asString("");
        String mime = info.path("tipo_mime").asString("");
        validarReferenciaLectura(bucket, clave);
        String base = validarYResolverBase();
        String ruta = "/object/sign/" + BUCKET + "/" + clave;
        String respuesta = solicitarUrlLecturaStorage(base + ruta);
        return extraerEnlaceLectura(respuesta, clave, base, nombre, mime);
    }

    private void validarReferenciaLectura(String bucket, String clave) {
        String patron = "^separaciones/p-[0-9]+/l-[0-9]+/[0-9a-fA-F\\-]+\\.(pdf|jpeg|jpg|png|webp)$";
        if (!BUCKET.equals(bucket) || clave == null || !clave.matches(patron)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Referencia de voucher no valida.");
        }
    }

    private String solicitarUrlLecturaStorage(String endpoint) {
        try {
            return restClient.post()
                    .uri(endpoint)
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", EXPIRY_SECONDS))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "No se pudo generar acceso temporal de lectura.", ex);
        }
    }

    private EnlaceLecturaVoucherResponse extraerEnlaceLectura(
            String raw, String clave, String base, String nombre, String mime) {
        try {
            JsonNode json = jsonMapper.readTree(raw);
            String signedUrl = json.path("signedURL").asString("");
            if (signedUrl.isBlank() || !signedUrl.startsWith("/object/sign/")) {
                throw new IllegalStateException("Formato inesperado de URL firmada.");
            }
            String urlCompleta = base.replace("/storage/v1", "") + signedUrl;
            return new EnlaceLecturaVoucherResponse(
                    BUCKET, clave, urlCompleta, nombre, mime, EXPIRY_SECONDS);
        } catch (JacksonException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Error al interpretar enlace firmado de lectura.", ex);
        }
    }

    private String resolverExtension(String mime) {
        return switch (mime) {
            case "application/pdf" -> "pdf";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }

    private String validarYResolverBase() {
        if (storageBaseUrl.isBlank() || serviceRoleKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Supabase Storage no esta configurado.");
        }
        return storageBaseUrl.endsWith("/storage/v1")
                ? storageBaseUrl
                : storageBaseUrl + "/storage/v1";
    }
}

