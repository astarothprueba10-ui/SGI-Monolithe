package monolithe.core_service.repository;

import monolithe.core_service.entity.EstadoManzana;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoManzanaRepository extends JpaRepository<EstadoManzana, Integer> {

    Optional<EstadoManzana> findByCodigo(String codigo);

    List<EstadoManzana> findByActivoTrueOrderByOrdenAsc();
}
