
package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoDocumento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoDocumentoRepository
        extends JpaRepository<TipoDocumento, Integer> {

    List<TipoDocumento> findByActivoTrueOrderByNombreAsc();

    Optional<TipoDocumento> findByCodigoIgnoreCaseAndActivoTrue(
            String codigo
    );

    Optional<TipoDocumento> findByIdTipoDocumentoAndActivoTrue(
            Integer idTipoDocumento
    );
}
