package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CmsProyectoRequest {

    @NotNull
    private Long idProyecto;

    @NotNull
    private Long idPagina;

    @Size(max = 180)
    private String nombreComercial;

    @Size(max = 500)
    private String resumenComercial;

    private String descripcionComercial;

    private Boolean destacado = false;

    private Integer orden = 0;

    @Size(max = 120)
    private String textoCta;

    @Size(max = 500)
    private String urlCta;
}