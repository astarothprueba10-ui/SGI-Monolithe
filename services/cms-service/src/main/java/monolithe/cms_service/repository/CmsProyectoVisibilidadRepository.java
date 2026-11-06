package monolithe.cms_service.repository;

import jakarta.persistence.LockModeType;
import monolithe.cms_service.entity.CmsProyectoVisibilidad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CmsProyectoVisibilidadRepository extends JpaRepository<CmsProyectoVisibilidad, Long> {
    /** Crea una fila inicialmente oculta si no existe. Bajo la transacción, el ON CONFLICT
     * serializa la primera publicación concurrente del mismo proyecto. */
    @Modifying
    @Query(value = """
            INSERT INTO public.cms_proyectos_visibilidad (id_proyecto, visible_publico)
            VALUES (:idProyecto, FALSE)
            ON CONFLICT (id_proyecto) DO NOTHING
            """, nativeQuery = true)
    void asegurarFilaOculta(@Param("idProyecto") Long idProyecto);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM CmsProyectoVisibilidad v WHERE v.idProyecto = :idProyecto")
    Optional<CmsProyectoVisibilidad> bloquearPorProyecto(@Param("idProyecto") Long idProyecto);
}
