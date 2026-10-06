package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateUserRequest {

        @NotBlank(message = "El usuario es obligatorio")
        @Size(min = 8, max = 20, message = "El usuario debe tener entre 8 y 20 caracteres")
        @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@monolithe\\.pe$", message = "El usuario debe utilizar el dominio corporativo @monolithe.pe")
        private String usuarioLogin;

        public void setUsuarioLogin(String usuarioLogin) {
                this.usuarioLogin = usuarioLogin != null
                                ? usuarioLogin.trim().toLowerCase()
                                : null;
        }
}
