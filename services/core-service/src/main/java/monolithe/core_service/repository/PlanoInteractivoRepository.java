package monolithe.core_service.repository;

import monolithe.core_service.entity.PlanoInteractivo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanoInteractivoRepository
        extends JpaRepository<PlanoInteractivo, Long> {

    boolean existsByCodigo(String codigo);

    List<PlanoInteractivo> findByProyecto_IdProyectoOrderByNumeroVersionDesc(
            Long idProyecto
    );

    Optional<PlanoInteractivo>
    findFirstByProyecto_IdProyectoAndEtapaIsNullAndVigenteTrue(
            Long idProyecto
    );

    Optional<PlanoInteractivo>
    findFirstByProyecto_IdProyectoAndEtapa_IdEtapaAndVigenteTrue(
            Long idProyecto,
            Long idEtapa
    );

    Optional<PlanoInteractivo>
    findFirstByProyecto_IdProyectoAndEtapaIsNullOrderByNumeroVersionDesc(
            Long idProyecto
    );

    Optional<PlanoInteractivo>
    findFirstByProyecto_IdProyectoAndEtapa_IdEtapaOrderByNumeroVersionDesc(
            Long idProyecto,
            Long idEtapa
    );
}