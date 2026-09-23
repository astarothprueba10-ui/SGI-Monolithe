package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.dto.ProyectoSummaryResponse;
import monolithe.cms_service.entity.Proyecto;
import monolithe.cms_service.repository.ProyectoRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Servicio de negocio para el catálogo de proyectos inmobiliarios en Supabase.
 */
@Service
@RequiredArgsConstructor
public class ProyectoService {

    private final ProyectoRepository proyectoRepository;

    /**
     * Lista todos los proyectos inmobiliarios activos para la web pública.
     */
    public List<ProyectoSummaryResponse> listarProyectosPublicos() {
        return proyectoRepository.findByActivoTrueOrderByNombreAsc()
                .stream()
                .map(this::mapearADto)
                .toList();
    }

    /**
     * Busca un proyecto por su identificador único.
     */
    public Optional<ProyectoSummaryResponse> buscarPorId(Long id) {
        return proyectoRepository.findById(id)
                .filter(Proyecto::getActivo)
                .map(this::mapearADto);
    }

    /**
     * Busca un proyecto por su código comercial único.
     */
    public Optional<ProyectoSummaryResponse> buscarPorCodigo(String codigo) {
        return proyectoRepository.findByCodigoAndActivoTrue(codigo.trim().toUpperCase())
                .map(this::mapearADto);
    }

    private ProyectoSummaryResponse mapearADto(Proyecto p) {
        return ProyectoSummaryResponse.builder()
                .idProyecto(p.getIdProyecto())
                .codigo(p.getCodigo())
                .nombre(p.getNombre())
                .descripcion(p.getDescripcion())
                .direccion(p.getDireccion())
                .ubicacionReferencia(p.getUbicacionReferencia())
                .distrito(p.getDistrito())
                .provincia(p.getProvincia())
                .departamento(p.getDepartamento())
                .areaTotal(p.getAreaTotalM2())
                .latitud(p.getLatitud())
                .longitud(p.getLongitud())
                .activo(p.getActivo())
                .build();
    }
}
