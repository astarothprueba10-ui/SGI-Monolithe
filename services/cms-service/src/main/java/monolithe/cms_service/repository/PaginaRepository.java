package monolithe.cms_service.repository;

import jakarta.persistence.LockModeType;
import monolithe.cms_service.entity.Pagina;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaginaRepository extends JpaRepository<Pagina, Long> {

    /** Serializa las publicaciones de una página, incluso si aún no tiene versión. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pagina p WHERE p.idPagina = :idPagina")
    Optional<Pagina> findWithLockByIdPagina(@Param("idPagina") Long idPagina);

    Optional<Pagina> findByCodigoAndActivoTrue(String codigo);

    Optional<Pagina> findBySlugAndActivoTrue(String slug);

    List<Pagina> findByActivoTrueOrderByOrdenAsc();

    List<Pagina> findByIdEstadoPublicacionAndActivoTrueOrderByOrdenAsc(Integer idEstadoPublicacion);

    Optional<Pagina> findByCodigoAndIdEstadoPublicacionAndActivoTrue(String codigo, Integer idEstadoPublicacion);

    Optional<Pagina> findBySlugAndIdEstadoPublicacionAndActivoTrue(String slug, Integer idEstadoPublicacion);

    boolean existsByCodigo(String codigo);

    boolean existsBySlug(String slug);

    boolean existsByCodigoAndIdPaginaNot(String codigo, Long idPagina);

boolean existsBySlugAndIdPaginaNot(String slug, Long idPagina);
}