package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record PublicarVisibilidadBorradorRequest(
        @NotNull @Positive Long revisionEditorialEsperada,
        @NotNull @PositiveOrZero Long revisionPublicadaEsperada) { }
