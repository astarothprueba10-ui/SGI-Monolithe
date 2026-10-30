package monolithe.cms_service.repository;

import monolithe.cms_service.entity.CmsBorradorImagen;
import monolithe.cms_service.entity.EstadoBorrador;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface CmsBorradorImagenRepository extends JpaRepository<CmsBorradorImagen, Long> {
    Optional<CmsBorradorImagen> findByIdBorradorAndIdSeccion(Long idBorrador, Long idSeccion);

    List<CmsBorradorImagen> findByIdBorradorOrderByIdSeccionAsc(Long idBorrador);

    /** Evita cerrar un borrador mientras aún tenga imágenes privadas sin publicar. */
    boolean existsByIdBorrador(Long idBorrador);

    /** Busca solo objetos privados ligados a borradores ya DESCARTADOS. */
    @Query("""
            SELECT i FROM CmsBorradorImagen i, CmsBorrador b
            WHERE i.idBorrador = b.idBorrador
              AND b.estado IN (:estado, :publicado)
              AND i.bucketId = :bucket
            ORDER BY i.idImagenBorrador
            """)
    List<CmsBorradorImagen> buscarPendientesDescartados(
            @Param("estado") EstadoBorrador estado,
            @Param("publicado") EstadoBorrador publicado,
            @Param("bucket") String bucket,
            Pageable limite);

    /** Quita la referencia solo si el borrador SIGUE descartado y la clave no cambio. */
    @Modifying
    @Transactional
    @Query(value = """
            DELETE FROM public.cms_borrador_imagenes i
            WHERE i.id_imagen_borrador = :id
              AND i.object_key = :clave
              AND i.bucket_id = 'cms-drafts-private'
              AND EXISTS (
                SELECT 1 FROM public.cms_borradores b
                WHERE b.id_borrador = i.id_borrador AND b.estado IN ('DESCARTADO', 'PUBLICADO')
              )
            """, nativeQuery = true)
    int eliminarReferenciaDescartada(@Param("id") Long id, @Param("clave") String clave);
}
