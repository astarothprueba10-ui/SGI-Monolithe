package monolithe.core_service.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import java.math.BigDecimal;
import java.time.LocalDate;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Tarifa;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Etapa;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Asignacion;

public final class GestionComercialDto {
    private GestionComercialDto() {}
    public record Estado(List<String> etapasHabilitadas, List<Tarifa> tarifas, List<Etapa> etapas, List<Asignacion> manzanas, List<Asignacion> lotes) {
        public Estado(List<String> etapasHabilitadas,List<Tarifa> tarifas) { this(etapasHabilitadas,tarifas,null,null,null); }
        public Estado(List<String> etapasHabilitadas,List<Tarifa> tarifas,List<Etapa> etapas) { this(etapasHabilitadas,tarifas,etapas,null,null); }
    }
    public record Respuesta(int version, long revision, boolean inferida, Estado estado) {}
    public record Disponibilidad(@NotNull @Min(0) Long revision,
        @NotNull @Size(max=100) List<@NotBlank String> etapasHabilitadas) {}
    public record CambioEtapas(@NotNull @Min(0) Long revision, @NotNull @Size(min=1,max=100) List<@NotNull @Valid Etapa> etapas) {}
    public record CambioAsignacion(@NotNull @Min(0) Long revision, @NotBlank @Pattern(regexp="manzanas|lotes") String tipo,
        @NotNull @Positive Long id, @NotNull @Size(max=30) String codigoEtapa) {}
    public record CambioMatriz(@NotNull @Min(0) Long revision,
        @NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=10,fraction=2) BigDecimal precioBase,
        @NotNull @Size(max=25) Map<@Pattern(regexp="[A-Z]") String,@NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal> recargos,
        @NotNull LocalDate vigenteDesde, LocalDate vigenteHasta) {}
    public record CambioTarifa(@NotNull @Min(0) Long revision, @NotNull @Valid Tarifa tarifa) {}
    public record Evento(long id, String tipo, Long actor, String fecha, String anterior, String nuevo, String actorNombre) {}
}
