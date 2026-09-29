package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@Setter
public class SeccionItemRequest {

    @NotBlank
    @Size(max = 60)
    private String codigo;

    @Size(max = 180)
    private String titulo;

    @Size(max = 255)
    private String subtitulo;

    private String contenido;

    @Size(max = 120)
    private String textoEnlace;

    @Size(max = 500)
    private String urlEnlace;

    private Map<String, Object> configuracion;

    private Integer orden = 0;

    private Boolean visible = true;

    private OffsetDateTime fechaDesde;

    private OffsetDateTime fechaHasta;
}