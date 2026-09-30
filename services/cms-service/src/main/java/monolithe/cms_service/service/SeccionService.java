package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.SeccionRequest;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Seccion;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.SeccionRepository;
import monolithe.cms_service.repository.TipoSeccionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SeccionService {

        private final SeccionRepository seccionRepository;
        private final PaginaRepository paginaRepository;
        private final TipoSeccionRepository tipoSeccionRepository;

        public List<Seccion> listarPorPagina(
                        Long idPagina,
                        boolean incluirInactivos) {

                validarPaginaActiva(idPagina);

                if (incluirInactivos) {
                        return seccionRepository
                                        .findByIdPaginaOrderByOrdenAsc(idPagina);
                }

                return seccionRepository
                                .findByIdPaginaAndActivoTrueOrderByOrdenAsc(
                                                idPagina);
        }

        @Transactional
        public Seccion crearSeccion(
                        Long idPagina,
                        SeccionRequest request,
                        Long idUsuario) {

                validarPaginaActiva(idPagina);

                validarTipoSeccionActivo(
                                request.getIdTipoSeccion());

                String codigo = normalizarCodigo(request.getCodigo());

                if (seccionRepository
                                .existsByIdPaginaAndCodigo(
                                                idPagina,
                                                codigo)) {

                        throw new ConflictException(
                                        "Ya existe una sección con el código: "
                                                        + codigo
                                                        + " en esta página, aunque esté inactiva");
                }

                validarFechas(request);

                Seccion seccion = new Seccion();

                seccion.setIdPagina(idPagina);
                seccion.setIdTipoSeccion(request.getIdTipoSeccion());
                seccion.setCodigo(codigo);
                seccion.setTitulo(limpiar(request.getTitulo()));
                seccion.setSubtitulo(limpiar(request.getSubtitulo()));
                seccion.setContenido(limpiar(request.getContenido()));
                seccion.setConfiguracion(request.getConfiguracion());

                seccion.setOrden(
                                request.getOrden() != null
                                                ? request.getOrden()
                                                : 0);

                seccion.setVisible(
                                request.getVisible() == null
                                                || request.getVisible());

                seccion.setFechaDesde(request.getFechaDesde());
                seccion.setFechaHasta(request.getFechaHasta());

                seccion.setIdUsuarioRegistro(idUsuario);
                seccion.setActivo(true);

                return seccionRepository.save(seccion);
        }

        @Transactional
        public Seccion actualizarSeccion(
                        Long idSeccion,
                        SeccionRequest request) {

                Seccion seccion = seccionRepository
                                .findById(idSeccion)
                                .filter(s -> Boolean.TRUE.equals(s.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una sección activa con id: "
                                                                + idSeccion));

                validarPaginaActiva(seccion.getIdPagina());
                validarTipoSeccionActivo(
                                request.getIdTipoSeccion());

                String codigo = normalizarCodigo(request.getCodigo());

                if (seccionRepository
                                .existsByIdPaginaAndCodigoAndIdSeccionNot(
                                                seccion.getIdPagina(),
                                                codigo,
                                                idSeccion)) {

                        throw new ConflictException(
                                        "Ya existe otra sección con el código: "
                                                        + codigo);
                }

                validarFechas(request);

                seccion.setIdTipoSeccion(request.getIdTipoSeccion());
                seccion.setCodigo(codigo);
                seccion.setTitulo(limpiar(request.getTitulo()));
                seccion.setSubtitulo(limpiar(request.getSubtitulo()));
                seccion.setContenido(limpiar(request.getContenido()));
                seccion.setConfiguracion(request.getConfiguracion());

                seccion.setOrden(
                                request.getOrden() != null
                                                ? request.getOrden()
                                                : 0);

                seccion.setVisible(
                                request.getVisible() == null
                                                || request.getVisible());

                seccion.setFechaDesde(request.getFechaDesde());
                seccion.setFechaHasta(request.getFechaHasta());

                return seccionRepository.save(seccion);
        }

        @Transactional
        public Seccion cambiarVisibilidad(
                        Long idSeccion,
                        boolean visible) {

                Seccion seccion = seccionRepository
                                .findById(idSeccion)
                                .filter(s -> Boolean.TRUE.equals(s.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una sección activa con id: "
                                                                + idSeccion));

                seccion.setVisible(visible);

                return seccionRepository.save(seccion);
        }

        @Transactional
        public void eliminarSeccion(
                        Long idSeccion) {

                Seccion seccion = seccionRepository
                                .findById(idSeccion)
                                .filter(s -> Boolean.TRUE.equals(s.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una sección activa con id: "
                                                                + idSeccion));

                seccion.setActivo(false);
                seccion.setVisible(false);

                seccionRepository.save(seccion);
        }

        private Pagina validarPaginaActiva(Long idPagina) {

                return paginaRepository
                                .findById(idPagina)
                                .filter(p -> Boolean.TRUE.equals(p.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una página activa con id: "
                                                                + idPagina));
        }

        private void validarFechas(SeccionRequest request) {

                if (request.getFechaDesde() != null
                                && request.getFechaHasta() != null
                                && request.getFechaHasta()
                                                .isBefore(request.getFechaDesde())) {

                        throw new IllegalArgumentException(
                                        "La fecha final no puede ser anterior a la fecha inicial");
                }
        }

        private void validarTipoSeccionActivo(
                        Integer idTipoSeccion) {

                tipoSeccionRepository
                                .findByIdTipoSeccionAndActivoTrue(
                                                idTipoSeccion)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe un tipo de sección activo con id: "
                                                                + idTipoSeccion));
        }

        private String normalizarCodigo(String codigo) {
                return codigo.trim().toUpperCase();
        }

        private String limpiar(String valor) {

                if (valor == null) {
                        return null;
                }

                String resultado = valor.trim();

                return resultado.isEmpty()
                                ? null
                                : resultado;
        }

        @Transactional
        public Seccion cambiarEstado(
                        Long idSeccion,
                        boolean activo) {

                Seccion seccion = seccionRepository
                                .findById(idSeccion)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una sección con id: "
                                                                + idSeccion));

                if (activo) {
                        validarPaginaActiva(
                                        seccion.getIdPagina());

                        validarTipoSeccionActivo(
                                        seccion.getIdTipoSeccion());

                        seccion.setActivo(true);
                        seccion.setVisible(true);

                } else {
                        seccion.setActivo(false);
                        seccion.setVisible(false);
                }

                return seccionRepository.save(seccion);
        }
}