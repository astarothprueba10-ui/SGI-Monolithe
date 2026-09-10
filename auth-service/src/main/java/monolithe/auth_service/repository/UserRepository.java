package monolithe.auth_service.repository;

import monolithe.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsuarioLogin(String usuarioLogin);

    boolean existsByUsuarioLogin(String usuarioLogin);
}