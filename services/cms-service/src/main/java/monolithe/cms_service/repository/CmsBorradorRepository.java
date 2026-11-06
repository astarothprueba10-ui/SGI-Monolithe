package monolithe.cms_service.repository;

import monolithe.cms_service.entity.CmsBorrador;
import monolithe.cms_service.entity.EstadoBorrador;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CmsBorradorRepository extends JpaRepository<CmsBorrador, Long> {

    List<CmsBorrador> findByIdGrupoEdicionOrderByIdBorradorAsc(UUID idGrupoEdicion);

    Optional<CmsBorrador> findByIdBorradorAndIdUsuarioRegistro(Long idBorrador, Long idUsuarioRegistro);

    /** Serializa cambios concurrentes sobre un mismo borrador. Requiere @Transactional. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM CmsBorrador b WHERE b.idBorrador = :idBorrador "
            + "AND b.idUsuarioRegistro = :idUsuarioRegistro")
    Optional<CmsBorrador> findWithLockByIdBorradorAndIdUsuarioRegistro(
            @Param("idBorrador") Long idBorrador,
            @Param("idUsuarioRegistro") Long idUsuarioRegistro);


    List<CmsBorrador> findByIdUsuarioRegistroAndEstadoOrderByFechaActualizacionDesc(
            Long idUsuarioRegistro, EstadoBorrador estado);
}
