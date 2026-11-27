package monolithe.core_service.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
public final class LoteComercialDto {
 private LoteComercialDto(){}
 public record Fila(LoteResponse lote,String codigoEtapa,String nombreEtapa,String estado,BigDecimal precio,boolean protegido){}
 public record Identidad(String codigo,String numero){}
 public record Listado(ManzanaComercialDto.Listado catalogo,List<Fila> lotes,java.util.Map<Long,Identidad> sugerencias){}
 public record Consulta(@Positive Long idLote,@Positive @NotNull Long idManzana,@Positive @NotNull Long idZona,
   @NotBlank @Size(max=30) String codigoEtapa,@NotNull @DecimalMin(value="0",inclusive=false) @Digits(integer=10,fraction=2) BigDecimal areaM2){}
 public record Vista(long revision,String codigo,String numero,String estado,BigDecimal precioBase,BigDecimal adicional,
    BigDecimal ajusteHistorico,BigDecimal descuento,BigDecimal precioFinal,String mensaje,boolean calculado){}
 public record Cambio(@NotNull @Min(0) Long revision,@NotNull @Valid Consulta ubicacion,
   @DecimalMin(value="0",inclusive=false) @Digits(integer=8,fraction=2) BigDecimal frenteM,
   @DecimalMin(value="0",inclusive=false) @Digits(integer=8,fraction=2) BigDecimal fondoM,
   @DecimalMin(value="0",inclusive=false) @Digits(integer=8,fraction=2) BigDecimal lateralDerechoM,
   @DecimalMin(value="0",inclusive=false) @Digits(integer=8,fraction=2) BigDecimal lateralIzquierdoM,
   @Size(max=2000) String observaciones,String codigoRevisado,String numeroRevisado,BigDecimal precioRevisado){}
}
