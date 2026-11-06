package monolithe.core_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** Corrección de datos personales en CRM con motivo obligatorio y auditoría. */
public record CorregirDatosPersonalesCrmRequest(
    @NotNull JsonNode datos,
    @NotBlank @Size(min=8,max=500) String motivo
) {}
