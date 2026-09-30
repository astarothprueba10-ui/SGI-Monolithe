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