package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PaginaRequest {

    @NotBlank
    @Size(max = 40)
    private String codigo;

    @NotBlank
    @Size(max = 150)
    private String ruta;

    @NotBlank
    @Size(max = 180)
    private String titulo;

    @Size(max = 500)
    private String descripcion;

    @Size(max = 180)
    private String tituloSeo;

    @Size(max = 320)
    private String descripcionSeo;

    private Short orden = 0;

    private Boolean mostrarMenu = true;
}