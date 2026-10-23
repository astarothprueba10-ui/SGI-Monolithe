package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.client.SupabaseStorageClient;
import monolithe.core_service.repository.TrabajadorProcedureRepository;
import monolithe.core_service.repository.TrabajadorProcedureRepository.ResultadoProcedimiento;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;

import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EvidenciaCorreccionService {

    static final String BUCKET = "core-identidad-evidencias";
    static final long TAMANO_MAXIMO = 5L * 1024 * 1024;
    static final int URL_EXPIRY_SECONDS = 300;

    private static final Set<String> MIMES_PERMITIDOS = Set.of(
            "image/jpeg", "image/png", "image/webp");

    private final TrabajadorProcedureRepository repository;
    private final SupabaseStorageClient storageClient;

    public JsonNode adjuntarEvidencia(
            Long idActor,
            Long idSolicitud,
            MultipartFile archivo) {

        String storagePath = subirConValidacion(idSolicitud, archivo);

        try {
            return asociarEnBaseDeDatos(idActor, idSolicitud, storagePath,
                    archivo.getOriginalFilename(), archivo.getContentType());
        } catch (RuntimeException ex) {
            storageClient.eliminarArchivo(BUCKET, storagePath);
            throw ex;
        }
    }

    public String generarUrlFirmada(Long idActor, Long idSolicitud) {

        if (idActor == null || idActor <= 0
                || idSolicitud == null || idSolicitud <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Identificadores invalidos.");
        }

        // Verificar permisos mediante el procedimiento de Supabase.
        ResultadoProcedimiento autorizacion = repository.obtenerDetalleCorreccion(idActor, idSolicitud);

        if (autorizacion == null) {
            throw new IllegalStateException(
                    "No se pudo verificar la autorizacion.");
        }

        if (!"OK".equals(autorizacion.estado())) {
            HttpStatus estado = switch (autorizacion.estado()) {
                case "DENEGADO" -> HttpStatus.FORBIDDEN;
                case "SOLICITUD_NO_DISPONIBLE",
                        "SOLICITUD_NO_ENCONTRADA" ->
                    HttpStatus.NOT_FOUND;
                case "DATOS_INVALIDOS" -> HttpStatus.BAD_REQUEST;
                default -> HttpStatus.CONFLICT;
            };

            throw new ResponseStatusException(
                    estado, "Solicitud no disponible para consulta.");
        }

        JsonNode detalle = autorizacion.resultado();

        if (detalle == null || !detalle.isObject()
                || !detalle.has("evidenciaDisponible")
                || !detalle.get("evidenciaDisponible").asBoolean()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "La solicitud no tiene evidencia disponible.");
        }

        // Consultar la ruta real, nunca una ruta enviada por el cliente.
        String ruta = repository.obtenerRutaEvidenciaCorreccion(
                idActor, idSolicitud);

        if (ruta == null || !ruta.startsWith(
                "solicitudes/" + idSolicitud + "/")) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "No se encontro la fotografia de la solicitud.");
        }

        return storageClient.generarUrlFirmada(
                BUCKET, ruta, URL_EXPIRY_SECONDS);
    }

    private String subirConValidacion(Long idSolicitud, MultipartFile archivo) {
        validarArchivo(archivo);
        String extension = resolverExtension(archivo);
        String nombre = UUID.randomUUID() + "." + extension;
        String path = "solicitudes/" + idSolicitud + "/" + nombre;
        storageClient.subirArchivo(BUCKET, path, archivo);
        return path;
    }

    private JsonNode asociarEnBaseDeDatos(
            Long idActor,
            Long idSolicitud,
            String storagePath,
            String nombreOriginal,
            String mimeType) {

        String nombreSeguro = nombreOriginal != null
                ? nombreOriginal.replaceAll("[^a-zA-Z0-9._-]", "_")
                : "evidencia";

        ResultadoProcedimiento respuesta = repository.adjuntarEvidenciaCorreccion(
                idActor, idSolicitud, storagePath, nombreSeguro, mimeType);

        mapearEstadoEvidencia(respuesta);

        JsonNode resultado = respuesta.resultado();
        if (resultado == null || !resultado.isObject()) {
            throw new IllegalStateException(
                    "El procedimiento no confirmo la asociacion de la evidencia.");
        }
        return resultado;
    }

    private void validarArchivo(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Debe adjuntar una imagen de evidencia.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La imagen supera el tamano maximo de 5 MB.");
        }
        String mime = archivo.getContentType();
        if (mime == null || !MIMES_PERMITIDOS.contains(mime.toLowerCase())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Solo se aceptan imagenes JPG, PNG o WebP.");
        }
        validarFirmaReal(archivo, mime);
    }

    private void validarFirmaReal(MultipartFile archivo, String mime) {
        try {
            byte[] cabecera = archivo.getBytes();
            if (!firmaValida(cabecera, mime)) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El contenido del archivo no corresponde al tipo declarado.");
            }
        } catch (java.io.IOException ex) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "No se pudo leer el archivo.");
        }
    }

    private boolean firmaValida(byte[] bytes, String mime) {
        if (bytes.length < 4)
            return false;
        return switch (mime.toLowerCase()) {
            case "image/jpeg" -> bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8;
            case "image/png" ->
                bytes[0] == (byte) 0x89 && bytes[1] == 0x50
                        && bytes[2] == 0x4E && bytes[3] == 0x47;
            case "image/webp" ->
                bytes.length >= 12
                        && bytes[0] == 0x52 && bytes[1] == 0x49
                        && bytes[2] == 0x46 && bytes[3] == 0x46;
            default -> false;
        };
    }

    private String resolverExtension(MultipartFile archivo) {
        String mime = archivo.getContentType() != null
                ? archivo.getContentType().toLowerCase()
                : "";
        return switch (mime) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Tipo de imagen no soportado.");
        };
    }

    private void mapearEstadoEvidencia(ResultadoProcedimiento respuesta) {
        if (respuesta == null) {
            throw new IllegalStateException("El procedimiento no devolvio respuesta.");
        }
        String estado = respuesta.estado();
        if ("OK".equals(estado))
            return;

        String mensaje = respuesta.mensaje() != null
                ? respuesta.mensaje()
                : "No se pudo asociar la evidencia.";

        switch (estado) {
            case "DENEGADO" -> throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensaje);
            case "SOLICITUD_NO_ENCONTRADA" -> throw new ResponseStatusException(HttpStatus.NOT_FOUND, mensaje);
            case "ESTADO_INVALIDO",
                    "EVIDENCIA_EXISTENTE" ->
                throw new ResponseStatusException(HttpStatus.CONFLICT, mensaje);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
        }
    }
}
