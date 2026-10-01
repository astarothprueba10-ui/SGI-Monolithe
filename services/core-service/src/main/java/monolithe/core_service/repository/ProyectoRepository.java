package monolithe.core_service.repository;

import monolithe.core_service.entity.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

    Optional<Proyecto> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);

    List<Proyecto> findByActivoTrueOrderByNombreAsc();
}
