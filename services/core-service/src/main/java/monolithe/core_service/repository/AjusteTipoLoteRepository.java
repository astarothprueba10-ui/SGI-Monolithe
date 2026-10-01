package monolithe.core_service.repository;

import monolithe.core_service.entity.AjusteTipoLote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AjusteTipoLoteRepository extends JpaRepository<AjusteTipoLote, Long> {

    List<AjusteTipoLote> findByProyecto_IdProyectoOrderByFechaDesdeDesc(
            Long idProyecto
    );

    List<AjusteTipoLote> findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(
            Long idProyecto
    );
}
