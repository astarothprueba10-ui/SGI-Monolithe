package monolithe.core_service.dto;

public record EnlaceLecturaVoucherResponse(

    String bucket,
    String claveArchivo,
    String urlDescarga,
    String nombreArchivo,
    String tipoMime,
    int expiresInSeconds

) {

}

