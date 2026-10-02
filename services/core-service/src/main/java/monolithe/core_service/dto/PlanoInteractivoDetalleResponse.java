package monolithe.core_service.dto;

import java.util.List;

public record PlanoInteractivoDetalleResponse(
        PlanoInteractivoResponse plano,
        List<LoteGeometriaResponse> lotes
) {
}
