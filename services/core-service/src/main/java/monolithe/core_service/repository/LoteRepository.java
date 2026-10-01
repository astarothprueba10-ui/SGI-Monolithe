package monolithe.core_service.repository;

import monolithe.core_service.entity.Lote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdLoteNot(
        String codigo,
        Long idLote
    );

    boolean existsByManzana_IdManzanaAndNumero(
        Long idManzana,
        String numero
    );

    boolean existsByManzana_IdManzanaAndNumeroAndIdLoteNot(
        Long idManzana,
        String numero,
        Long idLote
    );

    List<Lote> findByManzana_IdManzanaOrderByNumeroAsc(
        Long idManzana
    );

    List<Lote> findByManzana_IdManzanaAndActivoTrueOrderByNumeroAsc(
        Long idManzana
    );
}
