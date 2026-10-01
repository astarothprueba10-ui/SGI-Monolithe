package monolithe.core_service.repository;

import monolithe.core_service.entity.EstadoProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoProyectoRepository extends JpaRepository<EstadoProyecto, Integer> {

    Optional<EstadoProyecto> findByCodigo(String codigo);

    List<EstadoProyecto> findByActivoTrueOrderByOrdenAsc();
}
