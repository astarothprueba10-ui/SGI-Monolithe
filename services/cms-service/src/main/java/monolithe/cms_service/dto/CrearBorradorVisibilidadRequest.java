package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CrearBorradorVisibilidadRequest(
        @NotNull @Positive Long idProyecto,
        @NotNull Boolean visiblePublico,
        UUID idGrupoEdicion
) { }
