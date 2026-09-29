package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MultimediaPublicResponse {

    private Long idMultimedia;
    private Integer idUsoMultimedia;

    private String codigo;
    private String nombre;
    private String descripcion;

    private String claveArchivo;
    private String urlExterna;

    private String tipoMime;
    private String textoAlternativo;

    private Long anchoPx;
    private Long altoPx;
    private Long duracionSegundos;

    private Integer orden;
}