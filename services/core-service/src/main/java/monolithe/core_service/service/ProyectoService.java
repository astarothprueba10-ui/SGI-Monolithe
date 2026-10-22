package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.dto.ProyectoResponse;
import monolithe.core_service.dto.UbigeoResponse;
import monolithe.core_service.entity.EstadoProyecto;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EstadoProyectoRepository;
import monolithe.core_service.repository.EtapaRepository;
import monolithe.core_service.repository.LoteRepository;
import monolithe.core_service.repository.ManzanaRepository;
import monolithe.core_service.repository.ProyectoRepository;
import monolithe.core_service.repository.ZonaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ProyectoService {

    private final ProyectoRepository proyectoRepository;
    private final EstadoProyectoRepository estadoProyectoRepository;
    private final EtapaRepository etapaRepository;
    private final ZonaRepository zonaRepository;
    private final ManzanaRepository manzanaRepository;
    private final LoteRepository loteRepository;
    private final ValidacionProyectoService validacionProyectoService;

    @Transactional(readOnly = true)
    public List<ProyectoResponse> listarTodos() {
        return proyectoRepository.findAll().stream()
                .sorted(Comparator.comparing(
                        (Proyecto proyecto) -> proyecto.getNombre(),
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProyectoResponse> listarActivos() {
        return proyectoRepository.findByActivoTrueOrderByNombreAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProyectoResponse obtenerPorId(Long idProyecto) {
        Proyecto proyecto = proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado con id: " + idProyecto));
        return toResponse(proyecto);
    }

    /** Crea un proyecto después de validar su ubicación y cronología. */
    @Transactional
    public ProyectoResponse crear(ProyectoRequest request) {
        String codigo = normalizarCodigo(request.codigo());
        if (proyectoRepository.existsByCodigo(codigo)) {
            throw new ConflictoNegocioException("Ya existe un proyecto con el código: " + codigo);
        }
        Proyecto p = new Proyecto();
        aplicarDatos(p, request);
        p.setActivo(request.activo() != null ? request.activo() : true);
        return toResponse(proyectoRepository.save(p));
    }

    /** Actualiza un proyecto aplicando las mismas reglas geográficas y de fechas que el alta. */
    @Transactional
    public ProyectoResponse actualizar(Long idProyecto, ProyectoRequest request) {
        Proyecto p = proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado con id: " + idProyecto));
        String codigo = normalizarCodigo(request.codigo());
        if (proyectoRepository.existsByCodigoAndIdProyectoNot(codigo, idProyecto)) {
            throw new ConflictoNegocioException("Ya existe otro proyecto con el código: " + codigo);
        }
        aplicarDatos(p, request);
        if (Boolean.TRUE.equals(p.getActivo()) && Boolean.FALSE.equals(request.activo())) {
            validarDesactivacionProyecto(idProyecto);
        }
        if (request.activo() != null) p.setActivo(request.activo());
        return toResponse(proyectoRepository.save(p));
    }

    private void aplicarDatos(Proyecto proyecto, ProyectoRequest request) {
        UbigeoResponse ubicacion = validacionProyectoService.validar(request);
        proyecto.setEstadoProyecto(obtenerEstadoActivo(request.codigoEstadoProyecto()));
        proyecto.setCodigo(normalizarCodigo(request.codigo()));
        proyecto.setNombre(normalizarTexto(request.nombre()));
        proyecto.setDescripcion(request.descripcion());
        aplicarUbicacion(proyecto, request, ubicacion);
        proyecto.setLatitud(request.latitud());
        proyecto.setLongitud(request.longitud());
        proyecto.setAreaTotalM2(request.areaTotalM2());
        proyecto.setFechaInicio(request.fechaInicio());
        proyecto.setFechaFinEstimada(request.fechaFinEstimada());
    }

    private void aplicarUbicacion(Proyecto proyecto, ProyectoRequest request, UbigeoResponse ubicacion) {
        proyecto.setDireccion(normalizarTexto(request.direccion()));
        proyecto.setUbicacionReferencia(normalizarTexto(request.ubicacionReferencia()));
        proyecto.setDepartamento(ubicacion.departamento());
        proyecto.setProvincia(ubicacion.provincia());
        proyecto.setDistrito(ubicacion.distrito());
        proyecto.setPais("Perú");
    }

    @Transactional
    public void desactivar(Long idProyecto) {
        Proyecto p = proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado con id: " + idProyecto));

        if (Boolean.TRUE.equals(p.getActivo())) {
            validarDesactivacionProyecto(idProyecto);
            p.setActivo(false);
            proyectoRepository.save(p);
        }
    }

    private void validarDesactivacionProyecto(Long idProyecto) {
        if (etapaRepository.existsByProyecto_IdProyectoAndActivoTrue(idProyecto)) {
            throw new ReglaNegocioException("El proyecto no puede desactivarse porque tiene etapas activas");
        }
        if (zonaRepository.existsByProyecto_IdProyectoAndActivoTrue(idProyecto)) {
            throw new ReglaNegocioException("El proyecto no puede desactivarse porque tiene zonas activas");
        }
        if (manzanaRepository.existsByEtapa_Proyecto_IdProyectoAndActivoTrue(idProyecto)) {
            throw new ReglaNegocioException("El proyecto no puede desactivarse porque tiene manzanas activas");
        }
        if (loteRepository.existsByIdProyectoAndActivoTrue(idProyecto)) {
            throw new ReglaNegocioException("El proyecto no puede desactivarse porque tiene lotes activos");
        }
    }

    private ProyectoResponse toResponse(Proyecto proyecto) {
        EstadoProyecto ep = proyecto.getEstadoProyecto();
        return new ProyectoResponse(
                proyecto.getIdProyecto(),
                ep != null ? ep.getIdEstadoProyecto() : null,
                ep != null ? ep.getCodigo() : null,
                ep != null ? ep.getNombre() : null,
                proyecto.getCodigo(),
                proyecto.getNombre(),
                proyecto.getDescripcion(),
                proyecto.getDireccion(),
                proyecto.getUbicacionReferencia(),
                proyecto.getDistrito(),
                proyecto.getProvincia(),
                proyecto.getDepartamento(),
                proyecto.getPais(),
                proyecto.getLatitud(),
                proyecto.getLongitud(),
                proyecto.getAreaTotalM2(),
                proyecto.getFechaInicio(),
                proyecto.getFechaFinEstimada(),
                proyecto.getActivo());
    }

    private String normalizarCodigo(String codigo) {
        return codigo != null ? codigo.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String texto) {
        return texto != null ? texto.trim() : null;
    }

    private EstadoProyecto obtenerEstadoActivo(String codigoEstadoProyecto) {
        String codigoNormalizado = normalizarCodigo(codigoEstadoProyecto);
        EstadoProyecto ep = estadoProyectoRepository.findByCodigo(codigoNormalizado)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Estado de proyecto no encontrado: " + codigoNormalizado));
        if (Boolean.FALSE.equals(ep.getActivo())) {
            throw new ReglaNegocioException("El estado de proyecto no está activo: " + codigoNormalizado);
        }
        return ep;
    }

}
