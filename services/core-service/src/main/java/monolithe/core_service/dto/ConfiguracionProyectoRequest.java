package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

public record ConfiguracionProyectoRequest(
        @NotNull @Min(0) Integer version,
        @NotNull @Valid Datos datos) {

    public enum Disponibilidad { PROMOCION, REGULAR, ANTICIPADA, BLOQUEADA }
    public enum TipoDescuento { NINGUNO, PORCENTAJE, MONTO_FIJO }

    public record Datos(
            @NotNull @Size(max = 100) List<@NotNull @Valid Etapa> etapas,
            @NotNull @Size(max = 2000) List<@NotNull @Valid Asignacion> manzanas,
            @NotNull @Size(max = 10000) List<@NotNull @Valid Asignacion> lotes) {}

    public record Etapa(
            @NotBlank @Pattern(regexp = "[A-Z0-9][A-Z0-9_-]{0,29}") String codigo,
            @NotBlank @Size(max = 100) String nombre,
            @NotNull Disponibilidad disponibilidad,
            @NotNull TipoDescuento tipoDescuento,
            @NotNull @DecimalMin("0") @Digits(integer = 12, fraction = 2) BigDecimal descuento) {}

    public record Asignacion(
            @NotNull @Positive Long id,
            @NotBlank @Pattern(regexp = "[A-Z0-9][A-Z0-9_-]{0,29}") String codigoEtapa) {}
}
