package monolithe.cms_service.repository;

import monolithe.cms_service.entity.CmsPublicacionHistorial;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso mínimo al historial inmutable de la migración 36.
 * No expone delete ni operaciones de actualización; el INSERT real requerirá
 * permisos SQL, validaciones y una transacción de publicación todavía pendiente.
 */
public interface CmsPublicacionHistorialRepository extends Repository<CmsPublicacionHistorial, Long> {

    CmsPublicacionHistorial save(CmsPublicacionHistorial nuevaPublicacion);

    Optional<CmsPublicacionHistorial> findById(Long idHistorial);

    Optional<CmsPublicacionHistorial> findByIdBorrador(Long idBorrador);

    Optional<CmsPublicacionHistorial> findByIdPaginaAndRevisionNueva(Long idPagina, Long revisionNueva);

    List<CmsPublicacionHistorial> findByIdPaginaOrderByRevisionNuevaDesc(Long idPagina, Pageable pagina);
}
