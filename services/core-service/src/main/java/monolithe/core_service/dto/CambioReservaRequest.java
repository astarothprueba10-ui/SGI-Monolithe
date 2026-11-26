package monolithe.core_service.dto;
import jakarta.validation.constraints.*;
public record CambioReservaRequest(@NotNull @Positive Long idProspecto,@NotNull @Positive Long idReserva,@NotNull @Positive Long idLote,@NotBlank @Size(min=5,max=500) String motivo) {}
