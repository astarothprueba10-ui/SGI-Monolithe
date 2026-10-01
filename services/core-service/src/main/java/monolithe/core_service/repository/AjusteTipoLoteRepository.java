package monolithe.core_service.repository;

import monolithe.core_service.entity.AjusteTipoLote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AjusteTipoLoteRepository extends JpaRepository<AjusteTipoLote, Long> {

    List<AjusteTipoLote> findByProyecto_IdProyectoOrderByFechaDesdeDesc(
            Long idProyecto
    );

    List<AjusteTipoLote> findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(
            Long idProyecto
    );

    @Query("""
        SELECT a
        FROM AjusteTipoLote a
        WHERE a.proyecto.idProyecto = :idProyecto
          AND a.tipoLote.idTipoLote = :idTipoLote
          AND a.tipoAjustePrecio.idTipoAjustePrecio = :idTipoAjustePrecio
          AND (
                a.moneda.idMoneda = :idMoneda
                OR (a.moneda IS NULL AND :idMoneda IS NULL)
              )
          AND a.activo = true
          AND a.fechaHasta IS NULL
    """)
    Optional<AjusteTipoLote> buscarVigente(
            @Param("idProyecto") Long idProyecto,
            @Param("idTipoLote") Integer idTipoLote,
            @Param("idTipoAjustePrecio") Integer idTipoAjustePrecio,
            @Param("idMoneda") Integer idMoneda
    );
}

