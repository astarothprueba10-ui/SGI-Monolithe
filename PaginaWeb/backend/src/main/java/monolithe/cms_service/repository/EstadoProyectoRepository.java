package monolithe.cms_service.repository;

import monolithe.cms_service.entity.EstadoProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoProyectoRepository extends JpaRepository<EstadoProyecto, Integer> {
    Optional<EstadoProyecto> findByCodigoAndActivoTrue(String codigo);
}
