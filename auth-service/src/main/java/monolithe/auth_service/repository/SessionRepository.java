package monolithe.auth_service.repository;

import monolithe.auth_service.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long> {

    Optional<Session> findByRefreshTokenHashAndFechaRevocacionIsNull(
            String refreshTokenHash
    );

    List<Session> findByUsuarioIdUsuarioAndFechaRevocacionIsNull(
            Long idUsuario
    );
}