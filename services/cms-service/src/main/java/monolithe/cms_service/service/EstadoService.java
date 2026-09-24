package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.EstadoConsultaWeb;
import monolithe.cms_service.entity.EstadoProyecto;
import monolithe.cms_service.entity.EstadoPublicacion;
import monolithe.cms_service.repository.EstadoConsultaWebRepository;
import monolithe.cms_service.repository.EstadoProyectoRepository;
import monolithe.cms_service.repository.EstadoPublicacionRepository;
import org.springframework.stereotype.Service;

/**
 * Servicio para resolución y validación de catálogos de estado en Supabase.
 */
@Service
@RequiredArgsConstructor
public class EstadoService {

    private final EstadoConsultaWebRepository estadoConsultaWebRepository;
    private final EstadoPublicacionRepository estadoPublicacionRepository;
    private final EstadoProyectoRepository estadoProyectoRepository;

    public EstadoPublicacion obtenerEstadoPublicacion(String codigo) {
        return estadoPublicacionRepository
                .findByCodigoAndActivoTrue(codigo)
                .orElseThrow(() -> new IllegalStateException("No existe el estado de publicación: " + codigo));
    }

    public EstadoPublicacion obtenerBorrador() {
        return obtenerEstadoPublicacion("BORRADOR");
    }

    public EstadoPublicacion obtenerPublicado() {
        return obtenerEstadoPublicacion("PUBLICADO");
    }

    public EstadoPublicacion obtenerArchivado() {
        return obtenerEstadoPublicacion("ARCHIVADO");
    }

    public EstadoConsultaWeb obtenerEstadoConsultaWeb(String codigo) {
        return estadoConsultaWebRepository
                .findByCodigoAndActivoTrue(codigo)
                .orElseThrow(() -> new IllegalStateException("No existe el estado de consulta web: " + codigo));
    }

    public EstadoConsultaWeb obtenerConsultaNueva() {
        return obtenerEstadoConsultaWeb("NUEVA");
    }

    public EstadoProyecto obtenerEstadoProyecto(String codigo) {
        return estadoProyectoRepository
                .findByCodigoAndActivoTrue(codigo)
                .orElseThrow(() -> new IllegalStateException("No existe el estado de proyecto: " + codigo));
    }

    public EstadoProyecto obtenerProyectoActivo() {
        return obtenerEstadoProyecto("ACTIVO");
    }
}