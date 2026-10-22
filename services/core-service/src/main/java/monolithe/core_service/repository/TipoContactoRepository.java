
package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoContacto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TipoContactoRepository
        extends JpaRepository<TipoContacto, Integer> {

    Optional<TipoContacto> findByCodigoIgnoreCaseAndActivoTrue(
            String codigo
    );
}
