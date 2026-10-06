package monolithe.core_service.repository;

import monolithe.core_service.entity.Manzana;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ManzanaRepository extends JpaRepository<Manzana, Long> {

    boolean existsByEtapa_IdEtapaAndCodigo(
        Long idEtapa,
        String codigo
    );

    boolean existsByEtapa_IdEtapaAndCodigoAndIdManzanaNot(
        Long idEtapa,
        String codigo,
        Long idManzana
    );

    List<Manzana> findByEtapa_IdEtapaOrderByNumeroOrdenAsc(
        Long idEtapa
    );

    List<Manzana> findByEtapa_IdEtapaAndActivoTrueOrderByNumeroOrdenAsc(
        Long idEtapa
    );

    boolean existsByEtapa_IdEtapaAndActivoTrue(Long idEtapa);
    boolean existsByEtapa_Proyecto_IdProyectoAndActivoTrue(Long idProyecto);
}
