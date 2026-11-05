package monolithe.core_service.repository;

import monolithe.core_service.dto.LotePrecioVigenteResponse;
import monolithe.core_service.entity.LotePrecio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LotePrecioRepository extends JpaRepository<LotePrecio, Long> {

    List<LotePrecio> findByLote_IdLoteOrderByFechaDesdeDesc(Long idLote);

    List<LotePrecio> findByLote_IdLoteAndActivoTrueOrderByFechaDesdeDesc(Long idLote);

    @Query("""
        SELECT p
        FROM LotePrecio p
        WHERE p.lote.idLote = :idLote
          AND p.moneda.idMoneda = :idMoneda
          AND p.activo = true
          AND p.fechaDesde <= CURRENT_TIMESTAMP
          AND (p.fechaHasta IS NULL OR p.fechaHasta > CURRENT_TIMESTAMP)
    """)
    Optional<LotePrecio> buscarVigente(
            @Param("idLote") Long idLote,
            @Param("idMoneda") Integer idMoneda);

    @Query("""
        SELECT new monolithe.core_service.dto.LotePrecioVigenteResponse(
            p.lote.idLote,
            p.precio,
            p.moneda.nombre,
            p.moneda.codigo,
            p.idLotePrecio
        )
        FROM LotePrecio p
        WHERE p.lote.idProyecto = :idProyecto
          AND p.lote.activo = true
          AND p.moneda.codigo = :codigoMoneda
          AND p.activo = true
          AND p.fechaDesde <= CURRENT_TIMESTAMP
          AND (p.fechaHasta IS NULL OR p.fechaHasta > CURRENT_TIMESTAMP)
    """)
    List<LotePrecioVigenteResponse> buscarVigentesPorProyecto(
            @Param("idProyecto") Long idProyecto,
            @Param("codigoMoneda") String codigoMoneda);

    @Query(value = """
        SELECT COUNT(*)
        FROM ven_reservas r
        JOIN cfg_estados_reserva er ON er.id_estado_reserva = r.id_estado_reserva
        WHERE r.id_lote = :idLote
          AND er.codigo IN ('PENDIENTE', 'VIGENTE')
    """, nativeQuery = true)
    long contarReservasActivas(@Param("idLote") Long idLote);

    @Query(value = """
        SELECT COUNT(*)
        FROM ven_ventas v
        JOIN cfg_estados_venta ev ON ev.id_estado_venta = v.id_estado_venta
        WHERE v.id_lote = :idLote
          AND ev.codigo NOT IN ('ANULADA')
    """, nativeQuery = true)
    long contarVentasActivas(@Param("idLote") Long idLote);
}
