package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.EtapaComercialRequest;
import monolithe.core_service.dto.EtapaComercialResponse;
import monolithe.core_service.entity.EtapaComercial;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.EtapaComercialRepository;
import monolithe.core_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class EtapaComercialService {

    private final EtapaComercialRepository etapaComercialRepository;
    private final ProyectoRepository proyectoRepository;

    @Transactional(readOnly = true)
    public List<EtapaComercialResponse> listarPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return etapaComercialRepository
                .findByProyecto_IdProyectoOrderByNumeroOrdenAsc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EtapaComercialResponse> listarActivasPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return etapaComercialRepository
                .findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(idProyecto)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EtapaComercialResponse obtenerPorId(Long idEtapaComercial) {
        return toResponse(obtenerEtapaComercial(idEtapaComercial));
    }

    @Transactional
    public EtapaComercialResponse crear(EtapaComercialRequest request) {
        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());

        validarFechas(request.fechaInicio(), request.fechaFin());
        validarUnicidadCrear(proyecto.getIdProyecto(), codigo);

        EtapaComercial etapa = new EtapaComercial();
        asignarDatos(etapa, proyecto, codigo, nombre, request);
        etapa.setActivo(request.activo() != null ? request.activo() : true);

        return toResponse(etapaComercialRepository.save(etapa));
    }

    @Transactional
    public EtapaComercialResponse actualizar(Long idEtapaComercial, EtapaComercialRequest request) {
        EtapaComercial etapa = obtenerEtapaComercial(idEtapaComercial);
        if (!etapa.getProyecto().getIdProyecto().equals(request.idProyecto())) {
            throw new ReglaNegocioException("No se puede cambiar una etapa comercial a otro proyecto");
        }

        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());

        validarFechas(request.fechaInicio(), request.fechaFin());
        validarUnicidadActualizar(proyecto.getIdProyecto(), codigo, idEtapaComercial);

        asignarDatos(etapa, proyecto, codigo, nombre, request);
        if (request.activo() != null) {
            etapa.setActivo(request.activo());
        }

        return toResponse(etapaComercialRepository.save(etapa));
    }

    @Transactional
    public void desactivar(Long idEtapaComercial) {
        EtapaComercial etapa = obtenerEtapaComercial(idEtapaComercial);
        if (Boolean.TRUE.equals(etapa.getActivo())) {
            etapa.setActivo(false);
            etapaComercialRepository.save(etapa);
        }
    }

    private Proyecto obtenerProyecto(Long idProyecto) {
        return proyectoRepository.findById(idProyecto)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Proyecto no encontrado con id: " + idProyecto
                ));
    }

    private Proyecto obtenerProyectoActivo(Long idProyecto) {
        Proyecto proyecto = obtenerProyecto(idProyecto);
        if (!Boolean.TRUE.equals(proyecto.getActivo())) {
            throw new ReglaNegocioException("El proyecto no está activo: " + idProyecto);
        }
        return proyecto;
    }

    private EtapaComercial obtenerEtapaComercial(Long idEtapaComercial) {
        return etapaComercialRepository.findById(idEtapaComercial)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Etapa comercial no encontrada con id: " + idEtapaComercial
                ));
    }

    private void validarFechas(LocalDate fechaInicio, LocalDate fechaFin) {
        if (fechaInicio != null && fechaFin != null && fechaFin.isBefore(fechaInicio)) {
            throw new ReglaNegocioException("La fecha fin no puede ser anterior a la fecha inicio");
        }
    }

    private void validarUnicidadCrear(Long idProyecto, String codigo) {
        if (etapaComercialRepository.existsByProyecto_IdProyectoAndCodigo(idProyecto, codigo)) {
            throw new ConflictoNegocioException(
                    "Ya existe una etapa comercial con el código " + codigo + " en el proyecto " + idProyecto
            );
        }
    }

    private void validarUnicidadActualizar(Long idProyecto, String codigo, Long idEtapaComercial) {
        if (etapaComercialRepository.existsByProyecto_IdProyectoAndCodigoAndIdEtapaComercialNot(
                idProyecto, codigo, idEtapaComercial
        )) {
            throw new ConflictoNegocioException(
                    "Ya existe una etapa comercial con el código " + codigo + " en el proyecto " + idProyecto
            );
        }
    }

    private void asignarDatos(
            EtapaComercial etapa, Proyecto proyecto, String codigo, String nombre, EtapaComercialRequest request
    ) {
        etapa.setProyecto(proyecto);
        etapa.setCodigo(codigo);
        etapa.setNombre(nombre);
        etapa.setDescripcion(normalizarTexto(request.descripcion()));
        etapa.setNumeroOrden(request.numeroOrden() != null ? request.numeroOrden() : 1);
        etapa.setFechaInicio(request.fechaInicio());
        etapa.setFechaFin(request.fechaFin());
    }

    private EtapaComercialResponse toResponse(EtapaComercial etapa) {
        Proyecto proyecto = etapa.getProyecto();
        return new EtapaComercialResponse(
                etapa.getIdEtapaComercial(),
                proyecto != null ? proyecto.getIdProyecto() : null,
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                etapa.getCodigo(),
                etapa.getNombre(),
                etapa.getDescripcion(),
                etapa.getNumeroOrden(),
                etapa.getFechaInicio(),
                etapa.getFechaFin(),
                etapa.getActivo()
        );
    }

    private String normalizarCodigo(String valor) {
        return valor != null ? valor.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String valor) {
        return valor != null ? valor.trim() : null;
    }
}
