package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.Estado;
import monolithe.cms_service.repository.EstadoRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EstadoService {

    private static final String ENTIDAD_PUBLICACION = "PUBLICACION";

    private final EstadoRepository estadoRepository;

    public Estado obtenerEstadoPublicacion(String codigo) {
        return estadoRepository
                .findByEntidadAndCodigoAndActivoTrue(
                        ENTIDAD_PUBLICACION,
                        codigo
                )
                .orElseThrow(() ->
                        new IllegalStateException(
                                "No existe el estado de publicación: " + codigo
                        )
                );
    }

    public Estado obtenerBorrador() {
        return obtenerEstadoPublicacion("BORRADOR");
    }

    public Estado obtenerPublicado() {
        return obtenerEstadoPublicacion("PUBLICADO");
    }

    public Estado obtenerArchivado() {
        return obtenerEstadoPublicacion("ARCHIVADO");
    }
}