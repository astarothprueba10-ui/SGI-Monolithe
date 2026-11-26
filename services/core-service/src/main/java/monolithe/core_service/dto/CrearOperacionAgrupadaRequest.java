package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import tools.jackson.databind.JsonNode;

/** Negociación única: uno o más contratos se formalizan después, individualmente. */
public record CrearOperacionAgrupadaRequest(
  @NotNull @Positive Long idProspecto,
  @NotNull JsonNode lotes,
  @Size(max=500) String observaciones
) {}
