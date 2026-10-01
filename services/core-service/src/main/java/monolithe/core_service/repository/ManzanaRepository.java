package monolithe.core_service.repository;

import monolithe.core_service.entity.Manzana;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManzanaRepository extends JpaRepository<Manzana, Long> {

    boolean existsByEtapa_IdEtapaAndCodigo(
        Long idEtapa,
        String codigo
    );

    List<Manzana> findByEtapa_IdEtapaAndActivoTrueOrderByNumeroOrdenAsc(
        Long idEtapa
    );
}
