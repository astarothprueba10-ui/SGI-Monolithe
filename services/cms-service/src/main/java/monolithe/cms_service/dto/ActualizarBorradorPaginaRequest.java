package monolithe.cms_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public record ActualizarBorradorPaginaRequest(
        @NotNull @Positive Long revisionEsperada,
        @NotEmpty List<@Valid TextoSeccionBorrador> secciones
) { }
