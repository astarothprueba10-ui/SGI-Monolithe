package monolithe.auth_service.repository;

import monolithe.auth_service.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.query.Procedure;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsuarioLogin(String usuarioLogin);

    boolean existsByUsuarioLogin(String usuarioLogin);

    @Query("SELECT u.versionSesiones FROM User u WHERE u.idUsuario = :idUsuario")
    Optional<Long> findVersionSesionesByIdUsuario(@Param("idUsuario") Long idUsuario);

    @Procedure(procedureName = "sp_registrar_acceso_exitoso")
    void registrarAccesoExitoso(
            @Param("p_id_usuario") Long idUsuario);
}