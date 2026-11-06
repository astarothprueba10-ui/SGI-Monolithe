package monolithe.cms_service.repository;

import monolithe.cms_service.entity.Proyecto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProyectoRepository extends JpaRepository<Proyecto, Long> {

    List<Proyecto> findByActivoTrueOrderByNombreAsc();

    List<Proyecto> findByIdEstadoProyectoAndActivoTrueOrderByNombreAsc(Integer idEstadoProyecto);

    Optional<Proyecto> findByCodigoAndActivoTrue(String codigo);

    /** Visibilidad pública independiente de la página CMS individual. */
    @Query(value = """
            SELECT p.* FROM public.inm_proyectos p
            JOIN public.cms_proyectos_visibilidad v ON v.id_proyecto = p.id_proyecto
            WHERE p.activo = TRUE AND v.visible_publico = TRUE
            ORDER BY p.nombre ASC
            """, nativeQuery = true)
    List<Proyecto> listarProyectosPublicos();

    @Query(value = """
            SELECT p.* FROM public.inm_proyectos p
            JOIN public.cms_proyectos_visibilidad v ON v.id_proyecto = p.id_proyecto
            WHERE p.activo = TRUE AND v.visible_publico = TRUE
              AND p.id_proyecto = :idProyecto
            """, nativeQuery = true)
    Optional<Proyecto> buscarProyectoPublicoPorId(@Param("idProyecto") Long idProyecto);

    @Query(value = """
            SELECT p.* FROM public.inm_proyectos p
            JOIN public.cms_proyectos_visibilidad v ON v.id_proyecto = p.id_proyecto
            WHERE p.activo = TRUE AND v.visible_publico = TRUE
              AND p.codigo = :codigo
            """, nativeQuery = true)
    Optional<Proyecto> buscarProyectoPublicoPorCodigo(@Param("codigo") String codigo);
}
