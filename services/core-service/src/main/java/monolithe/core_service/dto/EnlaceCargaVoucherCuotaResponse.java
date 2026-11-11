package monolithe.core_service.dto;

import java.util.UUID;

/** URL firmada de carga privada, con preautorización limitada a 30 minutos. */
public record EnlaceCargaVoucherCuotaResponse(
        UUID idCarga,
        String bucket,
        String claveArchivo,
        String urlCarga,
        String tipoMime,
        long maxBytes,
        int expiresInSeconds
) {}
