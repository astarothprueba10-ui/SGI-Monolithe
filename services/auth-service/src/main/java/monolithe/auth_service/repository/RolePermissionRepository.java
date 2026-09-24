package monolithe.auth_service.repository;

import monolithe.auth_service.entity.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRolIdRolAndActivoTrue(Integer idRol);
}