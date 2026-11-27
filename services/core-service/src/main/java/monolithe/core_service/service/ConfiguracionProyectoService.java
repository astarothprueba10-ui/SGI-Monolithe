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
        var datos = normalizarCondiciones(solicitud.datos());
        ConfiguracionProyectoValidator.validar(datos, actual.manzanas(), actual.lotes());
        ConfiguracionProyectoValidator.validarTarifas(datos, actual.zonas(), actual.monedas());
        int siguiente = actual.version() + 1;
        if (!repository.insertar(proyecto, siguiente, escribir(datos), actor)) conflicto();
        return new ConfiguracionProyectoResponse(siguiente, datos, actual.manzanas(), actual.lotes(), actual.zonas(), actual.monedas());
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

    // Mantener el contrato v1 y los bloqueos históricos; ANTICIPADA equivale a REGULAR.
    static Datos normalizarCondiciones(Datos datos) {
        var etapas = datos.etapas().stream().map(e ->
            e.disponibilidad() == ConfiguracionProyectoRequest.Disponibilidad.ANTICIPADA
                ? new ConfiguracionProyectoRequest.Etapa(e.codigo(), e.nombre(),
                    ConfiguracionProyectoRequest.Disponibilidad.REGULAR, e.tipoDescuento(), e.descuento())
                : e).toList();
        return new Datos(etapas, datos.manzanas(), datos.lotes(), datos.tarifas());
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
