package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginaPublicResponse {

    private Long idPagina;

    private String codigo;
    private String slug;
    private String titulo;
    private String descripcion;

    private String tituloSeo;
    private String descripcionSeo;

    private Integer orden;
    private Boolean mostrarMenu;

    private OffsetDateTime fechaPublicacion;

    private List<MultimediaPublicResponse> multimedia;
    private List<SeccionPublicResponse> secciones;
}