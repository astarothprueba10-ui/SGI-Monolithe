package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Pagina;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaginaRepository extends JpaRepository<Pagina, Long> {

    Optional<Pagina> findByCodigoAndActivoTrue(String codigo);

    Optional<Pagina> findByRutaAndActivoTrue(String ruta);

    List<Pagina> findByActivoTrueOrderByOrdenAsc();

    List<Pagina> findByIdEstadoAndActivoTrueOrderByOrdenAsc(
            Short idEstado
    );

    Optional<Pagina> findByCodigoAndIdEstadoAndActivoTrue(
            String codigo,
            Short idEstado
    );

    Optional<Pagina> findByRutaAndIdEstadoAndActivoTrue(
            String ruta,
            Short idEstado
    );

    boolean existsByCodigo(String codigo);

    boolean existsByRuta(String ruta);
}