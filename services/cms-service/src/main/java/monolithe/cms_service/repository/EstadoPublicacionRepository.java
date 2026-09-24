package monolithe.cms_service.repository;

import monolithe.cms_service.entity.EstadoPublicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoPublicacionRepository extends JpaRepository<EstadoPublicacion, Integer> {
    Optional<EstadoPublicacion> findByCodigoAndActivoTrue(String codigo);
}
