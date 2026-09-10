package monolithe.auth_service.repository;

import monolithe.auth_service.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

    Optional<Role> findByCodigo(String codigo);

    boolean existsByCodigo(String codigo);
}