package monolithe.core_service.repository;

import monolithe.core_service.entity.TarifaZonaEtapa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TarifaZonaEtapaRepository extends JpaRepository<TarifaZonaEtapa, Long> {

    List<TarifaZonaEtapa> findByProyecto_IdProyectoOrderByFechaDesdeDesc(
            Long idProyecto
    );

    List<TarifaZonaEtapa> findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(
            Long idProyecto
    );
}
