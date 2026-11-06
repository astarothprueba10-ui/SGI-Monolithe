package monolithe.cms_service.repository;

import jakarta.persistence.LockModeType;
import monolithe.cms_service.entity.CmsPublicacionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CmsPublicacionVersionRepository extends JpaRepository<CmsPublicacionVersion, Long> {

    /** Se obtiene después de bloquear la página, dentro de la misma transacción. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM CmsPublicacionVersion v WHERE v.idPagina = :idPagina")
    Optional<CmsPublicacionVersion> findWithLockByIdPagina(@Param("idPagina") Long idPagina);

    Optional<CmsPublicacionVersion> findByIdPagina(Long idPagina);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM CmsPublicacionVersion v WHERE v.idProyecto = :idProyecto")
    Optional<CmsPublicacionVersion> findWithLockByIdProyecto(@Param("idProyecto") Long idProyecto);

    Optional<CmsPublicacionVersion> findByIdProyecto(Long idProyecto);
}
