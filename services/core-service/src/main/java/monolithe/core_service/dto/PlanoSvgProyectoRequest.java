package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;

public record PlanoSvgProyectoRequest(
    @NotBlank @Size(max=255) String nombreArchivo,
    @NotNull @Size(min=4,max=4) List<@NotNull Double> viewBox,
    @NotEmpty @Size(max=2000) List<@NotNull @Valid Elemento> elementos
) {
    public record Elemento(
        @NotBlank String tipo,
        @NotNull @Size(max=24) Map<@NotBlank String,@NotNull String> atributos,
        @Size(max=150) String texto,
        @Size(max=80) String codigoLote
    ) {}
}
