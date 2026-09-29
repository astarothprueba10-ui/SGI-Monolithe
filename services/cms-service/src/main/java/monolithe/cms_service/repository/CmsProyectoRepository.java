package monolithe.cms_service.repository;

import monolithe.cms_service.entity.CmsProyecto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CmsProyectoRepository
        extends JpaRepository<CmsProyecto, Long> {

    List<CmsProyecto> findByActivoTrueOrderByOrdenAsc();

    boolean existsByIdProyecto(Long idProyecto);

    boolean existsByIdPagina(Long idPagina);

    boolean existsByIdProyectoAndIdCmsProyectoNot(
            Long idProyecto,
            Long idCmsProyecto);

    boolean existsByIdPaginaAndIdCmsProyectoNot(
            Long idPagina,
            Long idCmsProyecto);
}