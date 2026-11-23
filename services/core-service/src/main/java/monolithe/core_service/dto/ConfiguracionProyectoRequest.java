package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDate;

public record ConfiguracionProyectoRequest(
        @NotNull @Min(0) Integer version,
        @NotNull @Valid Datos datos) {

    public enum Disponibilidad { PROMOCION, REGULAR, ANTICIPADA, BLOQUEADA }
    public enum TipoDescuento { NINGUNO, PORCENTAJE, MONTO_FIJO }

    public record Datos(
            @NotNull @Size(max = 100) List<@NotNull @Valid Etapa> etapas,
            @NotNull @Size(max = 2000) List<@NotNull @Valid Asignacion> manzanas,
            @NotNull @Size(max = 10000) List<@NotNull @Valid Asignacion> lotes,
            @Size(max = 2000) List<@NotNull @Valid Tarifa> tarifas) {
        public Datos {
            tarifas = tarifas == null ? List.of() : tarifas;
        }
        public Datos(List<Etapa> etapas, List<Asignacion> manzanas, List<Asignacion> lotes) {
            this(etapas, manzanas, lotes, List.of());
        }
    }

    public enum TipoTarifa { POR_M2, MONTO_FIJO }
    public record Tarifa(
            @NotBlank @Size(max = 30) String codigoZona,
            @NotBlank @Pattern(regexp = "[A-Z0-9][A-Z0-9_-]{0,29}") String codigoEtapa,
            @NotBlank @Pattern(regexp = "[A-Z]{3}") String moneda,
            @NotNull TipoTarifa tipoTarifa,
            @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 10, fraction = 4) BigDecimal valor,
            @NotNull LocalDate vigenteDesde,
            LocalDate vigenteHasta) {}

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
