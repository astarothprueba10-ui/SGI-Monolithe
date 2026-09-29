package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.MultimediaAsignacionRequest;
import monolithe.cms_service.entity.MultimediaAsignacion;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MultimediaAsignacionService {

    private final MultimediaAsignacionRepository asignacionRepository;
    private final MultimediaRepository multimediaRepository;
    private final PaginaRepository paginaRepository;
    private final SeccionRepository seccionRepository;
    private final SeccionItemRepository seccionItemRepository;
    private final CatalogoMultimediaService catalogoMultimediaService;

    public List<MultimediaAsignacion> listarPorPagina(
            Long idPagina) {

        validarPaginaActiva(idPagina);

        return asignacionRepository
                .findByIdPaginaAndActivoTrueOrderByOrdenAsc(idPagina);
    }

    public List<MultimediaAsignacion> listarPorSeccion(
            Long idSeccion) {

        validarSeccionActiva(idSeccion);

        return asignacionRepository
                .findByIdSeccionAndActivoTrueOrderByOrdenAsc(idSeccion);
    }

    public List<MultimediaAsignacion> listarPorItem(
            Long idSeccionItem) {

        validarItemActivo(idSeccionItem);

        return asignacionRepository
                .findByIdSeccionItemAndActivoTrueOrderByOrdenAsc(
                        idSeccionItem);
    }

    @Transactional
    public MultimediaAsignacion crear(
            MultimediaAsignacionRequest request,
            Long idUsuario) {

        validarSolicitud(request);

        catalogoMultimediaService.obtenerUsoActivo(
                request.getIdUsoMultimedia());

        validarMultimediaActivo(request.getIdMultimedia());
        validarDestino(request);

        validarDuplicado(request, null);

        MultimediaAsignacion asignacion = new MultimediaAsignacion();

        asignacion.setIdUsuarioRegistro(idUsuario);
        asignacion.setActivo(true);

        aplicarDatos(asignacion, request);

        return asignacionRepository.save(asignacion);
    }

    @Transactional
    public MultimediaAsignacion actualizar(
            Long idMultimediaAsignacion,
            MultimediaAsignacionRequest request) {

        MultimediaAsignacion asignacion = obtenerActiva(idMultimediaAsignacion);

        validarSolicitud(request);

        catalogoMultimediaService.obtenerUsoActivo(
                request.getIdUsoMultimedia());

        validarMultimediaActivo(request.getIdMultimedia());
        validarDestino(request);

        validarDuplicado(
                request,
                idMultimediaAsignacion);

        aplicarDatos(asignacion, request);

        return asignacionRepository.save(asignacion);
    }

    @Transactional
    public MultimediaAsignacion cambiarVisibilidad(
            Long idMultimediaAsignacion,
            boolean visible) {

        MultimediaAsignacion asignacion = obtenerActiva(idMultimediaAsignacion);

        asignacion.setVisible(visible);

        return asignacionRepository.save(asignacion);
    }

    @Transactional
    public void eliminar(
            Long idMultimediaAsignacion) {

        MultimediaAsignacion asignacion = obtenerActiva(idMultimediaAsignacion);

        asignacion.setActivo(false);
        asignacion.setVisible(false);

        asignacionRepository.save(asignacion);
    }

    private MultimediaAsignacion obtenerActiva(
            Long idMultimediaAsignacion) {

        return asignacionRepository
                .findById(idMultimediaAsignacion)
                .filter(asignacion -> Boolean.TRUE.equals(
                        asignacion.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe una asignación multimedia activa con id: "
                                + idMultimediaAsignacion));
    }

    private void validarSolicitud(
            MultimediaAsignacionRequest request) {

        int destinos = 0;

        if (request.getIdPagina() != null) {
            destinos++;
        }

        if (request.getIdSeccion() != null) {
            destinos++;
        }

        if (request.getIdSeccionItem() != null) {
            destinos++;
        }

        if (destinos != 1) {
            throw new IllegalArgumentException(
                    "Debe especificarse exactamente un destino: página, sección o ítem");
        }

        if (request.getFechaDesde() != null
                && request.getFechaHasta() != null
                && request.getFechaHasta()
                        .isBefore(request.getFechaDesde())) {

            throw new IllegalArgumentException(
                    "La fecha final no puede ser anterior a la fecha inicial");
        }
    }

    private void validarDestino(
            MultimediaAsignacionRequest request) {

        if (request.getIdPagina() != null) {
            validarPaginaActiva(request.getIdPagina());
            return;
        }

        if (request.getIdSeccion() != null) {
            validarSeccionActiva(request.getIdSeccion());
            return;
        }

        validarItemActivo(request.getIdSeccionItem());
    }

    private void validarPaginaActiva(
            Long idPagina) {

        paginaRepository
                .findById(idPagina)
                .filter(pagina -> Boolean.TRUE.equals(pagina.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe una página activa con id: "
                                + idPagina));
    }

    private void validarSeccionActiva(
            Long idSeccion) {

        seccionRepository
                .findById(idSeccion)
                .filter(seccion -> Boolean.TRUE.equals(seccion.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe una sección activa con id: "
                                + idSeccion));
    }

    private void validarItemActivo(
            Long idSeccionItem) {

        seccionItemRepository
                .findById(idSeccionItem)
                .filter(item -> Boolean.TRUE.equals(item.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe un ítem de sección activo con id: "
                                + idSeccionItem));
    }

    private void validarMultimediaActivo(
            Long idMultimedia) {

        multimediaRepository
                .findById(idMultimedia)
                .filter(multimedia -> Boolean.TRUE.equals(
                        multimedia.getActivo()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No existe un recurso multimedia activo con id: "
                                + idMultimedia));
    }

    private void validarDuplicado(
            MultimediaAsignacionRequest request,
            Long idAsignacionActual) {

        boolean existe;

        if (request.getIdPagina() != null) {

            if (idAsignacionActual == null) {
                existe = asignacionRepository
                        .existsByIdPaginaAndIdMultimediaAndIdUsoMultimedia(
                                request.getIdPagina(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia());
            } else {
                existe = asignacionRepository
                        .existsByIdPaginaAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                                request.getIdPagina(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia(),
                                idAsignacionActual);
            }

        } else if (request.getIdSeccion() != null) {

            if (idAsignacionActual == null) {
                existe = asignacionRepository
                        .existsByIdSeccionAndIdMultimediaAndIdUsoMultimedia(
                                request.getIdSeccion(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia());
            } else {
                existe = asignacionRepository
                        .existsByIdSeccionAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                                request.getIdSeccion(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia(),
                                idAsignacionActual);
            }

        } else {

            if (idAsignacionActual == null) {
                existe = asignacionRepository
                        .existsByIdSeccionItemAndIdMultimediaAndIdUsoMultimedia(
                                request.getIdSeccionItem(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia());
            } else {
                existe = asignacionRepository
                        .existsByIdSeccionItemAndIdMultimediaAndIdUsoMultimediaAndIdMultimediaAsignacionNot(
                                request.getIdSeccionItem(),
                                request.getIdMultimedia(),
                                request.getIdUsoMultimedia(),
                                idAsignacionActual);
            }
        }

        if (existe) {
            throw new ConflictException(
                    "El recurso multimedia ya está asignado a ese destino con el mismo uso");
        }
    }

    private void aplicarDatos(
            MultimediaAsignacion asignacion,
            MultimediaAsignacionRequest request) {

        asignacion.setIdMultimedia(
                request.getIdMultimedia());

        asignacion.setIdUsoMultimedia(
                request.getIdUsoMultimedia());

        asignacion.setIdPagina(
                request.getIdPagina());

        asignacion.setIdSeccion(
                request.getIdSeccion());

        asignacion.setIdSeccionItem(
                request.getIdSeccionItem());

        asignacion.setOrden(
                request.getOrden() != null
                        ? request.getOrden()
                        : 0);

        asignacion.setVisible(
                request.getVisible() == null
                        || request.getVisible());

        asignacion.setFechaDesde(
                request.getFechaDesde());

        asignacion.setFechaHasta(
                request.getFechaHasta());
    }
}