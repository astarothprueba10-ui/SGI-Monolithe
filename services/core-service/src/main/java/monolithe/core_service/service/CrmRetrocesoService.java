package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.client.SupabaseStorageClient;
import monolithe.core_service.dto.ResolverRetrocesoCrmRequest;
import monolithe.core_service.dto.SolicitarRetrocesoCrmRequest;
import monolithe.core_service.repository.CrmRetrocesoRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

@Service
@RequiredArgsConstructor
public class CrmRetrocesoService {

    static final String BUCKET_EVIDENCIAS = "crm-retrocesos-evidencias";
    static final long TAMANO_MAXIMO = 5L * 1024 * 1024;
    static final int URL_EXPIRY_SECONDS = 300;

    private static final Set<String> MIMES_PERMITIDOS = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private final CrmRetrocesoRepository repository;
    private final SupabaseStorageClient storageClient;
    private final JsonMapper jsonMapper;

    @Transactional
    public JsonNode solicitarRetroceso(Long actor, Long prospecto, SolicitarRetrocesoCrmRequest req) {
        validarIdentidad(actor, prospecto);
        if (req == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe enviar los datos de la solicitud.");
        }
        String estadoDestino = req.resolverEstadoDestino();
        String motivoCodigoOriginal = req.motivoCodigo();
        String motivoCodigo = motivoCodigoOriginal == null ? "" : motivoCodigoOriginal.trim();
        String motivoDetalle = req.resolverMotivoDetallado();
        if (blanco(estadoDestino) || blanco(motivoCodigo) || blanco(motivoDetalle)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Etapa destino, codigo de motivo y explicacion son obligatorios.");
        }
        return ejecutar(() -> repository.solicitarRetroceso(actor, prospecto,
                estadoDestino.toUpperCase(Locale.ROOT), motivoCodigo.toUpperCase(Locale.ROOT), motivoDetalle), false);
    }

    @Transactional
    public JsonNode resolverRetroceso(Long actor, Long solicitud, ResolverRetrocesoCrmRequest req) {
        validarActorYSolicitud(actor, solicitud);
        if (req == null || !req.tieneDecision()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Debe indicar si aprueba o rechaza el retroceso.");
        }
        String observacion = req.observacion() != null && !req.observacion().isBlank()
                ? req.observacion().trim()
                : null;
        return ejecutar(() -> repository.resolverRetroceso(actor, solicitud,
                req.resolverAprobacion(), observacion), false);
    }

    @Transactional(readOnly = true)
    public JsonNode listarSolicitudes(Long actor, OffsetDateTime desde, OffsetDateTime hasta,
            String estado, String busqueda, Integer pagina, Integer tamano, Long asesor) {
        validarActorYRango(actor, desde, hasta);
        int pag = pagina != null && pagina >= 1 ? pagina : 1;
        int tam = tamano != null && tamano >= 1 && tamano <= 100 ? tamano : 15;
        String est = estado != null && !estado.isBlank() ? estado.trim().toUpperCase(Locale.ROOT) : null;
        String busq = busqueda != null && !busqueda.isBlank() ? busqueda.trim() : null;
        Long idAsesor = asesor != null && asesor > 0 ? asesor : null;
        return ejecutar(() -> repository.listarSolicitudes(actor, desde, hasta, est, busq, pag, tam, idAsesor), true);
    }

    @Transactional(readOnly = true)
    public JsonNode listarSolicitudes(Long actor, OffsetDateTime desde, OffsetDateTime hasta,
            String estado, String busqueda, Integer pagina, Integer tamano) {
        return listarSolicitudes(actor, desde, hasta, estado, busqueda, pagina, tamano, null);
    }

    @Transactional(readOnly = true)
    public JsonNode obtenerIndicadores(Long actor, OffsetDateTime desde, OffsetDateTime hasta, Long asesor) {
        validarActorYRango(actor, desde, hasta);
        Long idAsesor = asesor != null && asesor > 0 ? asesor : null;
        return ejecutar(() -> repository.obtenerIndicadores(actor, desde, hasta, idAsesor), false);
    }

