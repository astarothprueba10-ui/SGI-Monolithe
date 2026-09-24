package monolithe.auth_service.repository;

import monolithe.auth_service.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUsuarioIdUsuarioAndActivoTrue(Long idUsuario);
}