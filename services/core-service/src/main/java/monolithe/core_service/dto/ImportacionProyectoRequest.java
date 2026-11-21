package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public record ImportacionProyectoRequest(
        @NotNull @Min(1) @Max(1) Integer versionPlantilla,
        @NotBlank @Size(max = 30) String codigoProyecto,
        @NotEmpty @Size(max = 2000) List<@NotNull @Valid Fila> filas,
        @Size(max = 64) String huella) {
    public record Fila(
            @NotBlank @Size(max = 30) String hoja,
            @NotNull @Min(2) @Max(2001) Integer numero,
            @NotNull @Size(max = 12) Map<@NotBlank @Size(max = 40) String, @NotNull @Size(max = 2000) String> celdas) {}
}
