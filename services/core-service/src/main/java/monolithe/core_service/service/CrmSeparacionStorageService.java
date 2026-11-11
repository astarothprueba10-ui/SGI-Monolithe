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
import monolithe.core_service.dto.PrepararCargaVoucherVentaRequest;
import monolithe.core_service.dto.FormalizarVentaCrmRequest;

@Service
public class CrmSeparacionStorageService {

    private static final String BUCKET = "vouchers-separacion-private";
    private static final String BUCKET_VENTAS = "vouchers-ventas-private";
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

    /** Ventas: genera URL de carga privada después de verificar lote, precio y cartera. */
    public EnlaceCargaVoucherResponse prepararCargaVenta(
            Long actor, PrepararCargaVoucherVentaRequest req) {
        if (actor == null || actor <= 0 || req == null || req.idProspecto() == null
                || req.idLote() == null || req.tipoMime() == null
                || !MIMES_PERMITIDOS.contains(req.tipoMime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Solicitud de comprobante de venta invalida.");
        }
        JsonNode validacion = ventaService.validar(actor, new FormalizarVentaCrmRequest(
                req.idProspecto(), req.idLote(), req.modalidad(), req.montoTotal(),
                req.montoInicial(), req.numeroCuotas(), null, null, null, null));
        if (!validacion.path("elegible").asBoolean(false)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El prospecto o lote no es elegible para la venta.");
        }
        String extension = resolverExtension(req.tipoMime());
        String clave = "ventas/p-" + req.idProspecto() + "/l-" + req.idLote()
                + "/" + UUID.randomUUID() + "." + extension;
        String base = validarYResolverBase();
        String ruta = "/object/upload/sign/" + BUCKET_VENTAS + "/" + clave;
        String respuesta = solicitarUrlCargaStorage(base + ruta);
        try {
            JsonNode json = jsonMapper.readTree(respuesta);
            String rutaFirmada = json.path("url").asString("");
            URI enlace = URI.create(rutaFirmada);
            if (enlace.isAbsolute() || !ruta.equals(enlace.getRawPath())
                    || enlace.getRawQuery() == null
                    || !enlace.getRawQuery().startsWith("token=")) {
                throw new IllegalStateException("Enlace de carga invalido.");
            }
            return new EnlaceCargaVoucherResponse(
                    BUCKET_VENTAS, clave, base + rutaFirmada,
                    req.tipoMime(), MAX_BYTES, EXPIRY_SECONDS);
        } catch (JacksonException | IllegalArgumentException | IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Storage devolvio un enlace de carga invalido.", ex);
        }
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
        return firmarReferencia(ventaService.obtenerRutaVoucher(actor, idVoucher));
    }

    /** Voucher de cuotas: valida en SQL permiso de Finanzas y existencia
     * física del archivo antes de emitir un enlace de lectura temporal. */
    public EnlaceLecturaVoucherResponse prepararLecturaVoucherCuota(
            Long actor, Long idVoucher) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión inválida.");
        }
        JsonNode info = ventaService.obtenerRutaVoucherCuota(actor,idVoucher);
        String bucket=info.path("bucket").asString("");
        String clave=info.path("clave_archivo").asString("");
        String nombre=info.path("nombre_archivo").asString("");
        String mime=info.path("tipo_mime").asString("");
        if (!BUCKET_VENTAS.equals(bucket) || !clave.matches(
                "^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\\.(pdf|jpg|png|webp)$")
                || (mime != null && !mime.isBlank() && !MIMES_PERMITIDOS.contains(mime))) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Referencia de comprobante de cuota inválida.");
        }
        String base=validarYResolverBase();
        String ruta="/object/sign/"+BUCKET_VENTAS+"/"+clave;
        String respuesta=solicitarUrlLecturaStorage(base+ruta);
        return extraerEnlaceLectura(respuesta,clave,base,nombre,mime,BUCKET_VENTAS);
    }

    /** Enlaces de lectura privados por venta y comprobante; alcance validado en PostgreSQL. */
    public EnlaceLecturaVoucherResponse prepararLecturaComprobanteVenta(
            Long actor, Long idVenta, Long idComprobante) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion invalida.");
        }
        JsonNode info = ventaService.rutaComprobanteVenta(actor, idVenta, idComprobante);
        String bucket = info.path("bucket").asString("");
        String clave = info.path("clave_archivo").asString("");
        String nombre = info.path("nombre_archivo").asString("");
        String mime = info.path("tipo_mime").asString("");
        if (!BUCKET_VENTAS.equals(bucket)
                || !clave.matches("^ventas/p-[0-9]+/l-[0-9]+/[0-9a-fA-F\\-]{36}\\.(pdf|jpg|png|webp)$")
                || !MIMES_PERMITIDOS.contains(mime)) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Referencia de comprobante de venta invalida.");
        }
        String base = validarYResolverBase();
        String ruta = "/object/sign/" + BUCKET_VENTAS + "/" + clave;
        String respuesta = solicitarUrlLecturaStorage(base + ruta);
        return extraerEnlaceLectura(respuesta, clave, base, nombre, mime, BUCKET_VENTAS);
    }

    /** Comprobante del detalle comercial; no requiere permisos de Finanzas. */
    public EnlaceLecturaVoucherResponse prepararLecturaPorReserva(Long actor, Long idReserva) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion invalida.");
        }
        return firmarReferencia(ventaService.obtenerRutaComprobanteSeparacion(actor, idReserva));
    }

    private EnlaceLecturaVoucherResponse firmarReferencia(JsonNode info) {
        String clave = info.path("clave_archivo").asString("");
        String bucket = info.path("bucket").asString("");
        String nombre = info.path("nombre_archivo").asString("");
        String mime = info.path("tipo_mime").asString("");
        validarReferenciaLectura(bucket, clave);
        String base = validarYResolverBase();
        String ruta = "/object/sign/" + BUCKET + "/" + clave;
        String respuesta = solicitarUrlLecturaStorage(base + ruta);
        return extraerEnlaceLectura(respuesta, clave, base, nombre, mime, BUCKET);
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
            String raw, String clave, String base, String nombre, String mime, String bucket) {
        try {
            JsonNode json = jsonMapper.readTree(raw);
            String signedUrl = json.path("signedURL").asString("");
            if (signedUrl.isBlank() || !signedUrl.startsWith("/object/sign/")) {
                throw new IllegalStateException("Formato inesperado de URL firmada.");
            }
            String urlCompleta = base + signedUrl;
            return new EnlaceLecturaVoucherResponse(
                    bucket, clave, urlCompleta, nombre, mime, EXPIRY_SECONDS);
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
