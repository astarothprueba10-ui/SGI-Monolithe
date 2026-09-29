package monolithe.cms_service.repository;

import monolithe.cms_service.entity.UsoMultimedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsoMultimediaRepository
        extends JpaRepository<UsoMultimedia, Integer> {

    List<UsoMultimedia> findByActivoTrueOrderByOrdenAsc();

    Optional<UsoMultimedia> findByIdUsoMultimediaAndActivoTrue(
            Integer idUsoMultimedia
    );
}