package monolithe.core_service.service;

import monolithe.core_service.dto.ConfiguracionProyectoRequest.Etapa;
import monolithe.core_service.exception.ReglaNegocioException;
import java.util.*;

final class SeleccionEtapasPublicacion {
    private SeleccionEtapasPublicacion() {}

    static SortedSet<String> validar(List<String> codigos, List<Etapa> etapas) {
        if (codigos == null) throw new ReglaNegocioException("Indica las etapas que deseas habilitar; puede ser ninguna.");
        var resultado = new TreeSet<String>();
        for (String codigo : codigos) {
            if (codigo == null || !resultado.add(codigo))
                throw new ReglaNegocioException("La selección contiene etapas duplicadas o inválidas.");
            boolean permitida = etapas.stream().anyMatch(e -> e.codigo().equals(codigo));
            if (!permitida) throw new ReglaNegocioException("Solo se pueden seleccionar etapas comerciales existentes.");
        }
        return Collections.unmodifiableSortedSet(resultado);
    }

    static boolean bloquearInventario(String codigoEtapa, String estadoInventario, Set<String> seleccion) {
        return "DISPONIBLE".equals(estadoInventario) && (codigoEtapa == null || !seleccion.contains(codigoEtapa));
    }

    static boolean liberarInventario(String codigoEtapa, String estadoInventario, Set<String> seleccion) {
        return "NO_DISPONIBLE".equals(estadoInventario) && codigoEtapa != null
            && seleccion.contains(codigoEtapa);
    }
}
