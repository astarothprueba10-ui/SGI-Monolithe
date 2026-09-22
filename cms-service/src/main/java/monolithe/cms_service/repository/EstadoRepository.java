package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Estado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EstadoRepository extends JpaRepository<Estado, Short> {

    Optional<Estado> findByEntidadAndCodigoAndActivoTrue(
            String entidad,
            String codigo
    );
}