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
public class SeccionPublicResponse {

    private Long idSeccion;
    private Integer idTipoSeccion;
    private String tipoSeccionCodigo;

    private String codigo;
    private String titulo;
    private String subtitulo;
    private String contenido;

    private Map<String, Object> configuracion;

    private Integer orden;

    private List<MultimediaPublicResponse> multimedia;
    private List<SeccionItemPublicResponse> items;
}