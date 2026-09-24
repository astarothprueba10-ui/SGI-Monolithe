package monolithe.auth_service.repository;

import monolithe.auth_service.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Integer> {

    Optional<Permission> findByCodigo(String codigo);

    List<Permission> findByModuloAndActivoTrue(String modulo);

    boolean existsByCodigo(String codigo);
}