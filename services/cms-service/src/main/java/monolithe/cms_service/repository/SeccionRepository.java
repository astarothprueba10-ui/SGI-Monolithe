package monolithe.cms_service.repository;

import jakarta.persistence.LockModeType;
import monolithe.cms_service.entity.Seccion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SeccionRepository extends JpaRepository<Seccion, Long> {

        /** Bloquea las secciones de INICIO para aplicar y capturar el estado coherentemente. */
        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT s FROM Seccion s WHERE s.idPagina = :idPagina "
                        + "ORDER BY s.orden ASC, s.idSeccion ASC")
        List<Seccion> findWithLockByIdPaginaOrderByOrdenAsc(@Param("idPagina") Long idPagina);

        List<Seccion> findByIdPaginaAndVisibleTrueAndActivoTrueOrderByOrdenAsc(Long idPagina);

        Optional<Seccion> findByIdPaginaAndCodigoAndActivoTrue(
                        Long idPagina,
                        String codigo);

        List<Seccion> findByIdPaginaAndActivoTrueOrderByOrdenAsc(
                        Long idPagina);

        List<Seccion> findByIdPaginaOrderByOrdenAsc(
                        Long idPagina);

        boolean existsByIdPaginaAndCodigoAndIdSeccionNot(
                        Long idPagina,
                        String codigo,
                        Long idSeccion);

        boolean existsByIdPaginaAndCodigo(
                        Long idPagina,
                        String codigo);
}