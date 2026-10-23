
package monolithe.core_service.repository;

import monolithe.core_service.entity.Cargo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CargoRepository
        extends JpaRepository<Cargo, Long> {

    List<Cargo> findByArea_IdAreaAndActivoTrueOrderByNombreAsc(
            Long idArea
    );

    Optional<Cargo> findByIdCargoAndActivoTrue(
            Long idCargo
    );

    boolean existsByArea_IdAreaAndCodigoIgnoreCase(
            Long idArea,
            String codigo
    );
}
