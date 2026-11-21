package monolithe.core_service.service;

import monolithe.core_service.repository.ImportacionProyectoRepository;
import monolithe.core_service.repository.ImportacionProyectoRepository.Referencia;
import java.util.*;

final class ImportacionProyectoContexto {
    final Map<String, Referencia> etapas = new HashMap<>();
    final Map<String, Referencia> zonas = new HashMap<>();
    final Map<String, Referencia> manzanas = new HashMap<>();
    final Set<String> estadosEtapa;
    final Set<String> estadosManzana;
    final Set<String> tiposLote;
    final Set<String> clavesArchivo = new HashSet<>();
    final Set<String> numerosArchivo = new HashSet<>();
    ImportacionProyectoContexto(ImportacionProyectoRepository repo, Long proyecto) {
        repo.etapas(proyecto).forEach(r -> etapas.put(r.codigo(), r));
        repo.zonas(proyecto).forEach(r -> zonas.put(r.codigo(), r));
        repo.manzanas(proyecto).forEach(r -> manzanas.put(r.codigo(), r));
        estadosEtapa = new HashSet<>(repo.estadosEtapa());
        estadosManzana = new HashSet<>(repo.estadosManzana());
        tiposLote = new HashSet<>(repo.tiposLote());
    }
    void unica(String hoja, String clave) {
        if (!clavesArchivo.add(hoja + "\u001f" + clave)) ImportacionProyectoFila.error("Clave duplicada en el archivo.");
    }
    Referencia referencia(Map<String, Referencia> mapa, String clave) {
        Referencia ref = mapa.get(clave);
        if (ref == null || !ref.activo()) ImportacionProyectoFila.error("Referencia inexistente o inactiva: " + clave.replace('\u001f', '/'));
        return ref;
    }
    void nueva(Map<String, Referencia> mapa, String clave) {
        mapa.put(clave, new Referencia(0L, clave, true));
    }
    void catalogo(Set<String> catalogo, String codigo) {
        if (!catalogo.contains(codigo)) ImportacionProyectoFila.error("Código de catálogo inválido o inactivo: " + codigo);
    }
}
