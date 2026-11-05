package monolithe.core_service.dto;

import java.math.BigDecimal;

public record LotePrecioVigenteResponse(
        Long idLote,
        BigDecimal precio,
        String moneda,
        String codigoMoneda,
        Long idLotePrecio
) {
}

