package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Pagina;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaginaRepository extends JpaRepository<Pagina, Long> {

    Optional<Pagina> findByCodigoAndActivoTrue(String codigo);

    Optional<Pagina> findBySlugAndActivoTrue(String slug);

    List<Pagina> findByActivoTrueOrderByOrdenAsc();

    List<Pagina> findByIdEstadoPublicacionAndActivoTrueOrderByOrdenAsc(Integer idEstadoPublicacion);

    Optional<Pagina> findByCodigoAndIdEstadoPublicacionAndActivoTrue(String codigo, Integer idEstadoPublicacion);

    Optional<Pagina> findBySlugAndIdEstadoPublicacionAndActivoTrue(String slug, Integer idEstadoPublicacion);

    boolean existsByCodigo(String codigo);

    boolean existsBySlug(String slug);
}