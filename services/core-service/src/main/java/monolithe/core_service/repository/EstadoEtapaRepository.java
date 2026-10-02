package monolithe.core_service.repository;

import monolithe.core_service.entity.EstadoEtapa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoEtapaRepository extends JpaRepository<EstadoEtapa, Integer> {

    Optional<EstadoEtapa> findByCodigo(String codigo);

    List<EstadoEtapa> findByActivoTrueOrderByOrdenAsc();
}
