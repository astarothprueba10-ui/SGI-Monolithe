
package monolithe.core_service.repository;

import monolithe.core_service.entity.PersonaDireccion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PersonaDireccionRepository
        extends JpaRepository<PersonaDireccion, Long> {

    List<PersonaDireccion> findByPersona_IdPersonaAndActivoTrue(
            Long idPersona
    );

    Optional<PersonaDireccion>
    findFirstByPersona_IdPersonaAndPrincipalTrueAndActivoTrueOrderByIdPersonaDireccionAsc(
            Long idPersona
    );
}
