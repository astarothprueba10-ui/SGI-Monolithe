package monolithe.core_service.repository;

import monolithe.core_service.entity.LoteGeometria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoteGeometriaRepository
        extends JpaRepository<LoteGeometria, Long> {

    List<LoteGeometria>
    findByPlanoInteractivo_IdPlanoInteractivoAndActivoTrueOrderByOrdenCapaAsc(
            Long idPlanoInteractivo
    );

    Optional<LoteGeometria>
    findByPlanoInteractivo_IdPlanoInteractivoAndLote_IdLote(
            Long idPlanoInteractivo,
            Long idLote
    );

    boolean existsByPlanoInteractivo_IdPlanoInteractivoAndLote_IdLote(
            Long idPlanoInteractivo,
            Long idLote
    );
}