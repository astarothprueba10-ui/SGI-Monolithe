package monolithe.core_service.dto;

import java.util.List;

public record ImportacionProyectoResponse(String huella, List<Resultado> filas, boolean confirmado) {
    public record Resultado(String hoja, int numero, String codigo, String estado, String mensaje) {}
}
