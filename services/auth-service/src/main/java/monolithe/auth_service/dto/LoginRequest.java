package monolithe.auth_service.dto;

import java.util.Locale;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class LoginRequest {

    @NotBlank(message = "El número de documento es obligatorio")
    @Size(max = 20, message = "El número de documento no debe exceder 20 caracteres")
    private String usuario;

    @NotBlank(message = "El tipo de documento es obligatorio")
    @Pattern(regexp = "^(DNI|CE|RUC|PASAPORTE)$", message = "Selecciona un tipo de documento válido")
    private String tipoDocumento;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(max = 128, message = "La contraseña no debe exceder 128 caracteres")
    @Pattern(regexp = "^[^\\p{Cntrl}]+$", message = "La contraseña contiene caracteres no permitidos")
    private String contrasena;

    @AssertTrue(message = "El formato del número de documento no corresponde al tipo seleccionado")
    public boolean isFormatoDocumentoValido() {
        if (usuario == null || usuario.isBlank()) {
            return true;
        }

        if (tipoDocumento == null || tipoDocumento.isBlank()) {
            return true;
        }

        return switch (tipoDocumento) {
            case "DNI" -> usuario.matches("^\\d{8}$");
            case "CE" -> usuario.matches("^[a-zA-Z0-9]{8,12}$");
            case "RUC" -> usuario.matches("^\\d{11}$");
            case "PASAPORTE" -> usuario.matches("^[a-zA-Z0-9]{6,20}$");
            default -> true;
        };
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario != null ? usuario.trim() : null;
    }

    public void setTipoDocumento(String tipoDocumento) {
        this.tipoDocumento = tipoDocumento != null
                ? tipoDocumento.trim().toUpperCase(Locale.ROOT)
                : null;
    }
}