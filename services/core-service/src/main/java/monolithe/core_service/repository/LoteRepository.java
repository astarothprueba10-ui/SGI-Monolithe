package monolithe.core_service.repository;

import monolithe.core_service.entity.Lote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface LoteRepository extends
        JpaRepository<Lote, Long>,
        JpaSpecificationExecutor<Lote> {

    @org.springframework.data.jpa.repository.Query(value = """
        SELECT l.id_lote FROM public.inm_lotes l
        JOIN public.cfg_estados_lote e USING(id_estado_lote)
        JOIN public.inm_manzanas m USING(id_manzana)
        JOIN public.inm_etapas ef ON ef.id_etapa=m.id_etapa
        JOIN public.inm_proyectos pr ON pr.id_proyecto=l.id_proyecto
        WHERE l.id_proyecto=:proyecto AND l.activo AND m.activo AND ef.activo AND pr.activo
          AND e.codigo='DISPONIBLE' AND e.activo AND (
            NOT EXISTS(SELECT 1 FROM public.inm_politicas_comerciales_publicadas pu WHERE pu.id_proyecto=l.id_proyecto)
            OR EXISTS(SELECT 1 FROM public.inm_politicas_comerciales_lotes pl
              JOIN public.inm_lotes_precios p ON p.id_lote_precio=pl.id_lote_precio AND p.id_lote=l.id_lote
              JOIN public.cfg_monedas mo ON mo.id_moneda=p.id_moneda
              WHERE pl.id_proyecto=l.id_proyecto AND pl.id_lote=l.id_lote AND pl.situacion='HABILITADA'
                AND pl.version=(SELECT max(pu.version) FROM public.inm_politicas_comerciales_publicadas pu WHERE pu.id_proyecto=l.id_proyecto)
                AND (pl.vigente_hasta IS NULL OR pl.vigente_hasta >= (now() AT TIME ZONE 'America/Lima')::date)
                AND p.activo AND p.precio=pl.precio_final AND mo.codigo='PEN' AND mo.activo
                AND p.fecha_desde<=now() AND (p.fecha_hasta IS NULL OR p.fecha_hasta>now()))
          )
        """,nativeQuery=true)
    List<Long> listarComercializables(@org.springframework.data.repository.query.Param("proyecto") Long proyecto);

    boolean existsByCodigo(String codigo);

    boolean existsByCodigoAndIdLoteNot(
        String codigo,
        Long idLote
    );

    boolean existsByManzana_IdManzanaAndNumero(
        Long idManzana,
        String numero
    );

    boolean existsByManzana_IdManzanaAndNumeroAndIdLoteNot(
        Long idManzana,
        String numero,
        Long idLote
    );

    List<Lote> findByManzana_IdManzanaOrderByNumeroAsc(
        Long idManzana
    );

    List<Lote> findByManzana_IdManzanaAndActivoTrueOrderByNumeroAsc(
        Long idManzana
    );

    boolean existsByManzana_IdManzanaAndActivoTrue(Long idManzana);
    boolean existsByManzana_Etapa_IdEtapaAndActivoTrue(Long idEtapa);
    boolean existsByIdProyectoAndActivoTrue(Long idProyecto);
    boolean existsByZona_IdZonaAndActivoTrue(Long idZona);
    long countByZona_IdZonaAndActivoTrue(Long idZona);
}
