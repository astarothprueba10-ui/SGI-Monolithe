package monolithe.cms_service.repository;

import monolithe.cms_service.entity.TipoSeccion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoSeccionRepository
        extends JpaRepository<TipoSeccion, Integer> {

    List<TipoSeccion> findByActivoTrueOrderByOrdenAsc();

    Optional<TipoSeccion> findByIdTipoSeccionAndActivoTrue(
            Integer idTipoSeccion
    );

    Optional<TipoSeccion> findByCodigoAndActivoTrue(
            String codigo
    );
}