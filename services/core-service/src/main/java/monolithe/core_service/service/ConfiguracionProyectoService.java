package monolithe.core_service.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ConfiguracionProyectoRequest;
import monolithe.core_service.dto.ConfiguracionProyectoRequest.Datos;
import monolithe.core_service.dto.ConfiguracionProyectoResponse;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.ConfiguracionProyectoRepository;
import monolithe.core_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfiguracionProyectoService {
    private final ConfiguracionProyectoRepository repository;
    private final ProyectoRepository proyectos;
    private final JsonMapper mapper;

    @Transactional(readOnly = true)
    public ConfiguracionProyectoResponse obtener(Long proyecto) {
        obtenerProyecto(proyecto);
        var version = repository.vigente(proyecto);
        var datos = version.map(v -> leer(v.json()))
                .orElseGet(() -> new Datos(repository.etapas(proyecto), List.of(), List.of()));
        return new ConfiguracionProyectoResponse(version.map(v -> v.numero()).orElse(0), datos,
                repository.manzanas(proyecto), repository.lotes(proyecto), repository.zonas(proyecto), repository.monedas());
    }

    @Transactional
    public ConfiguracionProyectoResponse guardar(Long proyecto, Long actor, ConfiguracionProyectoRequest solicitud) {
        exigirSinPublicacion(proyecto, true);
        if (!Boolean.TRUE.equals(obtenerProyecto(proyecto).getActivo())) {
            throw new ReglaNegocioException("El proyecto no está habilitado.");
        }
        var actual = obtener(proyecto);
        if (solicitud.version() != actual.version()) conflicto();
        ConfiguracionProyectoValidator.validar(solicitud.datos(), actual.manzanas(), actual.lotes());
        ConfiguracionProyectoValidator.validarTarifas(solicitud.datos(), actual.zonas(), actual.monedas());
        int siguiente = actual.version() + 1;
        if (!repository.insertar(proyecto, siguiente, escribir(solicitud.datos()), actor)) conflicto();
        return new ConfiguracionProyectoResponse(siguiente, solicitud.datos(), actual.manzanas(), actual.lotes(), actual.zonas(), actual.monedas());
    }

    // Importar, guardar borrador y publicar comparten el bloqueo por proyecto.
    public void exigirSinPublicacion(Long proyecto, boolean bloquear) {
        if (bloquear) repository.bloquearConfiguracion(proyecto);
        if (repository.versionPublicada(proyecto) > 0)
            throw new ConflictoNegocioException("El proyecto ya fue publicado. Realiza los ajustes mediante los CRUD.");
    }

    public int versionPublicada(Long proyecto) {
        obtenerProyecto(proyecto);
        return repository.versionPublicada(proyecto);
    }

    private Proyecto obtenerProyecto(Long id) {
        return proyectos.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado."));
    }

    private Datos leer(String json) {
        try {
            return mapper.readValue(json, Datos.class);
        } catch (JacksonException ex) {
            throw new IllegalStateException("Borrador comercial inválido.", ex);
        }
    }

    private String escribir(Datos datos) {
        try {
            return mapper.writeValueAsString(datos);
        } catch (JacksonException ex) {
            throw new IllegalStateException("No se pudo serializar el borrador.", ex);
        }
    }

    private void conflicto() {
        throw new ConflictoNegocioException("La configuración cambió. Recarga antes de guardar.");
    }
}
