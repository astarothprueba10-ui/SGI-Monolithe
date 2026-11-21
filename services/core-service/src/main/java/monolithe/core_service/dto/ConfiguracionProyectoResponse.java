package monolithe.core_service.dto;

import java.util.List;

public record ConfiguracionProyectoResponse(
        int version,
        ConfiguracionProyectoRequest.Datos datos,
        List<Manzana> manzanas,
        List<Lote> lotes) {
    public record Manzana(Long id, String codigo, String nombre) {}
    public record Lote(Long id, Long idManzana, String codigo) {}
}
