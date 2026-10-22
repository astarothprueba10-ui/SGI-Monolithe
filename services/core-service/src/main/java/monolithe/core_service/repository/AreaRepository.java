
package monolithe.core_service.repository;

import monolithe.core_service.entity.Area;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AreaRepository
        extends JpaRepository<Area, Long> {

    List<Area> findByActivoTrueOrderByNombreAsc();

    Optional<Area> findByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCase(String codigo);
}
