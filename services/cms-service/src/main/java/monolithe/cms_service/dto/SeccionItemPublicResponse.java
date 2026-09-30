package monolithe.cms_service.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeccionItemPublicResponse {

    private Long idSeccionItem;

    private String codigo;
    private String titulo;
    private String subtitulo;
    private String contenido;

    private String textoEnlace;
    private String urlEnlace;

    private Map<String, Object> configuracion;

    private Integer orden;

    private List<MultimediaPublicResponse> multimedia;
}