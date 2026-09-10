package monolithe.auth_service.repository;

import monolithe.auth_service.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository
        extends JpaRepository<PasswordResetToken, Long> {

    Optional<PasswordResetToken>
    findByTokenHashAndFechaUsoIsNull(
            String tokenHash
    );

    List<PasswordResetToken>
    findByUsuarioIdUsuarioAndFechaUsoIsNull(
            Long idUsuario
    );
}