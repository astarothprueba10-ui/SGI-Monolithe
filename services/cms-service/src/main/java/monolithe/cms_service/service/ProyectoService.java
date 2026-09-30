package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ProyectoSummaryResponse;
import monolithe.cms_service.entity.CmsProyecto;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.repository.CmsProyectoRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProyectoService {

    private final ProyectoRepository proyectoRepository;
    private final CmsProyectoRepository cmsProyectoRepository;
    private final PaginaRepository paginaRepository;
    private final EstadoService estadoService;

    /**
     * Lista únicamente proyectos que:
     * - están activos en inm_proyectos
     * - tienen configuración CMS activa
     * - tienen una página CMS activa y publicada
     */
    @Transactional(readOnly = true)
    public List<ProyectoSummaryResponse> listarProyectosPublicos() {

        Integer idEstadoPublicado = estadoService
                .obtenerPublicado()
                .getIdEstadoPublicacion();

        return cmsProyectoRepository
                .findByActivoTrueOrderByOrdenAsc()
                .stream()
                .map(cmsProyecto -> construirProyectoPublico(
                        cmsProyecto,
                        idEstadoPublicado))
                .filter(optional -> optional.isPresent())
                .map(optional -> optional.get())
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ProyectoSummaryResponse> buscarPorId(
            Long idProyecto) {

        Integer idEstadoPublicado = estadoService
                .obtenerPublicado()
                .getIdEstadoPublicacion();

        return cmsProyectoRepository
                .findByIdProyectoAndActivoTrue(idProyecto)
                .flatMap(cmsProyecto -> construirProyectoPublico(
                        cmsProyecto,
                        idEstadoPublicado));
    }

    @Transactional(readOnly = true)
    public Optional<ProyectoSummaryResponse> buscarPorCodigo(
            String codigo) {

        Integer idEstadoPublicado = estadoService
                .obtenerPublicado()
                .getIdEstadoPublicacion();

        return proyectoRepository
                .findByCodigoAndActivoTrue(
                        codigo.trim().toUpperCase())
                .flatMap(proyecto -> cmsProyectoRepository
                        .findByIdProyectoAndActivoTrue(
                                proyecto.getIdProyecto())
                        .flatMap(cmsProyecto -> construirProyectoPublico(
                                cmsProyecto,
                                idEstadoPublicado)));
    }

    private Optional<ProyectoSummaryResponse> construirProyectoPublico(
            CmsProyecto cmsProyecto,
            Integer idEstadoPublicado) {

        Optional<Proyecto> proyectoOptional = proyectoRepository
                .findById(
                        cmsProyecto.getIdProyecto())
                .filter(proyecto -> Boolean.TRUE.equals(
                        proyecto.getActivo()));

        if (proyectoOptional.isEmpty()) {
            return Optional.empty();
        }

        Optional<Pagina> paginaOptional = paginaRepository
                .findById(
                        cmsProyecto.getIdPagina())
                .filter(pagina -> Boolean.TRUE.equals(
                        pagina.getActivo()))
                .filter(pagina -> idEstadoPublicado.equals(
                        pagina.getIdEstadoPublicacion()));

        if (paginaOptional.isEmpty()) {
            return Optional.empty();
        }

        return Optional.of(
                mapearADto(
                        proyectoOptional.get(),
                        cmsProyecto,
                        paginaOptional.get()));
    }

    private ProyectoSummaryResponse mapearADto(
            Proyecto proyecto,
            CmsProyecto cmsProyecto,
            Pagina pagina) {

        return ProyectoSummaryResponse.builder()

                .idProyecto(
                        proyecto.getIdProyecto())
                .codigo(
                        proyecto.getCodigo())
                .nombre(
                        proyecto.getNombre())
                .descripcion(
                        proyecto.getDescripcion())
                .direccion(
                        proyecto.getDireccion())
                .ubicacionReferencia(
                        proyecto.getUbicacionReferencia())
                .distrito(
                        proyecto.getDistrito())
                .provincia(
                        proyecto.getProvincia())
                .departamento(
                        proyecto.getDepartamento())
                .areaTotal(
                        proyecto.getAreaTotalM2())
                .latitud(
                        proyecto.getLatitud())
                .longitud(
                        proyecto.getLongitud())
                .activo(
                        proyecto.getActivo())

                .idCmsProyecto(
                        cmsProyecto.getIdCmsProyecto())
                .idPagina(
                        cmsProyecto.getIdPagina())
                .nombreComercial(
                        cmsProyecto.getNombreComercial())
                .resumenComercial(
                        cmsProyecto.getResumenComercial())
                .descripcionComercial(
                        cmsProyecto.getDescripcionComercial())
                .destacado(
                        cmsProyecto.getDestacado())
                .orden(
                        cmsProyecto.getOrden())
                .textoCta(
                        cmsProyecto.getTextoCta())
                .urlCta(
                        cmsProyecto.getUrlCta())

                .paginaCodigo(
                        pagina.getCodigo())
                .paginaSlug(
                        pagina.getSlug())

                .build();
    }
}