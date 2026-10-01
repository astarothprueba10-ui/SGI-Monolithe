package monolithe.core_service.repository;

import monolithe.core_service.entity.TipoLote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoLoteRepository extends JpaRepository<TipoLote, Integer> {

    Optional<TipoLote> findByCodigo(String codigo);

    List<TipoLote> findByActivoTrueOrderByOrdenAsc();
}
