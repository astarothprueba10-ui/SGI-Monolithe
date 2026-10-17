package monolithe.cms_service.dto;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class ConsultaWebRequest extends CaptacionRequest {
    @Positive private Long idPagina;
    @AssertTrue(message = "Debe aceptar la política de privacidad")
    @NotNull private Boolean aceptaPrivacidad = false;
    @Size(max = 100) private String utmOrigen;
    @Size(max = 100) private String utmMedio;
    @Size(max = 150) private String utmCampana;
}