    @Transactional(readOnly = true)
    public JsonNode obtenerIndicadores(Long actor, OffsetDateTime desde, OffsetDateTime hasta) {
        return obtenerIndicadores(actor, desde, hasta, null);
    }

    @Transactional(readOnly = true)
    public JsonNode catalogoMotivos(Long actor) {
        validarActor(actor);
        return ejecutar(() -> repository.catalogoMotivos(actor), true);
    }

    @Transactional
    public JsonNode adjuntarEvidencia(Long actor, Long solicitud, MultipartFile archivo) {
        validarActorYSolicitud(actor, solicitud);
        validarArchivo(archivo);
        String extension = resolverExtension(archivo);
        String path = "solicitudes/" + solicitud + "/" + UUID.randomUUID() + "." + extension;

        storageClient.subirArchivo(BUCKET_EVIDENCIAS, path, archivo);

        try {
            String nombreOriginal = resolverNombreOriginal(archivo, extension);
            String mime = archivo.getContentType();
            return ejecutar(() -> repository.adjuntarEvidencia(actor, solicitud, path, nombreOriginal, mime), false);
        } catch (RuntimeException ex) {
            storageClient.eliminarArchivo(BUCKET_EVIDENCIAS, path);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public JsonNode generarUrlFirmada(Long actor, Long solicitud) {
        validarActorYSolicitud(actor, solicitud);
        String ruta;
        try {
            ruta = repository.obtenerRutaEvidencia(actor, solicitud);
        } catch (DataAccessException ex) {
            throw mapearError(ex);
        }
        String rutaLimpia = limpiarRuta(ruta, solicitud);
        String urlFirmada = storageClient.generarUrlFirmada(BUCKET_EVIDENCIAS, rutaLimpia, URL_EXPIRY_SECONDS);
        return jsonMapper.createObjectNode()
                .put("url", urlFirmada)
                .put("segundos", URL_EXPIRY_SECONDS);
    }

    @Transactional(readOnly = true)
    public JsonNode miRetrocesoPendiente(Long actor, Long prospecto) {
        validarIdentidad(actor, prospecto);
        String json;
        try {
            json = repository.miRetrocesoPendiente(actor, prospecto);
        } catch (DataAccessException ex) {
            throw mapearError(ex);
        }
        if (json == null || json.isBlank() || "null".equalsIgnoreCase(json.trim())) {
            return jsonMapper.createObjectNode().putNull("pendiente");
        }
        try {
            return jsonMapper.readTree(json);
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta JSON invalida.", ex);
        }
    }

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debe adjuntar una imagen de evidencia.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La imagen supera el tamano maximo de 5 MB.");
        }
        String mime = archivo.getContentType();
        if (mime == null || !MIMES_PERMITIDOS.contains(mime.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Solo se aceptan imagenes JPG, PNG o WebP.");
        }
        validarFirmaReal(archivo, mime);
    }

    private void validarFirmaReal(MultipartFile archivo, String mime) {
        try {
            byte[] bytes = archivo.getBytes();
            if (!firmaValida(bytes, mime)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "El contenido del archivo no corresponde al formato declarado.");
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No se pudo leer la imagen de evidencia.");
        }
    }

    private boolean firmaValida(byte[] b, String mime) {
        if (b == null || b.length < 4) return false;
        return switch (mime.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> b[0] == (byte) 0xFF && b[1] == (byte) 0xD8;
            case "image/png" -> b[0] == (byte) 0x89 && b[1] == (byte) 0x50 && b[2] == (byte) 0x4E && b[3] == (byte) 0x47;
            case "image/webp" -> b.length >= 12 && b[0] == 0x52 && b[1] == 0x49 && b[2] == 0x46 && b[3] == 0x46;
            default -> false;
        };
    }

    private String resolverExtension(MultipartFile archivo) {
        String mime = archivo.getContentType() != null ? archivo.getContentType().toLowerCase(Locale.ROOT) : "";
        return switch (mime) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de imagen no soportado.");
        };
    }

