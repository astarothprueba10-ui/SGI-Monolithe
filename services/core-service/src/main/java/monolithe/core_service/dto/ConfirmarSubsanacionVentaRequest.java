package monolithe.core_service.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ConfirmarSubsanacionVentaRequest(@NotNull UUID idCarga) {}
