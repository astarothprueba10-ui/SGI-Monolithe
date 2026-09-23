package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

    List<Proyecto> findByActivoTrueOrderByNombreAsc();

    List<Proyecto> findByIdEstadoProyectoAndActivoTrueOrderByNombreAsc(Integer idEstadoProyecto);

    Optional<Proyecto> findByCodigoAndActivoTrue(String codigo);
}
