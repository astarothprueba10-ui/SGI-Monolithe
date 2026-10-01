package monolithe.core_service.repository;

import monolithe.core_service.entity.EstadoLote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoLoteRepository extends JpaRepository<EstadoLote, Integer> {

    Optional<EstadoLote> findByCodigo(String codigo);

    List<EstadoLote> findByActivoTrueOrderByOrdenAsc();
}
