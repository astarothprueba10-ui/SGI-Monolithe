package monolithe.core_service.dto;
import jakarta.validation.constraints.*;
import java.util.List;

public final class ManzanaComercialDto {
    private ManzanaComercialDto(){}
    public record Zona(Long id,String codigo,String nombre,boolean activa){}
    public record Etapa(String codigo,String nombre,boolean habilitada){}
    public record Fila(Long id,String codigo,String nombre,int orden,String codigoEtapa,String nombreEtapa,
        String estado,boolean activa,int lotes,int vendidos,List<Zona> zonas){}
    public record Listado(long revision,boolean publicado,List<Etapa> etapas,List<Zona> zonas,List<Fila> manzanas,String codigoSugerido,String nombreSugerido){}
    public record Cambio(@Positive Long id,@NotNull @Min(0) Long revision,
        @NotBlank @Pattern(regexp="[A-Z0-9][A-Z0-9_-]{0,29}") String codigo,
        @NotBlank @Size(max=100) String nombre,
        @NotBlank @Size(max=30) String codigoEtapa,
        @NotNull Boolean activa,
        @NotNull @Size(max=100) List<@NotNull @Positive Long> zonas){}
}
