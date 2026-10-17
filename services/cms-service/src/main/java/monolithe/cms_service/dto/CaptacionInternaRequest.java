package monolithe.cms_service.dto;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CaptacionInternaRequest extends CaptacionRequest {
    public CaptacionInternaRequest() {
        setMotivoContacto("Registro interno de lead");
    }
    @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Z_]+")
    private String origenCodigo;
    @Positive private Long idPersona;
    @Positive private Long idAsesor;
}
