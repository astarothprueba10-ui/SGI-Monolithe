package monolithe.core_service.repository;

import monolithe.core_service.entity.LotePrecio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LotePrecioRepository extends JpaRepository<LotePrecio, Long> {

    List<LotePrecio> findByLote_IdLoteOrderByFechaDesdeDesc(
            Long idLote
    );

    List<LotePrecio> findByLote_IdLoteAndActivoTrueOrderByFechaDesdeDesc(
            Long idLote
    );
}
