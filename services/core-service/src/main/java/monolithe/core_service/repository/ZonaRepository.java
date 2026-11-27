package monolithe.core_service.repository;

import monolithe.core_service.entity.Zona;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ZonaRepository extends JpaRepository<Zona, Long> {

    boolean existsByProyecto_IdProyectoAndCodigo(
            Long idProyecto,
            String codigo);

    boolean existsByProyecto_IdProyectoAndCodigoAndIdZonaNot(
            Long idProyecto,
            String codigo,
            Long idZona);

    List<Zona> findByProyecto_IdProyectoOrderByNumeroOrdenAsc(
            Long idProyecto);

    List<Zona> findByProyecto_IdProyectoAndActivoTrueOrderByNumeroOrdenAsc(
            Long idProyecto);

    @org.springframework.data.jpa.repository.Query(value="""
        SELECT EXISTS(SELECT 1 FROM public.inm_manzanas_zonas mz JOIN public.inm_manzanas m USING(id_manzana)
          WHERE mz.id_zona=:zona AND m.activo)
        """,nativeQuery=true)
    boolean usadaPorManzanaActiva(@org.springframework.data.repository.query.Param("zona") Long zona);

    boolean existsByProyecto_IdProyectoAndActivoTrue(Long idProyecto);
}
