package monolithe.core_service.repository;

import monolithe.core_service.entity.LotePrecio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LotePrecioRepository extends JpaRepository<LotePrecio, Long> {

    List<LotePrecio> findByLote_IdLoteOrderByFechaDesdeDesc(
            Long idLote
    );

    List<LotePrecio> findByLote_IdLoteAndActivoTrueOrderByFechaDesdeDesc(
            Long idLote
    );

    @Query("""
        SELECT p
        FROM LotePrecio p
        WHERE p.lote.idLote = :idLote
          AND p.moneda.idMoneda = :idMoneda
          AND p.activo = true
          AND p.fechaHasta IS NULL
    """)
    Optional<LotePrecio> buscarVigente(
            @Param("idLote") Long idLote,
            @Param("idMoneda") Integer idMoneda
    );
}

