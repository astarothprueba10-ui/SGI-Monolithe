package monolithe.cms_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@Setter
public class SeccionRequest {

    @NotNull
    private Integer idTipoSeccion;

    @NotBlank
    @Size(max = 50)
    private String codigo;

    @Size(max = 180)
    private String titulo;

    @Size(max = 255)
    private String subtitulo;

    private String contenido;

    private Map<String, Object> configuracion;

    private Integer orden = 0;

    private Boolean visible = true;

    private OffsetDateTime fechaDesde;

    private OffsetDateTime fechaHasta;
}