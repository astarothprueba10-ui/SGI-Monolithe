package monolithe.core_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.core_service.dto.ZonaRequest;
import monolithe.core_service.dto.ZonaResponse;
import monolithe.core_service.entity.Proyecto;
import monolithe.core_service.entity.Zona;
import monolithe.core_service.exception.ConflictoNegocioException;
import monolithe.core_service.exception.RecursoNoEncontradoException;
import monolithe.core_service.exception.ReglaNegocioException;
import monolithe.core_service.repository.ProyectoRepository;
import monolithe.core_service.repository.ZonaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ZonaService {

    private final ZonaRepository zonaRepository;
    private final ProyectoRepository proyectoRepository;

    @Transactional(readOnly = true)
    public List<ZonaResponse> listarPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return zonaRepository.findByProyecto_IdProyectoOrderByNumeroOrdenAsc(idProyecto).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ZonaResponse> listarActivasPorProyecto(Long idProyecto) {
        obtenerProyecto(idProyecto);
        return zonaRepository.findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(idProyecto).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ZonaResponse obtenerPorId(Long idZona) {
        Zona zona = obtenerZona(idZona);
        return toResponse(zona);
    }

    @Transactional
    public ZonaResponse crear(ZonaRequest request) {
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        String descripcion = normalizarTexto(request.descripcion());
        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());

        if (zonaRepository.existsByProyecto_IdProyectoAndCodigo(proyecto.getIdProyecto(), codigo)) {
            throw new ConflictoNegocioException(
                    "Ya existe una zona con el código " + codigo + " en el proyecto " + proyecto.getIdProyecto()
            );
        }

        Zona z = new Zona();
        z.setProyecto(proyecto);
        z.setCodigo(codigo);
        z.setNombre(nombre);
        z.setDescripcion(descripcion);
        z.setNumeroOrden(request.numeroOrden() != null ? request.numeroOrden() : 1);
        z.setActivo(request.activo() != null ? request.activo() : true);

        Zona guardada = zonaRepository.save(z);
        return toResponse(guardada);
    }

    @Transactional
    public ZonaResponse actualizar(Long idZona, ZonaRequest request) {
        Zona z = obtenerZona(idZona);

        if (!z.getProyecto().getIdProyecto().equals(request.idProyecto())) {
            throw new ReglaNegocioException("No se puede cambiar una zona a otro proyecto");
        }

        Proyecto proyecto = obtenerProyectoActivo(request.idProyecto());
        String codigo = normalizarCodigo(request.codigo());
        String nombre = normalizarTexto(request.nombre());
        String descripcion = normalizarTexto(request.descripcion());

        if (zonaRepository.existsByProyecto_IdProyectoAndCodigoAndIdZonaNot(proyecto.getIdProyecto(), codigo, idZona)) {
            throw new ConflictoNegocioException(
                    "Ya existe otra zona con el código " + codigo + " en el proyecto " + proyecto.getIdProyecto()
            );
        }

        z.setProyecto(proyecto);
        z.setCodigo(codigo);
        z.setNombre(nombre);
        z.setDescripcion(descripcion);
        if (request.numeroOrden() != null) {
            z.setNumeroOrden(request.numeroOrden());
        }
        if (request.activo() != null) {
            z.setActivo(request.activo());
        }

        Zona actualizada = zonaRepository.save(z);
        return toResponse(actualizada);
    }

    @Transactional
    public void desactivar(Long idZona) {
        Zona z = obtenerZona(idZona);

        if (Boolean.TRUE.equals(z.getActivo())) {
            z.setActivo(false);
            zonaRepository.save(z);
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

    private Zona obtenerZona(Long idZona) {
        return zonaRepository.findById(idZona)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "Zona no encontrada con id: " + idZona));
    }

    private String normalizarCodigo(String codigo) {
        return codigo != null ? codigo.trim().toUpperCase(Locale.ROOT) : null;
    }

    private String normalizarTexto(String texto) {
        return texto != null ? texto.trim() : null;
    }

    private ZonaResponse toResponse(Zona zona) {
        Proyecto proyecto = zona.getProyecto();
        return new ZonaResponse(
                zona.getIdZona(),
                proyecto != null ? proyecto.getIdProyecto() : null,
                proyecto != null ? proyecto.getCodigo() : null,
                proyecto != null ? proyecto.getNombre() : null,
                zona.getCodigo(),
                zona.getNombre(),
                zona.getDescripcion(),
                zona.getNumeroOrden(),
                zona.getActivo()
        );
    }
}
