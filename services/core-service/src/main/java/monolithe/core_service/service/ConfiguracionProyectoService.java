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

    // El mapa solo requiere las etapas y asignaciones vigentes, no los catálogos ni tarifas.
    public record ConfiguracionMapa(int version, boolean publicado, Datos datos) {}

    @Transactional(readOnly = true)
    public ConfiguracionMapa obtenerParaMapa(Long proyecto) {
        obtenerProyecto(proyecto);
        int publicada = repository.versionPublicada(proyecto);
        var version = publicada > 0 ? repository.porVersion(proyecto,publicada) : repository.vigente(proyecto);
        if (publicada > 0 && version.isEmpty())
            throw new ConflictoNegocioException("No se encontró la configuración de la publicación vigente.");
        var datos = version.map(v -> leer(v.json()))
                .orElseGet(() -> new Datos(repository.etapas(proyecto), List.of(), List.of()));
        if (publicada > 0) {
            var asignaciones = repository.asignacionesVigentes(proyecto,publicada);
            if (asignaciones.isPresent()) {
                var estado = mapper.readValue(asignaciones.get(),monolithe.core_service.dto.GestionComercialDto.Estado.class);
                datos = new Datos(datos.etapas(),estado.manzanas(),estado.lotes());
            }
            var vigentes = repository.etapasVigentes(proyecto,publicada);
            if (vigentes.isPresent()) {
                var etapas = mapper.readValue(vigentes.get(),ConfiguracionProyectoRequest.Etapa[].class);
                datos = new Datos(List.of(etapas),datos.manzanas(),datos.lotes());
            }
        }
        return new ConfiguracionMapa(version.map(v -> v.numero()).orElse(0),publicada > 0,datos);
    }

    public record LecturaMapa(int version, boolean publicado, Datos datos, List<String> abiertas, long revision) {}

    @Transactional(readOnly = true)
    public LecturaMapa obtenerLecturaMapa(Long proyecto) {
        var lectura = repository.lecturaMapa(proyecto);
        if (!lectura.existe()) throw new RecursoNoEncontradoException("Proyecto no encontrado.");
        if (!lectura.publicacionVisible() || !lectura.integridad())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,
                "No se puede verificar la integridad de la publicación comercial.");
        boolean publicada = lectura.publicada() > 0;
        if (publicada && lectura.borrador() == null)
            throw new ConflictoNegocioException("No se encontró la configuración de la publicación vigente.");
        var datos = lectura.borrador() == null
            ? new Datos(repository.etapas(proyecto),List.of(),List.of()) : leer(lectura.borrador());
        if (publicada && lectura.asignaciones() != null) {
            var estado = mapper.readValue(lectura.asignaciones(),monolithe.core_service.dto.GestionComercialDto.Estado.class);
            datos = new Datos(datos.etapas(),estado.manzanas(),estado.lotes(),datos.tarifas());
        }
        if (publicada && lectura.etapas() != null) {
            var etapas = mapper.readValue(lectura.etapas(),ConfiguracionProyectoRequest.Etapa[].class);
            datos = new Datos(List.of(etapas),datos.manzanas(),datos.lotes(),datos.tarifas());
        }
        List<String> abiertas = List.of();
        if (publicada) {
            if (lectura.abiertas() == null)
                throw new ConflictoNegocioException("No se encontró la disponibilidad de la publicación vigente.");
            var valores = mapper.readValue(lectura.abiertas(),String[].class);
            if (valores == null)
                throw new ConflictoNegocioException("La disponibilidad de la publicación vigente es inválida.");
            abiertas = List.of(valores);
        }
        return new LecturaMapa(lectura.versionBorrador()==null?0:lectura.versionBorrador(),publicada,datos,abiertas,lectura.revision());
    }

    public record DetalleConsulta(ConfiguracionProyectoResponse configuracion,int publicada,long revision) {}
    @Transactional(readOnly=true)
    public DetalleConsulta obtenerDetalleConsulta(Long proyecto){
        var lectura=obtenerLecturaMapa(proyecto);
        var datos=lectura.datos();
        if(lectura.publicado()){
            var tarifas=repository.tarifasVigentes(proyecto,lectura.version());
            if(tarifas.isPresent())datos=new Datos(datos.etapas(),datos.manzanas(),datos.lotes(),
                List.of(mapper.readValue(tarifas.get(),ConfiguracionProyectoRequest.Tarifa[].class)));
        }
        var c=repository.catalogosDetalle(proyecto);
        var respuesta=new ConfiguracionProyectoResponse(lectura.version(),datos,
            List.of(mapper.readValue(c.manzanas(),ConfiguracionProyectoResponse.Manzana[].class)),
            List.of(mapper.readValue(c.lotes(),ConfiguracionProyectoResponse.Lote[].class)),
            List.of(mapper.readValue(c.zonas(),String[].class)),List.of(mapper.readValue(c.monedas(),String[].class)));
        return new DetalleConsulta(respuesta,lectura.publicado()?lectura.version():0,lectura.revision());
    }

    @Transactional(readOnly = true)
    public ConfiguracionProyectoResponse obtener(Long proyecto) {
        obtenerProyecto(proyecto);
        int publicada = repository.versionPublicada(proyecto);
        var version = publicada > 0 ? repository.porVersion(proyecto,publicada) : repository.vigente(proyecto);
        if (publicada > 0 && version.isEmpty()) throw new ConflictoNegocioException("No se encontró la configuración de la publicación vigente.");
        var datos = version.map(v -> leer(v.json()))
                .orElseGet(() -> new Datos(repository.etapas(proyecto), List.of(), List.of()));
        if (publicada>0) {
            var tarifas=repository.tarifasVigentes(proyecto,publicada);
            if(tarifas.isPresent())datos=new Datos(datos.etapas(),datos.manzanas(),datos.lotes(),
                List.of(mapper.readValue(tarifas.get(),ConfiguracionProyectoRequest.Tarifa[].class)));
            var asignaciones=repository.asignacionesVigentes(proyecto,publicada);
            if(asignaciones.isPresent()) {
                var estado=mapper.readValue(asignaciones.get(),monolithe.core_service.dto.GestionComercialDto.Estado.class);
                datos=new Datos(datos.etapas(),estado.manzanas(),estado.lotes(),datos.tarifas());
            }
            var vigentes=repository.etapasVigentes(proyecto,publicada);
            if (vigentes.isPresent()) {
                var etapas=mapper.readValue(vigentes.get(),ConfiguracionProyectoRequest.Etapa[].class);
                datos=new Datos(List.of(etapas),datos.manzanas(),datos.lotes(),datos.tarifas());
            }
        }
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

    public int contarLotesRegistrados(Long proyecto) {
        obtenerProyecto(proyecto);
        return repository.contarLotesRegistrados(proyecto);
    }

    public boolean importacionRealizada(Long proyecto) {
        obtenerProyecto(proyecto);
        return repository.importacionRealizada(proyecto);
    }

    public void registrarImportacion(Long proyecto,Long actor,String huella,int filas) {
        repository.registrarImportacion(proyecto,actor,huella,filas);
    }

    public void exigirImportacionInicial(Long proyecto) {
        if (importacionRealizada(proyecto))
            throw new ConflictoNegocioException("La importación inicial ya fue confirmada. Utiliza los formularios de gestión.");
        if (contarLotesRegistrados(proyecto) >= 10)
            throw new ConflictoNegocioException("La carga masiva solo está disponible para proyectos con menos de 10 lotes registrados. Utiliza los formularios de gestión.");
    }

    public int versionPublicada(Long proyecto) {
        obtenerProyecto(proyecto);
        return repository.versionPublicada(proyecto);
    }

    public boolean cambianEtapas(Datos actual,Datos solicitud){
        var a=normalizarCondiciones(actual).etapas();
        var b=normalizarCondiciones(solicitud).etapas();
        if(a.size()!=b.size())return true;
        for(int i=0;i<a.size();i++){
            var x=a.get(i);var y=b.get(i);
            if(!x.codigo().equals(y.codigo())||!x.nombre().equals(y.nombre())||x.disponibilidad()!=y.disponibilidad()
                ||x.tipoDescuento()!=y.tipoDescuento()||x.descuento().compareTo(y.descuento())!=0)return true;
        }
        return false;
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
