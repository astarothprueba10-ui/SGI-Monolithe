package monolithe.core_service.dto;

import jakarta.validation.constraints.Size;

public record SolicitarRetrocesoCrmRequest(
        @Size(max = 50, message = "El codigo de etapa destino no puede superar 50 caracteres.")
        String estadoDestinoCodigo,

        @Size(max = 50, message = "El codigo de etapa destino no puede superar 50 caracteres.")
        String etapaDestino,

        @Size(max = 50, message = "El codigo de motivo no puede superar 50 caracteres.")
        String motivoCodigo,

        @Size(max = 2000, message = "La explicacion del motivo no puede superar 2000 caracteres.")
        String motivoDetallado,

        @Size(max = 2000, message = "La explicacion no puede superar 2000 caracteres.")
        String explicacion
) {
    public String resolverEstadoDestino() {
        if (estadoDestinoCodigo != null && !estadoDestinoCodigo.isBlank()) {
            return estadoDestinoCodigo.trim();
        }
        return etapaDestino != null ? etapaDestino.trim() : null;
    }

    public String resolverMotivoDetallado() {
        if (motivoDetallado != null && !motivoDetallado.isBlank()) {
            return motivoDetallado.trim();
        }
        return explicacion != null ? explicacion.trim() : null;
    }
}
