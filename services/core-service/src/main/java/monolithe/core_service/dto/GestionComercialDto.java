package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Tarifa;

public final class GestionComercialDto {
    private GestionComercialDto() {}
    public record Estado(List<String> etapasHabilitadas, List<Tarifa> tarifas) {}
    public record Respuesta(int version, long revision, boolean inferida, Estado estado) {}
    public record Disponibilidad(@NotNull @Min(0) Long revision,
        @NotNull @Size(max=100) List<@NotBlank String> etapasHabilitadas) {}
    public record CambioTarifa(@NotNull @Min(0) Long revision, @NotNull @Valid Tarifa tarifa) {}
    public record Evento(long id, String tipo, Long actor, String fecha, String anterior, String nuevo) {}
}
