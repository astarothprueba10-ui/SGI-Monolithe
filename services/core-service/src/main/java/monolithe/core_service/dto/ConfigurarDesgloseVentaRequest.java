package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import tools.jackson.databind.JsonNode;

public record ConfigurarDesgloseVentaRequest(@NotNull JsonNode items) {}
