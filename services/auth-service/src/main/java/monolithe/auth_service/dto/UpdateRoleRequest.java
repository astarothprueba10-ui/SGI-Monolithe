package monolithe.auth_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateRoleRequest(
        @NotBlank(message = "El nombre del rol es obligatorio")
        @Size(min = 2, max = 100, message = "El nombre del rol debe tener entre 2 y 100 caracteres")
        String nombre,
        @Size(max = 255, message = "La descripción no debe superar 255 caracteres")
        String descripcion) {
}
