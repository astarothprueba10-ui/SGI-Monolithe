
package monolithe.core_service.repository;

import monolithe.core_service.entity.EstadoTrabajador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoTrabajadorRepository
        extends JpaRepository<EstadoTrabajador, Integer> {

    List<EstadoTrabajador> findByActivoTrueOrderByNombreAsc();

    Optional<EstadoTrabajador> findByCodigoIgnoreCaseAndActivoTrue(
            String codigo
    );
}
