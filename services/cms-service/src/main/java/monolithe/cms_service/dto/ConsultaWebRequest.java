package monolithe.cms_service.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.AssertTrue;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ConsultaWebRequest {

    @NotBlank(message = "El nombre es obligatorio")
    @Size(max = 150, message = "El nombre no puede exceder 150 caracteres")
    private String nombre;

    @Email(message = "El formato de correo no es válido")
    @Size(max = 180, message = "El correo no puede exceder 180 caracteres")
    private String correo;

    @Size(max = 40, message = "El teléfono no puede exceder 40 caracteres")
    private String telefono;

    private Long idProyecto;

    private Long idPagina;

    @Size(max = 150, message = "El asunto no puede exceder 150 caracteres")
    private String asunto;

    @NotBlank(message = "El mensaje es obligatorio")
    private String mensaje;

    private Boolean aceptaPrivacidad = false;

    @Size(max = 100)
    private String utmOrigen;

    @Size(max = 100)
    private String utmMedio;

    @Size(max = 150)
    private String utmCampana;

    @AssertTrue(message = "Debe proporcionar al menos un correo o teléfono")
    public boolean isContactoValido() {

        boolean tieneCorreo = correo != null
                && !correo.isBlank();

        boolean tieneTelefono = telefono != null
                && !telefono.isBlank();

        return tieneCorreo || tieneTelefono;
    }

    @AssertTrue(message = "Debe aceptar la política de privacidad")
    public boolean isPrivacidadAceptada() {

        return Boolean.TRUE.equals(
                aceptaPrivacidad);
    }
}
