package monolithe.core_service.repository;

import monolithe.core_service.entity.AjusteTipoLote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AjusteTipoLoteRepository extends JpaRepository<AjusteTipoLote, Long> {

        List<AjusteTipoLote> findByProyecto_IdProyectoOrderByFechaDesdeDesc(
                        Long idProyecto);

        List<AjusteTipoLote> findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(
                        Long idProyecto);

        @Query("""
                                SELECT a
                                FROM AjusteTipoLote a
                                WHERE a.proyecto.idProyecto = :idProyecto
                                  AND a.tipoLote.idTipoLote = :idTipoLote
                                  AND a.tipoAjustePrecio.idTipoAjustePrecio = :idTipoAjustePrecio
                                  AND a.moneda.idMoneda = :idMoneda
                                  AND a.activo = true
                        AND a.fechaDesde <= CURRENT_TIMESTAMP
                        AND (
                            a.fechaHasta IS NULL
                            OR a.fechaHasta > CURRENT_TIMESTAMP
                        )
                            """)
        Optional<AjusteTipoLote> buscarVigente(
                        @Param("idProyecto") Long idProyecto,
                        @Param("idTipoLote") Integer idTipoLote,
                        @Param("idTipoAjustePrecio") Integer idTipoAjustePrecio,
                        @Param("idMoneda") Integer idMoneda);

        @Query("""
                                                    SELECT a
                                                    FROM AjusteTipoLote a
                                                    WHERE a.proyecto.idProyecto = :idProyecto
                                                      AND a.tipoLote.idTipoLote = :idTipoLote
                                                      AND a.tipoAjustePrecio.idTipoAjustePrecio = :idTipoAjustePrecio
                                                      AND a.moneda IS NULL
                                                      AND a.activo = true
                        AND a.fechaDesde <= CURRENT_TIMESTAMP
                        AND (
                            a.fechaHasta IS NULL
                            OR a.fechaHasta > CURRENT_TIMESTAMP
                        )
                                                """)
        Optional<AjusteTipoLote> buscarVigenteSinMoneda(
                        @Param("idProyecto") Long idProyecto,
                        @Param("idTipoLote") Integer idTipoLote,
                        @Param("idTipoAjustePrecio") Integer idTipoAjustePrecio);
}
