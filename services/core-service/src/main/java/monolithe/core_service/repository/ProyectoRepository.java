package monolithe.core_service.repository;

import monolithe.core_service.entity.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

    Optional<Proyecto> findByCodigo(String codigo);

    @Query(value = "SELECT nextval('public.inm_proyectos_codigo_seq')", nativeQuery = true)
    Long nextProjectCodeNumber();

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdProyectoNot(String codigo, Long idProyecto);

    List<Proyecto> findByActivoTrueOrderByNombreAsc();
}
