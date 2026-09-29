package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Multimedia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MultimediaRepository
        extends JpaRepository<Multimedia, Long> {

    List<Multimedia> findByActivoTrueOrderByFechaCreacionDesc();

    Optional<Multimedia> findByCodigoAndActivoTrue(
            String codigo
    );

    boolean existsByCodigo(
            String codigo
    );

    boolean existsByCodigoAndIdMultimediaNot(
            String codigo,
            Long idMultimedia
    );
}