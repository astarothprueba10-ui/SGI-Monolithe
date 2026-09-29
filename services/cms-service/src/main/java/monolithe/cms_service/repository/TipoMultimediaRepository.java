package monolithe.cms_service.repository;

import monolithe.cms_service.entity.TipoMultimedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoMultimediaRepository
        extends JpaRepository<TipoMultimedia, Integer> {

    List<TipoMultimedia> findByActivoTrueOrderByOrdenAsc();

    Optional<TipoMultimedia> findByIdTipoMultimediaAndActivoTrue(
            Integer idTipoMultimedia
    );
}