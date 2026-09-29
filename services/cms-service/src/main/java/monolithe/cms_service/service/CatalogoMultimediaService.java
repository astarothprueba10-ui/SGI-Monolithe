package monolithe.cms_service.service;

import lombok.RequiredArgsConstructor;
import monolithe.cms_service.entity.TipoMultimedia;
import monolithe.cms_service.entity.UsoMultimedia;
import monolithe.cms_service.exception.ResourceNotFoundException;
import monolithe.cms_service.repository.TipoMultimediaRepository;
import monolithe.cms_service.repository.UsoMultimediaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogoMultimediaService {

    private final TipoMultimediaRepository tipoMultimediaRepository;
    private final UsoMultimediaRepository usoMultimediaRepository;

    public List<TipoMultimedia> listarTiposActivos() {
        return tipoMultimediaRepository
                .findByActivoTrueOrderByOrdenAsc();
    }

    public List<UsoMultimedia> listarUsosActivos() {
        return usoMultimediaRepository
                .findByActivoTrueOrderByOrdenAsc();
    }

    public TipoMultimedia obtenerTipoActivo(
            Integer idTipoMultimedia) {

        return tipoMultimediaRepository
                .findByIdTipoMultimediaAndActivoTrue(
                        idTipoMultimedia
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe un tipo multimedia activo con id: "
                                        + idTipoMultimedia
                        )
                );
    }

    public UsoMultimedia obtenerUsoActivo(
            Integer idUsoMultimedia) {

        return usoMultimediaRepository
                .findByIdUsoMultimediaAndActivoTrue(
                        idUsoMultimedia
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "No existe un uso multimedia activo con id: "
                                        + idUsoMultimedia
                        )
                );
    }
}