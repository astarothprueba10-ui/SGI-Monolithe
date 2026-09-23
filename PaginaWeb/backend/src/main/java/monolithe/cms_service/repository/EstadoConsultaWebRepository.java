package monolithe.cms_service.repository;

import monolithe.cms_service.entity.EstadoConsultaWeb;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoConsultaWebRepository extends JpaRepository<EstadoConsultaWeb, Integer> {
    Optional<EstadoConsultaWeb> findByCodigoAndActivoTrue(String codigo);
}
