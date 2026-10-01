package monolithe.core_service.repository;

import monolithe.core_service.entity.TarifaZonaEtapa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TarifaZonaEtapaRepository extends JpaRepository<TarifaZonaEtapa, Long> {

    List<TarifaZonaEtapa> findByProyecto_IdProyectoOrderByFechaDesdeDesc(
            Long idProyecto
    );

    List<TarifaZonaEtapa> findByProyecto_IdProyectoAndActivoTrueOrderByFechaDesdeDesc(
            Long idProyecto
    );

    @Query("""
        SELECT t
        FROM TarifaZonaEtapa t
        WHERE t.proyecto.idProyecto = :idProyecto
          AND t.zona.idZona = :idZona
          AND t.etapaComercial.idEtapaComercial = :idEtapaComercial
          AND t.moneda.idMoneda = :idMoneda
          AND t.tipoTarifa.idTipoTarifa = :idTipoTarifa
          AND t.activo = true
          AND t.fechaHasta IS NULL
    """)
    Optional<TarifaZonaEtapa> buscarVigente(
            @Param("idProyecto") Long idProyecto,
            @Param("idZona") Long idZona,
            @Param("idEtapaComercial") Long idEtapaComercial,
            @Param("idMoneda") Integer idMoneda,
            @Param("idTipoTarifa") Integer idTipoTarifa
    );
}

