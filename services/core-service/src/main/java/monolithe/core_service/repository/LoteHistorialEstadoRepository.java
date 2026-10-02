package monolithe.core_service.repository;

import monolithe.core_service.entity.LoteHistorialEstado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoteHistorialEstadoRepository
        extends JpaRepository<LoteHistorialEstado, Long> {

    List<LoteHistorialEstado>
    findByLote_IdLoteOrderByFechaCambioDesc(
            Long idLote
    );
}