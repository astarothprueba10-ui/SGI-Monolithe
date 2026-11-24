package monolithe.core_service.dto;
import jakarta.validation.constraints.*;
public record DecisionCambioReservaRequest(@NotNull Boolean aprobar,@NotBlank @Size(min=5,max=500) String motivo) {}
