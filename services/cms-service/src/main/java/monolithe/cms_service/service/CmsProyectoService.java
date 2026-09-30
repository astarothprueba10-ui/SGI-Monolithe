package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.CmsProyectoRequest;
import monolithe.cms_service.entity.CmsProyecto;
import monolithe.cms_service.exception.ConflictException;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.CmsProyectoRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CmsProyectoService {

        private final CmsProyectoRepository cmsProyectoRepository;
        private final ProyectoRepository proyectoRepository;
        private final PaginaRepository paginaRepository;

        public List<CmsProyecto> listarActivos() {
                return cmsProyectoRepository
                                .findByActivoTrueOrderByOrdenAsc();
        }

        @Transactional
        public CmsProyecto crear(
                        CmsProyectoRequest request) {

                validarProyectoActivo(request.getIdProyecto());
                validarPaginaActiva(request.getIdPagina());

                if (cmsProyectoRepository.existsByIdProyecto(
                                request.getIdProyecto())) {

                        throw new ConflictException(
                                        "El proyecto ya tiene contenido CMS asociado, activo o inactivo");
                }

                if (cmsProyectoRepository.existsByIdPagina(
                                request.getIdPagina())) {

                        throw new ConflictException(
                                        "La página ya está asociada a contenido CMS, activo o inactivo");
                }

                CmsProyecto cmsProyecto = new CmsProyecto();

                aplicarDatos(cmsProyecto, request);

                cmsProyecto.setActivo(true);

                return cmsProyectoRepository.save(cmsProyecto);
        }

        @Transactional
        public CmsProyecto actualizar(
                        Long idCmsProyecto,
                        CmsProyectoRequest request) {

                CmsProyecto cmsProyecto = obtenerActivo(idCmsProyecto);

                validarProyectoActivo(
                                request.getIdProyecto());

                validarPaginaActiva(
                                request.getIdPagina());

                if (cmsProyectoRepository
                                .existsByIdProyectoAndIdCmsProyectoNot(
                                                request.getIdProyecto(),
                                                idCmsProyecto)) {

                        throw new ConflictException(
                                        "El proyecto ya tiene otro contenido CMS asociado");
                }

                if (cmsProyectoRepository
                                .existsByIdPaginaAndIdCmsProyectoNot(
                                                request.getIdPagina(),
                                                idCmsProyecto)) {

                        throw new ConflictException(
                                        "La página ya está asociada a otro contenido CMS");
                }

                aplicarDatos(
                                cmsProyecto,
                                request);

                return cmsProyectoRepository.save(
                                cmsProyecto);
        }

        @Transactional
        public CmsProyecto cambiarEstado(
                        Long idCmsProyecto,
                        boolean activo) {

                CmsProyecto cmsProyecto = cmsProyectoRepository.findById(idCmsProyecto)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe contenido CMS con id: "
                                                                + idCmsProyecto));

                if (activo) {
                        validarProyectoActivo(
                                        cmsProyecto.getIdProyecto());

                        validarPaginaActiva(
                                        cmsProyecto.getIdPagina());
                }

                cmsProyecto.setActivo(activo);

                return cmsProyectoRepository.save(cmsProyecto);
        }

        private CmsProyecto obtenerActivo(
                        Long idCmsProyecto) {

                return cmsProyectoRepository
                                .findById(idCmsProyecto)
                                .filter(cms -> Boolean.TRUE.equals(cms.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe contenido CMS activo con id: "
                                                                + idCmsProyecto));
        }

        private void validarProyectoActivo(
                        Long idProyecto) {

                proyectoRepository
                                .findById(idProyecto)
                                .filter(proyecto -> Boolean.TRUE.equals(
                                                proyecto.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe un proyecto activo con id: "
                                                                + idProyecto));
        }

        private void validarPaginaActiva(
                        Long idPagina) {

                paginaRepository
                                .findById(idPagina)
                                .filter(pagina -> Boolean.TRUE.equals(
                                                pagina.getActivo()))
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "No existe una página activa con id: "
                                                                + idPagina));
        }

        private void aplicarDatos(
                        CmsProyecto cmsProyecto,
                        CmsProyectoRequest request) {

                cmsProyecto.setIdProyecto(
                                request.getIdProyecto());

                cmsProyecto.setIdPagina(
                                request.getIdPagina());

                cmsProyecto.setNombreComercial(
                                limpiar(request.getNombreComercial()));

                cmsProyecto.setResumenComercial(
                                limpiar(request.getResumenComercial()));

                cmsProyecto.setDescripcionComercial(
                                limpiar(request.getDescripcionComercial()));

                cmsProyecto.setDestacado(
                                Boolean.TRUE.equals(
                                                request.getDestacado()));

                cmsProyecto.setOrden(
                                request.getOrden() != null
                                                ? request.getOrden()
                                                : 0);

                cmsProyecto.setTextoCta(
                                limpiar(request.getTextoCta()));

                cmsProyecto.setUrlCta(
                                limpiar(request.getUrlCta()));
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
}