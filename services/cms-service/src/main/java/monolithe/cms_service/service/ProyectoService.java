package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ProyectoSummaryResponse;
import monolithe.cms_service.entity.Pagina;
import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.repository.CmsProyectoRepository;
import monolithe.cms_service.repository.PaginaRepository;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProyectoService {

    private final ProyectoRepository proyectoRepository;
    private final CmsProyectoRepository cmsProyectoRepository;
    private final PaginaRepository paginaRepository;
    private final EstadoService estadoService;

    /**
     * La fuente de verdad de visibilidad es cms_proyectos_visibilidad.
     * Los datos oficiales siguen procediendo de inm_proyectos.
     */
    @Transactional(readOnly = true)
    public List<ProyectoSummaryResponse> listarProyectosPublicos() {
        return proyectoRepository.listarProyectosPublicos().stream()
                .map(this::mapearADto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ProyectoSummaryResponse> buscarPorId(Long idProyecto) {
        return proyectoRepository.buscarProyectoPublicoPorId(idProyecto)
                .map(this::mapearADto);
    }

    @Transactional(readOnly = true)
    public Optional<ProyectoSummaryResponse> buscarPorCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            return Optional.empty();
        }
        return proyectoRepository.buscarProyectoPublicoPorCodigo(
                        codigo.trim().toUpperCase(Locale.ROOT))
                .map(this::mapearADto);
    }

    private ProyectoSummaryResponse mapearADto(Proyecto proyecto) {
        ProyectoSummaryResponse.ProyectoSummaryResponseBuilder builder =
                ProyectoSummaryResponse.builder()
                        .idProyecto(proyecto.getIdProyecto())
                        .codigo(proyecto.getCodigo())
                        .nombre(proyecto.getNombre())
                        .descripcion(proyecto.getDescripcion())
                        .direccion(proyecto.getDireccion())
                        .ubicacionReferencia(proyecto.getUbicacionReferencia())
                        .distrito(proyecto.getDistrito())
                        .provincia(proyecto.getProvincia())
                        .departamento(proyecto.getDepartamento())
                        .areaTotal(proyecto.getAreaTotalM2())
                        .latitud(proyecto.getLatitud())
                        .longitud(proyecto.getLongitud())
                        .activo(proyecto.getActivo());

        // Conserva la presentación CMS existente si tiene página publicada.
        // Su ausencia no impide la visibilidad del proyecto oficial.
        cmsProyectoRepository.findByIdProyectoAndActivoTrue(proyecto.getIdProyecto())
                .ifPresent(cms -> {
                    Integer publicado = estadoService.obtenerPublicado().getIdEstadoPublicacion();
                    paginaRepository.findById(cms.getIdPagina())
                            .filter(pagina -> Boolean.TRUE.equals(pagina.getActivo()))
                            .filter(pagina -> publicado.equals(pagina.getIdEstadoPublicacion()))
                            .ifPresent(pagina -> completarPresentacion(builder, cms, pagina));
                });

        return builder.build();
    }

    private void completarPresentacion(
            ProyectoSummaryResponse.ProyectoSummaryResponseBuilder builder,
            monolithe.cms_service.entity.CmsProyecto cms,
            Pagina pagina) {
        builder.idCmsProyecto(cms.getIdCmsProyecto())
                .idPagina(cms.getIdPagina())
                .nombreComercial(cms.getNombreComercial())
                .resumenComercial(cms.getResumenComercial())
                .descripcionComercial(cms.getDescripcionComercial())
                .destacado(cms.getDestacado())
                .orden(cms.getOrden())
                .textoCta(cms.getTextoCta())
                .urlCta(cms.getUrlCta())
                .paginaCodigo(pagina.getCodigo())
                .paginaSlug(pagina.getSlug());
    }
}
