package monolithe.cms_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    private static final long MAX_FILE_SIZE =
            50L * 1024L * 1024L;

    private final String supabaseUrl;
    private final String secretKey;
    private final String bucket;

    public SupabaseStorageService(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.secret-key:}") String secretKey,
            @Value("${cms.storage.bucket:cms-public}") String bucket) {

        this.supabaseUrl = supabaseUrl;
        this.secretKey = secretKey;
        this.bucket = bucket;
    }

    public String subirArchivo(
            MultipartFile archivo,
            String carpeta) {

        validarConfiguracion();
        validarArchivo(archivo);

        String nombreArchivo =
                generarNombreArchivo(
                        archivo.getOriginalFilename()
                );

        String carpetaNormalizada =
                normalizarCarpeta(carpeta);

        String claveArchivo =
                carpetaNormalizada.isBlank()
                        ? nombreArchivo
                        : carpetaNormalizada
                                + "/"
                                + nombreArchivo;

        try {

            RestClient.create(supabaseUrl)
                    .post()
                    .uri(
                            "/storage/v1/object/"
                                    + bucket
                                    + "/"
                                    + claveArchivo
                    )
                    .header(
                            "apikey",
                            secretKey
                    )
                    .header(
                            "x-upsert",
                            "false"
                    )
                    .contentType(
                            obtenerMediaType(
                                    archivo.getContentType()
                            )
                    )
                    .body(
                            archivo.getBytes()
                    )
                    .retrieve()
                    .toBodilessEntity();

            return claveArchivo;

        } catch (IOException ex) {

            throw new IllegalStateException(
                    "No fue posible leer el archivo recibido",
                    ex
            );
        }
    }

    /**
     * Publica bytes validados de un borrador; no acepta carpetas, rutas ni nombres del cliente.
     * La compensación del archivo público la controla el servicio transaccional llamador.
     */
    public String nuevaClaveImagenCms(Long idSeccion, String mime) {
        validarConfiguracion();
        if (!"cms-public".equals(bucket) || idSeccion == null || idSeccion <= 0) {
            throw new IllegalArgumentException("Bucket o sección de publicación inválidos");
        }
        String extension = switch (mime == null ? "" : mime) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> throw new IllegalArgumentException("Formato de imagen no publicable");
        };
        return "contenido-web/inicio/" + idSeccion + "/" + UUID.randomUUID() + extension;
    }

    public void subirImagenCms(String clave, byte[] bytes, String mime) {
        validarConfiguracion();
        validarClaveCms(clave);
        if (!"cms-public".equals(bucket) || bytes == null || bytes.length == 0 ||
                bytes.length > ImagenBorradorValidador.MAX_BYTES) {
            throw new IllegalArgumentException("La imagen pública excede el límite permitido");
        }
        subirImagenCmsConClave(clave, bytes, mime);
    }

    /** Solo acepta claves generadas para el publicador CMS; nunca rutas arbitrarias. */
    public void eliminarImagenCms(String clave) {
        validarClaveCms(clave);
        validarConfiguracion();
        try {
            RestClient.RequestHeadersSpec<?> peticion = RestClient.create(supabaseUrl)
                    .delete().uri("/storage/v1/object/" + bucket + "/" + clave)
                    .header("apikey", secretKey);
            if (!secretKey.startsWith("sb_secret_")) {
                peticion = peticion.header("Authorization", "Bearer " + secretKey);
            }
            peticion.retrieve().toBodilessEntity();
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound ignorado) {
            // Limpieza idempotente: un intento anterior pudo haberlo eliminado.
        }
    }

    private void subirImagenCmsConClave(String clave, byte[] bytes, String mime) {
        validarClaveCms(clave);
        RestClient.RequestBodySpec peticion = RestClient.create(supabaseUrl)
                .post().uri("/storage/v1/object/" + bucket + "/" + clave)
                .header("apikey", secretKey).header("x-upsert", "false")
                .contentType(MediaType.parseMediaType(mime));
        if (!secretKey.startsWith("sb_secret_")) {
            peticion = peticion.header("Authorization", "Bearer " + secretKey);
        }
        peticion.body(bytes).retrieve().toBodilessEntity();
    }

    private static void validarClaveCms(String clave) {
        if (clave == null || !clave.matches(
                "contenido-web/inicio/[1-9][0-9]*/[0-9a-f-]{36}\\.(jpg|png|webp)")) {
            throw new IllegalArgumentException("Clave CMS no permitida");
        }
    }

    public String obtenerUrlPublica(
            String claveArchivo) {

        validarConfiguracion();

        if (claveArchivo == null
                || claveArchivo.isBlank()) {

            throw new IllegalArgumentException(
                    "La clave del archivo es obligatoria"
            );
        }

        return supabaseUrl
                + "/storage/v1/object/public/"
                + bucket
                + "/"
                + claveArchivo;
    }

    public boolean estaConfigurado() {

        return supabaseUrl != null
                && !supabaseUrl.isBlank()
                && secretKey != null
                && !secretKey.isBlank()
                && bucket != null
                && !bucket.isBlank();
    }

    private void validarConfiguracion() {

        if (!estaConfigurado()) {

            throw new IllegalStateException(
                    "Supabase Storage no está configurado correctamente"
            );
        }
    }

    private void validarArchivo(
            MultipartFile archivo) {

        if (archivo == null
                || archivo.isEmpty()) {

            throw new IllegalArgumentException(
                    "Debe seleccionar un archivo"
            );
        }

        if (archivo.getSize() > MAX_FILE_SIZE) {

            throw new IllegalArgumentException(
                    "El archivo supera el tamaño máximo permitido de 50 MB"
            );
        }
    }

    private String generarNombreArchivo(
            String nombreOriginal) {

        String extension = "";

        if (StringUtils.hasText(nombreOriginal)) {

            int posicionPunto =
                    nombreOriginal.lastIndexOf('.');

            if (posicionPunto >= 0
                    && posicionPunto
                    < nombreOriginal.length() - 1) {

                extension =
                        nombreOriginal
                                .substring(posicionPunto)
                                .toLowerCase();
            }
        }

        return UUID.randomUUID()
                + extension;
    }

    private String normalizarCarpeta(
            String carpeta) {

        if (carpeta == null
                || carpeta.isBlank()) {

            return "";
        }

        return carpeta
                .trim()
                .toLowerCase()
                .replace("\\", "/")
                .replaceAll("[^a-z0-9/_-]", "-")
                .replaceAll("/+", "/")
                .replaceAll("^/|/$", "");
    }

    private MediaType obtenerMediaType(
            String tipoMime) {

        if (tipoMime == null
                || tipoMime.isBlank()) {

            return MediaType.APPLICATION_OCTET_STREAM;
        }

        try {

            return MediaType.parseMediaType(
                    tipoMime
            );

        } catch (IllegalArgumentException ex) {

            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}