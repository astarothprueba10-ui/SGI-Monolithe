package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record DescartarBorradorRequest(
        @NotNull @Positive Long revisionEsperada
) { }
