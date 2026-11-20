package monolithe.auth_service.repository;

import monolithe.auth_service.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    /** Localiza la cuenta antes de bloquearla y vuelve a verificar la sesión después. */
    @Query("""
            SELECT s.usuario.idUsuario FROM Session s
            WHERE s.refreshTokenHash = :hash AND s.fechaRevocacion IS NULL
            """)
    Optional<Long> findUserIdByActiveRefreshHash(@Param("hash") String hash);

    Optional<Session> findByRefreshTokenHashAndFechaRevocacionIsNull(
            String refreshTokenHash
    );

    List<Session> findByUsuarioIdUsuarioAndFechaRevocacionIsNull(
            Long idUsuario
    );
}
