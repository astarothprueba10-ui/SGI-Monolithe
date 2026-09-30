package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StorageUploadResponse {

    private String claveArchivo;
    private String urlPublica;

    private String nombreArchivoOriginal;
    private String tipoMime;
    private long tamanioBytes;
}