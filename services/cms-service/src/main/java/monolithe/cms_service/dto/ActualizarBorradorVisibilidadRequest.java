package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ActualizarBorradorVisibilidadRequest(
        @NotNull @Positive Long revisionEsperada,
        @NotNull Boolean visiblePublico
) { }
