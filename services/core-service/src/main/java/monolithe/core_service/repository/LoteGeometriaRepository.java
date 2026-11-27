package monolithe.core_service.repository;

import monolithe.core_service.entity.LoteGeometria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LoteGeometriaRepository
        extends JpaRepository<LoteGeometria, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"lote", "planoInteractivo", "proyecto"})
    List<LoteGeometria>
    findByPlanoInteractivo_IdPlanoInteractivoAndActivoTrueOrderByOrdenCapaAsc(
            Long idPlanoInteractivo
    );

    Optional<LoteGeometria>
    findByPlanoInteractivo_IdPlanoInteractivoAndLote_IdLote(
            Long idPlanoInteractivo,
            Long idLote
    );

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @org.springframework.data.jpa.repository.Query(value = """
        INSERT INTO public.inm_lotes_geometrias
          (id_proyecto,id_plano_interactivo,id_lote,puntos,etiqueta_x,etiqueta_y,
           rotacion_etiqueta,orden_capa,visible,interactivo,observaciones,activo)
        SELECT :proyecto,:plano,x."idLote",x.puntos,x."etiquetaX",x."etiquetaY",
               coalesce(x."rotacionEtiqueta",0),coalesce(x."ordenCapa",0),
               coalesce(x.visible,true),coalesce(x.interactivo,true),nullif(btrim(x.observaciones),''),true
        FROM jsonb_to_recordset(CAST(:datos AS jsonb)) AS x(
          "idLote" bigint,puntos jsonb,"etiquetaX" numeric,"etiquetaY" numeric,
          "rotacionEtiqueta" numeric,"ordenCapa" integer,visible boolean,interactivo boolean,observaciones text)
        ON CONFLICT (id_plano_interactivo,id_lote) DO UPDATE SET
          puntos=excluded.puntos,etiqueta_x=excluded.etiqueta_x,etiqueta_y=excluded.etiqueta_y,
          rotacion_etiqueta=excluded.rotacion_etiqueta,orden_capa=excluded.orden_capa,
          visible=excluded.visible,interactivo=excluded.interactivo,observaciones=excluded.observaciones,
          activo=true,fecha_actualizacion=now()
        """, nativeQuery = true)
    int guardarMatrizEnBloque(
        @org.springframework.data.repository.query.Param("proyecto") Long proyecto,
        @org.springframework.data.repository.query.Param("plano") Long plano,
        @org.springframework.data.repository.query.Param("datos") String datos);

    boolean existsByPlanoInteractivo_IdPlanoInteractivoAndLote_IdLote(
            Long idPlanoInteractivo,
            Long idLote
    );
}