    private String resolverNombreOriginal(MultipartFile archivo, String extension) {
        String orig = archivo.getOriginalFilename();
        if (orig == null || orig.isBlank()) {
            return "evidencia." + extension;
        }
        return orig.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String limpiarRuta(String ruta, Long solicitud) {
        if (ruta == null || ruta.isBlank() || "null".equalsIgnoreCase(ruta.trim())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La solicitud no tiene evidencia registrada.");
        }
        String limpia = ruta.trim();
        if (limpia.startsWith("\"") && limpia.endsWith("\"")) {
            limpia = limpia.substring(1, limpia.length() - 1);
        }
        if (!limpia.startsWith("solicitudes/" + solicitud + "/")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ruta de evidencia no valida.");
        }
        return limpia;
    }

    private void validarIdentidad(Long actor, Long prospecto) {
        validarActor(actor);
        if (prospecto == null || prospecto <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de prospecto invalido.");
        }
    }

    private void validarActor(Long actor) {
        if (actor == null || actor <= 0) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesion no valida.");
        }
    }

    private void validarActorYSolicitud(Long actor, Long solicitud) {
        validarActor(actor);
        if (solicitud == null || solicitud <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificador de solicitud invalido.");
        }
    }

    private void validarActorYRango(Long actor, OffsetDateTime desde, OffsetDateTime hasta) {
        validarActor(actor);
        if (desde == null || hasta == null || !hasta.isAfter(desde)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rango de fechas invalido.");
        }
    }

    private JsonNode ejecutar(Supplier<String> operacion, boolean permiteArray) {
        String json;
        try {
            json = operacion.get();
        } catch (DataAccessException ex) {
            throw mapearError(ex);
        }
        if (json == null)
            throw new IllegalStateException("Respuesta de retroceso vacia.");
        try {
            JsonNode res = jsonMapper.readTree(json);
            if (res == null)
                throw new IllegalStateException("Respuesta JSON nula.");
            return res;
        } catch (JacksonException ex) {
            throw new IllegalStateException("Respuesta JSON invalida.", ex);
        }
    }

    private ResponseStatusException mapearError(DataAccessException ex) {
        String raw = extraerMensajeError(ex);
        String detalle = extraerDetalle(raw);
        if (raw.contains("DENEGADO|")) {
            return new ResponseStatusException(HttpStatus.FORBIDDEN, detalle, ex);
        }
        if (raw.contains("EVIDENCIA_REQUERIDA|") || raw.contains("EVIDENCIA_REQUERIDA")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    detalle.isBlank() ? "Se requiere evidencia fotografica para aprobar la solicitud." : detalle, ex);
        }
        if (raw.contains("NO_EXISTE|") || raw.contains("NOT_FOUND")) {
            return new ResponseStatusException(HttpStatus.NOT_FOUND, detalle, ex);
        }
        if (raw.contains("CONFLICT|") || raw.contains("YA_RESUELTA|") || raw.contains("SOLICITUD_PENDIENTE|")
                || raw.contains("EVIDENCIA_EXISTENTE|") || raw.contains("YA_TIENE_EVIDENCIA|")) {
            return new ResponseStatusException(HttpStatus.CONFLICT, detalle, ex);
        }
        if (raw.contains("DATOS_INVALIDOS|") || raw.contains("MOTIVO_INVALIDO|") || raw.contains("ETAPA_INVALIDA|")) {
            return new ResponseStatusException(HttpStatus.BAD_REQUEST, detalle, ex);
        }
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, detalle, ex);
    }

    private String extraerMensajeError(DataAccessException ex) {
        StringBuilder sb = new StringBuilder();
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null)
                sb.append(t.getMessage()).append(' ');
        }
        return sb.toString();
    }

    private String extraerDetalle(String raw) {
        if (raw == null || raw.isBlank())
            return "Error en operacion de retroceso.";
        int pipe = raw.indexOf('|');
        if (pipe >= 0 && pipe < raw.length() - 1) {
            String sub = raw.substring(pipe + 1);
            int nl = sub.indexOf('\n');
            if (nl > 0)
                sub = sub.substring(0, nl);
            return sub.trim();
        }
        return raw.trim();
    }

    private static boolean blanco(String texto) {
        return texto == null || texto.isBlank();
    }
}
