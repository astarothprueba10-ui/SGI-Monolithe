package monolithe.cms_service.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.util.UUID;
import java.util.stream.Stream;

@Getter @Setter
public class CaptacionRequest {
    @NotNull private UUID idSolicitud;
    @NotBlank @Size(max = 120) private String nombres;
    @NotBlank @Size(max = 80) private String apellidoPaterno;
    @Size(max = 80) private String apellidoMaterno;
    @NotBlank @Size(max = 180)
    @Pattern(regexp = "^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$")
    private String correo;
    @NotBlank @Size(max = 40) @Pattern(regexp = "^\\+?[0-9 ()-]+$")
    private String telefono;
    @NotNull @Positive private Long idProyecto;
    @NotBlank @Size(max = 150) private String motivoContacto;
    @Size(max = 4000) private String mensaje;
    @Pattern(regexp = "DNI|CE|PASAPORTE") private String tipoDocumento;
    @Size(max = 30) @Pattern(regexp = "[A-Z0-9-]+") private String numeroDocumento;

    private String limpiar(String valor) { return valor == null || valor.trim().isEmpty() ? null : valor.trim(); }
    public void setNombres(String v) { nombres = limpiar(v); }
    public void setApellidoPaterno(String v) { apellidoPaterno = limpiar(v); }
    public void setApellidoMaterno(String v) { apellidoMaterno = limpiar(v); }
    public void setCorreo(String v) { correo = v == null ? null : v.trim().toLowerCase(java.util.Locale.ROOT); }
    public void setTelefono(String v) { telefono = limpiar(v); }
    public void setMotivoContacto(String v) { motivoContacto = limpiar(v); }
    public void setMensaje(String v) { mensaje = limpiar(v); }
    public void setTipoDocumento(String v) { tipoDocumento = limpiar(v) == null ? null : limpiar(v).toUpperCase(java.util.Locale.ROOT); }
    public void setNumeroDocumento(String v) { numeroDocumento = limpiar(v) == null ? null : limpiar(v).toUpperCase(java.util.Locale.ROOT); }

    public String getNombre() {
        return Stream.of(nombres, apellidoPaterno, apellidoMaterno)
                .filter(v -> v != null && !v.isBlank()).map(String::trim)
                .collect(java.util.stream.Collectors.joining(" "));
    }
    @AssertTrue(message = "El nombre completo no puede superar 150 caracteres")
    public boolean isNombreCompletoValido() { return getNombre().length() <= 150; }
    @AssertTrue(message = "El teléfono debe tener de 7 a 15 dígitos")
    public boolean isTelefonoValido() {
        return telefono == null || telefono.replaceAll("[ ()-]", "")
                .matches("([0-9]{7,15}|\\+[1-9][0-9]{6,14})");
    }
    @AssertTrue(message = "Indique tipo y número de documento, o deje ambos vacíos")
    public boolean isDocumentoValido() {
        if (tipoDocumento == null && numeroDocumento == null) return true;
        if (tipoDocumento == null || numeroDocumento == null) return false;
        return switch (tipoDocumento) {
            case "DNI" -> numeroDocumento.matches("[0-9]{8}");
            case "CE" -> numeroDocumento.matches("[A-Z0-9-]{8,12}");
            case "PASAPORTE" -> numeroDocumento.matches("[A-Z0-9-]{6,20}");
            default -> false;
        };
    }
}
