
package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoVinculoLaboral;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoVinculoLaboralRepository
        extends JpaRepository<TipoVinculoLaboral, Integer> {

    List<TipoVinculoLaboral> findByActivoTrueOrderByNombreAsc();

    Optional<TipoVinculoLaboral> findByCodigoIgnoreCaseAndActivoTrue(
            String codigo
    );
}
