package monolithe.core_service.repository;

import monolithe.core_service.entity.Etapa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EtapaRepository extends JpaRepository<Etapa, Long> {

    boolean existsByProyecto_IdProyectoAndCodigo(
        Long idProyecto,
        String codigo
    );

    boolean existsByProyecto_IdProyectoAndCodigoAndIdEtapaNot(
        Long idProyecto,
        String codigo,
        Long idEtapa
    );

    List<Etapa> findByProyecto_IdProyectoOrderByNumeroOrdenAsc(
        Long idProyecto
    );

    List<Etapa> findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(
        Long idProyecto
    );
}
