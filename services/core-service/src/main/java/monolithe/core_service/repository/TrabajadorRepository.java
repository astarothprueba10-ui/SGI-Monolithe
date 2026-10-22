
package monolithe.core_service.repository;

import monolithe.core_service.entity.Trabajador;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrabajadorRepository
        extends JpaRepository<Trabajador, Long> {

    List<Trabajador> findAllByOrderByIdTrabajadorDesc();

    Optional<Trabajador> findByPersona_IdPersona(
            Long idPersona
    );

    Optional<Trabajador> findByCodigoIgnoreCase(
            String codigo
    );

    boolean existsByPersona_IdPersona(
            Long idPersona
    );

    List<Trabajador>
    findByEstadoTrabajador_CodigoIgnoreCase(
            String codigoEstado
    );
}
