package monolithe.core_service.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record PublicacionComercialRequest(
        @NotNull @Positive Integer version,
        @NotNull @Size(max=100) List<@NotBlank @Pattern(regexp="[A-Z0-9][A-Z0-9_-]{0,29}") String> etapasHabilitar,
        @Size(max=64) String huella) {}
