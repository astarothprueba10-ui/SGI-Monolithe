package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Seccion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SeccionRepository extends JpaRepository<Seccion, Long> {

    List<Seccion> findByIdPaginaAndVisibleTrueAndActivoTrueOrderByOrdenAsc(Long idPagina);

    Optional<Seccion> findByIdPaginaAndCodigoAndActivoTrue(Long idPagina, String codigo);
}
