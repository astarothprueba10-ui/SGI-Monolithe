package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ProyectoRequest;
import monolithe.core_service.dto.ProyectoResponse;
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

import java.time.LocalDate;
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

    @Transactional
    public ProyectoResponse crear(ProyectoRequest request) {
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        EstadoProyecto estado = obtenerEstadoActivo(request.codigoEstadoProyecto());

        if (proyectoRepository.existsByCodigo(codigo)) {
            throw new ConflictoNegocioException("Ya existe un proyecto con el código: " + codigo);
        }

        validarFechas(request.fechaInicio(), request.fechaFinEstimada());

        Proyecto p = new Proyecto();
        p.setEstadoProyecto(estado);
        p.setCodigo(codigo);
        p.setNombre(nombre);
        p.setDescripcion(request.descripcion());
        p.setDireccion(normalizarTexto(request.direccion()));
        p.setUbicacionReferencia(normalizarTexto(request.ubicacionReferencia()));
        p.setDistrito(normalizarTexto(request.distrito()));
        p.setProvincia(normalizarTexto(request.provincia()));
        p.setDepartamento(normalizarTexto(request.departamento()));
        p.setPais(resolverPais(request.pais()));
        p.setLatitud(request.latitud());
        p.setLongitud(request.longitud());
        p.setAreaTotalM2(request.areaTotalM2());
        p.setFechaInicio(request.fechaInicio());
        p.setFechaFinEstimada(request.fechaFinEstimada());
        p.setActivo(request.activo() != null ? request.activo() : true);

        Proyecto guardado = proyectoRepository.save(p);
        return toResponse(guardado);
    }

    @Transactional
    public ProyectoResponse actualizar(Long idProyecto, ProyectoRequest request) {
        Proyecto p = proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException("Proyecto no encontrado con id: " + idProyecto));

        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        EstadoProyecto estado = obtenerEstadoActivo(request.codigoEstadoProyecto());

        if (proyectoRepository.existsByCodigoAndIdProyectoNot(codigo, idProyecto)) {
            throw new ConflictoNegocioException("Ya existe otro proyecto con el código: " + codigo);
        }

        validarFechas(request.fechaInicio(), request.fechaFinEstimada());

        p.setEstadoProyecto(estado);
        p.setCodigo(codigo);
        p.setNombre(nombre);
        p.setDescripcion(request.descripcion());
        p.setDireccion(normalizarTexto(request.direccion()));
        p.setUbicacionReferencia(normalizarTexto(request.ubicacionReferencia()));
        p.setDistrito(normalizarTexto(request.distrito()));
        p.setProvincia(normalizarTexto(request.provincia()));
        p.setDepartamento(normalizarTexto(request.departamento()));
        p.setPais(resolverPais(request.pais()));
        p.setLatitud(request.latitud());
        p.setLongitud(request.longitud());
        p.setAreaTotalM2(request.areaTotalM2());
        p.setFechaInicio(request.fechaInicio());
        p.setFechaFinEstimada(request.fechaFinEstimada());
        if (Boolean.TRUE.equals(p.getActivo()) && Boolean.FALSE.equals(request.activo())) {
            validarDesactivacionProyecto(idProyecto);
        }

        if (request.activo() != null) {
            p.setActivo(request.activo());
        }

        Proyecto actualizado = proyectoRepository.save(p);
        return toResponse(actualizado);
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

    private String resolverPais(String pais) {
        if (pais == null || pais.isBlank()) {
            return "Perú";
        }
        return pais.trim();
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

    private void validarFechas(LocalDate fechaInicio, LocalDate fechaFinEstimada) {
        if (fechaInicio != null && fechaFinEstimada != null && fechaFinEstimada.isBefore(fechaInicio)) {
            throw new ReglaNegocioException("La fecha fin estimada no puede ser anterior a la fecha de inicio");
        }
    }
}
