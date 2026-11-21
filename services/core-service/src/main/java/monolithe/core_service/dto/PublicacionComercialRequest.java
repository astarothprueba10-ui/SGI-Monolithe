package monolithe.core_service.dto;

import jakarta.validation.constraints.*;

public record PublicacionComercialRequest(
        @NotNull @Positive Integer version,
        @NotNull Boolean habilitarNoDisponibles,
        @Size(max=64) String huella) {}
