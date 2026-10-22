package monolithe.core_service.client;

import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

public interface SupabaseStorageClient {

    /**
     * Sube un archivo al bucket privado de Supabase Storage.
     *
     * @param bucket   nombre del bucket de destino
     * @param path     ruta dentro del bucket (e.g. solicitudes/5/uuid.jpg)
     * @param archivo  archivo multipart a subir
     * @return nodo JSON con la respuesta de la API de Supabase
     */
    JsonNode subirArchivo(String bucket, String path, MultipartFile archivo);

    /**
     * Elimina un archivo del bucket privado.
     *
     * @param bucket nombre del bucket
     * @param path   ruta del archivo a eliminar
     */
    void eliminarArchivo(String bucket, String path);

    /**
     * Genera una URL firmada de acceso temporal (valida unicamente para
     * el aprobador, nunca expuesta al frontend directamente).
     *
     * @param bucket          nombre del bucket
     * @param path            ruta del archivo
     * @param segundosExpiry  duracion de la URL en segundos
     * @return URL firmada como String
     */
    String generarUrlFirmada(String bucket, String path, int segundosExpiry);
}
