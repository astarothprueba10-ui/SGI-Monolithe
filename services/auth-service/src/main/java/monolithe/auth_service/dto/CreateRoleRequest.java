package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class CreateRoleRequest {

    @NotBlank(message = "El nombre del rol es obligatorio")
    @Size(
            min = 2,
            max = 100,
            message = "El nombre del rol debe tener entre 2 y 100 caracteres"
    )
    private String nombre;

    public void setNombre(String nombre) {
        this.nombre = nombre != null ? nombre.trim() : null;
    }
}
