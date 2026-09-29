package monolithe.cms_service.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MultimediaRequest {

    @NotNull
    private Integer idTipoMultimedia;

    @NotBlank
    @Size(max = 50)
    private String codigo;

    @NotBlank
    @Size(max = 180)
    private String nombre;

    @Size(max = 500)
    private String descripcion;

    @Size(max = 255)
    private String nombreArchivoOriginal;

    @Size(max = 500)
    private String claveArchivo;

    @Size(max = 1000)
    private String urlExterna;

    @Size(max = 100)
    private String tipoMime;

    @Positive
    private Long tamanioBytes;

    @Size(min = 64, max = 64)
    private String hashSha256;

    @Size(max = 255)
    private String textoAlternativo;

    @Positive
    private Long anchoPx;

    @Positive
    private Long altoPx;

    @Positive
    private Long duracionSegundos;

    @AssertTrue(
            message = "Debe especificarse exactamente uno entre claveArchivo o urlExterna"
    )
    public boolean isOrigenValido() {

        boolean tieneClave =
                claveArchivo != null
                        && !claveArchivo.isBlank();

        boolean tieneUrl =
                urlExterna != null
                        && !urlExterna.isBlank();

        return tieneClave ^ tieneUrl;
    }
}