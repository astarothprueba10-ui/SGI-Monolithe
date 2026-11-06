package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/** Revisiones de concurrencia explícitas; el usuario se toma únicamente del JWT. */
public record PublicarTextosBorradorRequest(
        @NotNull @Positive Long revisionEditorialEsperada,
        @NotNull @PositiveOrZero Long revisionPublicadaEsperada
) { }
