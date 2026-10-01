package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.EtapaRequest;
import monolithe.core_service.dto.EtapaResponse;
import monolithe.core_service.entity.EstadoEtapa;
import monolithe.core_service.entity.Etapa;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EstadoEtapaRepository;
import monolithe.core_service.repository.EtapaRepository;
import monolithe.core_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EtapaService {

    private final EtapaRepository etapaRepository;
    private final ProyectoRepository proyectoRepository;
    private final EstadoEtapaRepository estadoEtapaRepository;

    @Transactional(readOnly = true)
    public List<EtapaResponse> listarPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return etapaRepository.findByProyecto_IdProyectoOrderByNumeroOrdenAsc(idProyecto).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EtapaResponse> listarActivasPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return etapaRepository.findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(idProyecto).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EtapaResponse obtenerPorId(Long idEtapa) {
        Etapa etapa = obtenerEtapa(idEtapa);
        return toResponse(etapa);
    }

    @Transactional
    public EtapaResponse crear(EtapaRequest request) {
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        EstadoEtapa estado = obtenerEstadoActivo(request.codigoEstadoEtapa());

        if (etapaRepository.existsByProyecto_IdProyectoAndCodigo(proyecto.getIdProyecto(), codigo)) {
            throw new ConflictoNegocioException(
                    "Ya existe una etapa con el código " + codigo + " en el proyecto " + proyecto.getIdProyecto()
            );
        }

        validarFechas(request.fechaInicio(), request.fechaFinEstimada());

        Etapa e = new Etapa();
        e.setProyecto(proyecto);
        e.setEstadoEtapa(estado);
        e.setCodigo(codigo);
        e.setNombre(nombre);
        e.setDescripcion(request.descripcion());
        e.setNumeroOrden(request.numeroOrden() != null ? request.numeroOrden() : 1);
        e.setFechaInicio(request.fechaInicio());
        e.setFechaFinEstimada(request.fechaFinEstimada());
        e.setActivo(request.activo() != null ? request.activo() : true);

        Etapa guardada = etapaRepository.save(e);
        return toResponse(guardada);
    }

    @Transactional
    public EtapaResponse actualizar(Long idEtapa, EtapaRequest request) {
        Etapa e = obtenerEtapa(idEtapa);

        if (!e.getProyecto().getIdProyecto().equals(request.idProyecto())) {
            throw new ReglaNegocioException("No se puede cambiar una etapa a otro proyecto");
        }

        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        EstadoEtapa estado = obtenerEstadoActivo(request.codigoEstadoEtapa());

        if (etapaRepository.existsByProyecto_IdProyectoAndCodigoAndIdEtapaNot(proyecto.getIdProyecto(), codigo, idEtapa)) {
            throw new ConflictoNegocioException(
                    "Ya existe otra etapa con el código " + codigo + " en el proyecto " + proyecto.getIdProyecto()
            );
        }

        validarFechas(request.fechaInicio(), request.fechaFinEstimada());

        e.setProyecto(proyecto);
        e.setEstadoEtapa(estado);
        e.setCodigo(codigo);
        e.setNombre(nombre);
        e.setDescripcion(request.descripcion());
        if (request.numeroOrden() != null) {
            e.setNumeroOrden(request.numeroOrden());
        }
        e.setFechaInicio(request.fechaInicio());
        e.setFechaFinEstimada(request.fechaFinEstimada());
        if (request.activo() != null) {
            e.setActivo(request.activo());
        }

        Etapa actualizada = etapaRepository.save(e);
        return toResponse(actualizada);
    }

    @Transactional
    public void desactivar(Long idEtapa) {
        Etapa e = obtenerEtapa(idEtapa);

        if (Boolean.TRUE.equals(e.getActivo())) {
            e.setActivo(false);
            etapaRepository.save(e);
        }
    }

    private Proyecto obtenerProyecto(Long idProyecto) {
        return proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Proyecto no encontrado con id: " + idProyecto));
    }

    private Proyecto obtenerProyectoActivo(Long idProyecto) {
        Proyecto proyecto = obtenerProyecto(idProyecto);
        if (!Boolean.TRUE.equals(proyecto.getActivo())) {
            throw new ReglaNegocioException("El proyecto no está activo: " + idProyecto);
        }
        return proyecto;
    }

    private EstadoEtapa obtenerEstadoActivo(String codigoEstadoEtapa) {
        String codigoNormalizado = normalizarCodigo(codigoEstadoEtapa);
        EstadoEtapa estado = estadoEtapaRepository.findByCodigo(codigoNormalizado)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Estado de etapa no encontrado: " + codigoNormalizado));
        if (!Boolean.TRUE.equals(estado.getActivo())) {
            throw new ReglaNegocioException("El estado de etapa no está activo: " + codigoNormalizado);
        }
        return estado;
    }

    private Etapa obtenerEtapa(Long idEtapa) {
        return etapaRepository.findById(idEtapa)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etapa no encontrada con id: " + idEtapa));
    }

    private String normalizarCodigo(String codigo) {
        return codigo != null ? codigo.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String texto) {
        return texto != null ? texto.trim() : null;
    }

    private void validarFechas(LocalDate fechaInicio, LocalDate fechaFinEstimada) {
        if (fechaInicio != null && fechaFinEstimada != null && fechaFinEstimada.isBefore(fechaInicio)) {
            throw new ReglaNegocioException("La fecha fin estimada no puede ser anterior a la fecha de inicio");
        }
    }

    private EtapaResponse toResponse(Etapa etapa) {
        Proyecto proyecto = etapa.getProyecto();
        EstadoEtapa estado = etapa.getEstadoEtapa();
        return new EtapaResponse(
                etapa.getIdEtapa(),
                proyecto != null ? proyecto.getIdProyecto() : null,
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                estado != null ? estado.getIdEstadoEtapa() : null,
                estado != null ? estado.getCodigo() : null,
                estado != null ? estado.getNombre() : null,
                etapa.getCodigo(),
                etapa.getNombre(),
                etapa.getDescripcion(),
                etapa.getNumeroOrden(),
                etapa.getFechaInicio(),
                etapa.getFechaFinEstimada(),
                etapa.getActivo()
        );
    }
}
