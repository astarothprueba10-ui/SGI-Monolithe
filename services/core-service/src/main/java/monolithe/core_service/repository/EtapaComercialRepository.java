package monolithe.core_service.repository;

import monolithe.core_service.entity.EtapaComercial;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EtapaComercialRepository extends JpaRepository<EtapaComercial, Long> {

    boolean existsByProyecto_IdProyectoAndCodigo(
            Long idProyecto,
            String codigo
    );

    boolean existsByProyecto_IdProyectoAndCodigoAndIdEtapaComercialNot(
            Long idProyecto,
            String codigo,
            Long idEtapaComercial
    );

    List<EtapaComercial> findByProyecto_IdProyectoOrderByNumeroOrdenAsc(
            Long idProyecto
    );

    List<EtapaComercial> findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(
            Long idProyecto
    );
}
