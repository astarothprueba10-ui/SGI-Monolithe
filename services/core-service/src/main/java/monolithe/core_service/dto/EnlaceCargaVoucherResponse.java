package monolithe.core_service.dto;

public record EnlaceCargaVoucherResponse(

    String bucket,
    String claveArchivo,
    String urlCarga,
    String tipoMime,
    long maxBytes,
    int expiresInSeconds

) {

}

