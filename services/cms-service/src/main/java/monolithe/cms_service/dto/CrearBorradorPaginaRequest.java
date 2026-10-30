package monolithe.cms_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;
import java.util.UUID;

public record CrearBorradorPaginaRequest(
        @NotNull @Positive Long idPagina,
        @NotEmpty List<@Valid TextoSeccionBorrador> secciones,
        UUID idGrupoEdicion
) { }
